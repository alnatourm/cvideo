import { and, asc, eq, exists, gt, gte, ilike, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import {
  candidateCertificates,
  candidateEducation,
  candidateExperiences,
  candidateLanguages,
  candidatePreferredRoles,
  candidateProfiles,
  candidateSkills,
  candidateVideos,
} from '../db/schema.js';
import { candidateDiscoverySettings } from './schema.js';
import type {
  CandidateDiscoveryReadiness,
  DiscoveryRepository,
  RecruiterCandidateDetail,
  RecruiterSearchFilters,
  RecruiterSearchPage,
} from './repository.js';

export class DrizzleDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly db: Database) {}

  private async candidateIdForUser(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    return row?.id ?? null;
  }

  async getReadinessByUserId(userId: string): Promise<CandidateDiscoveryReadiness | null> {
    const [profile] = await this.db
      .select({
        id: candidateProfiles.id,
        primaryCategoryId: candidateProfiles.primaryCategoryId,
        primarySubcategoryId: candidateProfiles.primarySubcategoryId,
      })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    if (!profile) return null;

    const [video, preferredRole, skill] = await Promise.all([
      this.db
        .select({ id: candidateVideos.id })
        .from(candidateVideos)
        .where(and(eq(candidateVideos.candidateId, profile.id), eq(candidateVideos.status, 'ready')))
        .limit(1),
      this.db
        .select({ id: candidatePreferredRoles.jobTitleId })
        .from(candidatePreferredRoles)
        .where(eq(candidatePreferredRoles.candidateId, profile.id))
        .limit(1),
      this.db
        .select({ id: candidateSkills.skillId })
        .from(candidateSkills)
        .where(eq(candidateSkills.candidateId, profile.id))
        .limit(1),
    ]);

    return {
      candidateId: profile.id,
      hasReadyVideo: Boolean(video[0]),
      hasCategory: Boolean(profile.primaryCategoryId && profile.primarySubcategoryId),
      hasPreferredRole: Boolean(preferredRole[0]),
      hasSkill: Boolean(skill[0]),
    };
  }

  async getVisibilityByUserId(userId: string): Promise<boolean | null> {
    const candidateId = await this.candidateIdForUser(userId);
    if (!candidateId) return null;
    const [row] = await this.db
      .select({ discoverable: candidateDiscoverySettings.discoverable })
      .from(candidateDiscoverySettings)
      .where(eq(candidateDiscoverySettings.candidateId, candidateId))
      .limit(1);
    return row?.discoverable ?? false;
  }

  async setVisibilityByUserId(userId: string, discoverable: boolean): Promise<boolean | null> {
    const candidateId = await this.candidateIdForUser(userId);
    if (!candidateId) return null;

    const [row] = await this.db
      .insert(candidateDiscoverySettings)
      .values({ candidateId, discoverable, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: candidateDiscoverySettings.candidateId,
        set: { discoverable, updatedAt: new Date() },
      })
      .returning({ discoverable: candidateDiscoverySettings.discoverable });

    return row?.discoverable ?? null;
  }

  async searchCandidates(filters: RecruiterSearchFilters): Promise<RecruiterSearchPage> {
    const conditions: SQL[] = [
      eq(candidateDiscoverySettings.discoverable, true),
      eq(candidateVideos.status, 'ready'),
    ];

    if (filters.countryCode) conditions.push(eq(candidateProfiles.countryCode, filters.countryCode));
    if (filters.city) conditions.push(ilike(candidateProfiles.city, `%${filters.city}%`));
    if (filters.categoryId) conditions.push(eq(candidateProfiles.primaryCategoryId, filters.categoryId));
    if (filters.subcategoryId) conditions.push(eq(candidateProfiles.primarySubcategoryId, filters.subcategoryId));
    if (filters.minExperienceYears !== undefined) {
      conditions.push(gte(candidateProfiles.yearsExperience, filters.minExperienceYears));
    }
    if (filters.cursor) conditions.push(gt(candidateProfiles.id, filters.cursor));

    if (filters.preferredRoleId) {
      conditions.push(
        exists(
          this.db
            .select({ value: sql`1` })
            .from(candidatePreferredRoles)
            .where(
              and(
                eq(candidatePreferredRoles.candidateId, candidateProfiles.id),
                eq(candidatePreferredRoles.jobTitleId, filters.preferredRoleId),
              ),
            ),
        ),
      );
    }

    if (filters.skillId) {
      conditions.push(
        exists(
          this.db
            .select({ value: sql`1` })
            .from(candidateSkills)
            .where(
              and(eq(candidateSkills.candidateId, candidateProfiles.id), eq(candidateSkills.skillId, filters.skillId)),
            ),
        ),
      );
    }

    if (filters.languageId) {
      conditions.push(
        exists(
          this.db
            .select({ value: sql`1` })
            .from(candidateLanguages)
            .where(
              and(
                eq(candidateLanguages.candidateId, candidateProfiles.id),
                eq(candidateLanguages.languageId, filters.languageId),
              ),
            ),
        ),
      );
    }

    const rows = await this.db
      .select({
        id: candidateProfiles.id,
        displayName: candidateProfiles.displayName,
        headline: candidateProfiles.headline,
        countryCode: candidateProfiles.countryCode,
        city: candidateProfiles.city,
        yearsExperience: candidateProfiles.yearsExperience,
        primaryCategoryId: candidateProfiles.primaryCategoryId,
        primarySubcategoryId: candidateProfiles.primarySubcategoryId,
        introductionVideoId: candidateVideos.id,
      })
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(and(...conditions))
      .orderBy(asc(candidateProfiles.id))
      .limit(filters.pageSize + 1);

    const hasMore = rows.length > filters.pageSize;
    const items = rows.slice(0, filters.pageSize);
    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }

  async getCandidateDetail(candidateId: string): Promise<RecruiterCandidateDetail | null> {
    const [profile] = await this.db
      .select({
        id: candidateProfiles.id,
        displayName: candidateProfiles.displayName,
        headline: candidateProfiles.headline,
        countryCode: candidateProfiles.countryCode,
        city: candidateProfiles.city,
        yearsExperience: candidateProfiles.yearsExperience,
        primaryCategoryId: candidateProfiles.primaryCategoryId,
        primarySubcategoryId: candidateProfiles.primarySubcategoryId,
        professionalSummary: candidateProfiles.professionalSummary,
        introductionVideoId: candidateVideos.id,
      })
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(
        and(
          eq(candidateProfiles.id, candidateId),
          eq(candidateDiscoverySettings.discoverable, true),
          eq(candidateVideos.status, 'ready'),
        ),
      )
      .limit(1);

    if (!profile) return null;

    const [preferredRoles, skills, languages, certificates, experience, education] = await Promise.all([
      this.db
        .select({ id: candidatePreferredRoles.jobTitleId })
        .from(candidatePreferredRoles)
        .where(eq(candidatePreferredRoles.candidateId, candidateId))
        .orderBy(asc(candidatePreferredRoles.position)),
      this.db
        .select({ id: candidateSkills.skillId })
        .from(candidateSkills)
        .where(eq(candidateSkills.candidateId, candidateId)),
      this.db
        .select({ id: candidateLanguages.languageId })
        .from(candidateLanguages)
        .where(eq(candidateLanguages.candidateId, candidateId)),
      this.db
        .select({
          id: candidateCertificates.id,
          name: candidateCertificates.name,
          issuingOrganization: candidateCertificates.issuingOrganization,
          issueDate: candidateCertificates.issueDate,
          expiryDate: candidateCertificates.expiryDate,
          credentialUrl: candidateCertificates.credentialUrl,
        })
        .from(candidateCertificates)
        .where(eq(candidateCertificates.candidateId, candidateId)),
      this.db
        .select({
          id: candidateExperiences.id,
          companyName: candidateExperiences.companyName,
          jobTitle: candidateExperiences.jobTitle,
          location: candidateExperiences.location,
          startDate: candidateExperiences.startDate,
          endDate: candidateExperiences.endDate,
          isCurrent: candidateExperiences.isCurrent,
          description: candidateExperiences.description,
        })
        .from(candidateExperiences)
        .where(eq(candidateExperiences.candidateId, candidateId)),
      this.db
        .select({
          id: candidateEducation.id,
          institution: candidateEducation.institution,
          qualification: candidateEducation.qualification,
          fieldOfStudy: candidateEducation.fieldOfStudy,
          startDate: candidateEducation.startDate,
          endDate: candidateEducation.endDate,
          description: candidateEducation.description,
        })
        .from(candidateEducation)
        .where(eq(candidateEducation.candidateId, candidateId)),
    ]);

    return {
      ...profile,
      preferredRoleIds: preferredRoles.map((row) => row.id),
      skillIds: skills.map((row) => row.id),
      languageIds: languages.map((row) => row.id),
      certificates,
      experience,
      education,
    };
  }
}
