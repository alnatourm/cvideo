import { asc, desc, eq, and } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import {
  candidateCertificates,
  candidateEducation,
  candidateExperiences,
  candidateExtraSubfields,
  candidateLanguages,
  candidatePreferredRoles,
  candidateProfiles,
  candidateSkills,
  candidateVideos,
} from '../db/schema.js';
import type {
  CandidateCertificateInput,
  CandidateCertificateRecord,
  CandidateEducationInput,
  CandidateEducationRecord,
  CandidateExperienceInput,
  CandidateExperienceRecord,
  CandidateOwnProfile,
  CandidateProfileUpdate,
  CandidateRepository,
} from './repository.js';

function mapExperience(row: typeof candidateExperiences.$inferSelect): CandidateExperienceRecord {
  return {
    id: row.id,
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    description: row.description,
  };
}

function mapEducation(row: typeof candidateEducation.$inferSelect): CandidateEducationRecord {
  return {
    id: row.id,
    institution: row.institution,
    qualification: row.qualification,
    fieldOfStudy: row.fieldOfStudy,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
  };
}

function mapCertificate(row: typeof candidateCertificates.$inferSelect): CandidateCertificateRecord {
  return {
    id: row.id,
    name: row.name,
    issuingOrganization: row.issuingOrganization,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    credentialId: row.credentialId,
    credentialUrl: row.credentialUrl,
  };
}

export class DrizzleCandidateRepository implements CandidateRepository {
  constructor(private readonly db: Database) {}

  private async profileId(userId: string): Promise<string | null> {
    const [profile] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    return profile?.id ?? null;
  }

  async getOwnProfile(userId: string): Promise<CandidateOwnProfile | null> {
    const [profile] = await this.db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    if (!profile) return null;

    const [extraRows, roleRows, skillRows, languageRows, experienceRows, educationRows, certificateRows, videoRows] =
      await Promise.all([
        this.db
          .select({ id: candidateExtraSubfields.subcategoryId })
          .from(candidateExtraSubfields)
          .where(eq(candidateExtraSubfields.candidateId, profile.id))
          .orderBy(asc(candidateExtraSubfields.position)),
        this.db
          .select({ id: candidatePreferredRoles.jobTitleId })
          .from(candidatePreferredRoles)
          .where(eq(candidatePreferredRoles.candidateId, profile.id))
          .orderBy(asc(candidatePreferredRoles.position)),
        this.db
          .select({ id: candidateSkills.skillId })
          .from(candidateSkills)
          .where(eq(candidateSkills.candidateId, profile.id)),
        this.db
          .select({ id: candidateLanguages.languageId })
          .from(candidateLanguages)
          .where(eq(candidateLanguages.candidateId, profile.id)),
        this.db
          .select()
          .from(candidateExperiences)
          .where(eq(candidateExperiences.candidateId, profile.id))
          .orderBy(desc(candidateExperiences.startDate)),
        this.db
          .select()
          .from(candidateEducation)
          .where(eq(candidateEducation.candidateId, profile.id))
          .orderBy(desc(candidateEducation.endDate)),
        this.db
          .select()
          .from(candidateCertificates)
          .where(eq(candidateCertificates.candidateId, profile.id))
          .orderBy(desc(candidateCertificates.issueDate)),
        this.db
          .select()
          .from(candidateVideos)
          .where(eq(candidateVideos.candidateId, profile.id))
          .limit(1),
      ]);

    const video = videoRows[0];
    return {
      id: profile.id,
      displayName: profile.displayName,
      headline: profile.headline,
      profilePhotoUrl: profile.profilePhotoUrl,
      countryCode: profile.countryCode,
      city: profile.city,
      primaryCategoryId: profile.primaryCategoryId,
      primarySubcategoryId: profile.primarySubcategoryId,
      yearsExperience: profile.yearsExperience,
      professionalSummary: profile.professionalSummary,
      cvOriginalFilename: profile.cvOriginalFilename,
      extraSubfieldIds: extraRows.map((row) => row.id),
      preferredRoleIds: roleRows.map((row) => row.id),
      skillIds: skillRows.map((row) => row.id),
      languageIds: languageRows.map((row) => row.id),
      experience: experienceRows.map(mapExperience),
      education: educationRows.map(mapEducation),
      certificates: certificateRows.map(mapCertificate),
      video: video
        ? {
            id: video.id,
            status: video.status,
            durationSeconds: video.durationSeconds,
            height: video.height,
            mimeType: video.mimeType,
          }
        : null,
    };
  }

  async updateOwnProfile(userId: string, input: CandidateProfileUpdate): Promise<CandidateOwnProfile | null> {
    const candidateId = await this.db.transaction(async (tx) => {
      const [profile] = await tx
        .update(candidateProfiles)
        .set({
          displayName: input.displayName,
          headline: input.headline ?? null,
          countryCode: input.countryCode,
          city: input.city,
          primaryCategoryId: input.primaryCategoryId ?? null,
          primarySubcategoryId: input.primarySubcategoryId ?? null,
          yearsExperience: input.yearsExperience,
          professionalSummary: input.professionalSummary ?? null,
          updatedAt: new Date(),
        })
        .where(eq(candidateProfiles.userId, userId))
        .returning({ id: candidateProfiles.id });

      if (!profile) return null;

      await Promise.all([
        tx.delete(candidateExtraSubfields).where(eq(candidateExtraSubfields.candidateId, profile.id)),
        tx.delete(candidatePreferredRoles).where(eq(candidatePreferredRoles.candidateId, profile.id)),
        tx.delete(candidateSkills).where(eq(candidateSkills.candidateId, profile.id)),
        tx.delete(candidateLanguages).where(eq(candidateLanguages.candidateId, profile.id)),
      ]);

      if (input.extraSubfieldIds.length) {
        await tx.insert(candidateExtraSubfields).values(
          input.extraSubfieldIds.map((subcategoryId, position) => ({ candidateId: profile.id, subcategoryId, position })),
        );
      }
      if (input.preferredRoleIds.length) {
        await tx.insert(candidatePreferredRoles).values(
          input.preferredRoleIds.map((jobTitleId, position) => ({ candidateId: profile.id, jobTitleId, position })),
        );
      }
      if (input.skillIds.length) {
        await tx.insert(candidateSkills).values(input.skillIds.map((skillId) => ({ candidateId: profile.id, skillId })));
      }
      if (input.languageIds.length) {
        await tx.insert(candidateLanguages).values(
          input.languageIds.map((languageId) => ({ candidateId: profile.id, languageId })),
        );
      }
      return profile.id;
    });

    return candidateId ? this.getOwnProfile(userId) : null;
  }

  async listExperience(userId: string): Promise<CandidateExperienceRecord[]> {
    const id = await this.profileId(userId);
    if (!id) return [];
    const rows = await this.db
      .select()
      .from(candidateExperiences)
      .where(eq(candidateExperiences.candidateId, id))
      .orderBy(desc(candidateExperiences.startDate));
    return rows.map(mapExperience);
  }

  async createExperience(userId: string, input: CandidateExperienceInput): Promise<CandidateExperienceRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db.insert(candidateExperiences).values({ candidateId, ...input }).returning();
    return row ? mapExperience(row) : null;
  }

  async updateExperience(userId: string, id: string, input: CandidateExperienceInput): Promise<CandidateExperienceRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db
      .update(candidateExperiences)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(candidateExperiences.id, id), eq(candidateExperiences.candidateId, candidateId)))
      .returning();
    return row ? mapExperience(row) : null;
  }

  async deleteExperience(userId: string, id: string): Promise<boolean> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return false;
    const rows = await this.db
      .delete(candidateExperiences)
      .where(and(eq(candidateExperiences.id, id), eq(candidateExperiences.candidateId, candidateId)))
      .returning({ id: candidateExperiences.id });
    return rows.length > 0;
  }

  async listEducation(userId: string): Promise<CandidateEducationRecord[]> {
    const id = await this.profileId(userId);
    if (!id) return [];
    const rows = await this.db
      .select()
      .from(candidateEducation)
      .where(eq(candidateEducation.candidateId, id))
      .orderBy(desc(candidateEducation.endDate));
    return rows.map(mapEducation);
  }

  async createEducation(userId: string, input: CandidateEducationInput): Promise<CandidateEducationRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db.insert(candidateEducation).values({ candidateId, ...input }).returning();
    return row ? mapEducation(row) : null;
  }

  async updateEducation(userId: string, id: string, input: CandidateEducationInput): Promise<CandidateEducationRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db
      .update(candidateEducation)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(candidateEducation.id, id), eq(candidateEducation.candidateId, candidateId)))
      .returning();
    return row ? mapEducation(row) : null;
  }

  async deleteEducation(userId: string, id: string): Promise<boolean> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return false;
    const rows = await this.db
      .delete(candidateEducation)
      .where(and(eq(candidateEducation.id, id), eq(candidateEducation.candidateId, candidateId)))
      .returning({ id: candidateEducation.id });
    return rows.length > 0;
  }

  async listCertificates(userId: string): Promise<CandidateCertificateRecord[]> {
    const id = await this.profileId(userId);
    if (!id) return [];
    const rows = await this.db
      .select()
      .from(candidateCertificates)
      .where(eq(candidateCertificates.candidateId, id))
      .orderBy(desc(candidateCertificates.issueDate));
    return rows.map(mapCertificate);
  }

  async createCertificate(userId: string, input: CandidateCertificateInput): Promise<CandidateCertificateRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db.insert(candidateCertificates).values({ candidateId, ...input }).returning();
    return row ? mapCertificate(row) : null;
  }

  async updateCertificate(userId: string, id: string, input: CandidateCertificateInput): Promise<CandidateCertificateRecord | null> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return null;
    const [row] = await this.db
      .update(candidateCertificates)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(candidateCertificates.id, id), eq(candidateCertificates.candidateId, candidateId)))
      .returning();
    return row ? mapCertificate(row) : null;
  }

  async deleteCertificate(userId: string, id: string): Promise<boolean> {
    const candidateId = await this.profileId(userId);
    if (!candidateId) return false;
    const rows = await this.db
      .delete(candidateCertificates)
      .where(and(eq(candidateCertificates.id, id), eq(candidateCertificates.candidateId, candidateId)))
      .returning({ id: candidateCertificates.id });
    return rows.length > 0;
  }
}
