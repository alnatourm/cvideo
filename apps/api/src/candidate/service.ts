import {
  candidateCertificateInputSchema,
  candidateEducationInputSchema,
  candidateExperienceInputSchema,
  candidateProfileInputSchema,
} from '@cvideo/validation';
import { CandidateError } from './errors.js';
import type { CandidateRepository } from './repository.js';

export class CandidateService {
  constructor(private readonly repository: CandidateRepository) {}

  async getOwnProfile(userId: string) {
    const profile = await this.repository.getOwnProfile(userId);
    if (!profile) throw new CandidateError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return profile;
  }

  async updateOwnProfile(userId: string, input: unknown) {
    const value = candidateProfileInputSchema.parse(input);
    const profile = await this.repository.updateOwnProfile(userId, value);
    if (!profile) throw new CandidateError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return profile;
  }

  async profileCompleteness(userId: string) {
    const profile = await this.getOwnProfile(userId);
    const checks = [
      Boolean(profile.displayName),
      Boolean(profile.headline),
      Boolean(profile.countryCode && profile.city),
      Boolean(profile.primaryCategoryId && profile.primarySubcategoryId),
      profile.preferredRoleIds.length > 0,
      profile.skillIds.length > 0,
      profile.experience.length > 0,
      Boolean(profile.professionalSummary),
      profile.video?.status === 'ready',
    ];
    const completed = checks.filter(Boolean).length;
    return {
      completed,
      total: checks.length,
      percent: Math.round((completed / checks.length) * 100),
    };
  }

  async listExperience(userId: string) {
    return this.repository.listExperience(userId);
  }

  async createExperience(userId: string, input: unknown) {
    const value = candidateExperienceInputSchema.parse(input);
    const record = await this.repository.createExperience(userId, value);
    if (!record) throw new CandidateError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return record;
  }

  async updateExperience(userId: string, id: string, input: unknown) {
    const value = candidateExperienceInputSchema.parse(input);
    const record = await this.repository.updateExperience(userId, id, value);
    if (!record) throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Experience record not found');
    return record;
  }

  async deleteExperience(userId: string, id: string) {
    if (!(await this.repository.deleteExperience(userId, id))) {
      throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Experience record not found');
    }
  }

  async listEducation(userId: string) {
    return this.repository.listEducation(userId);
  }

  async createEducation(userId: string, input: unknown) {
    const value = candidateEducationInputSchema.parse(input);
    const record = await this.repository.createEducation(userId, value);
    if (!record) throw new CandidateError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return record;
  }

  async updateEducation(userId: string, id: string, input: unknown) {
    const value = candidateEducationInputSchema.parse(input);
    const record = await this.repository.updateEducation(userId, id, value);
    if (!record) throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Education record not found');
    return record;
  }

  async deleteEducation(userId: string, id: string) {
    if (!(await this.repository.deleteEducation(userId, id))) {
      throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Education record not found');
    }
  }

  async listCertificates(userId: string) {
    return this.repository.listCertificates(userId);
  }

  async createCertificate(userId: string, input: unknown) {
    const value = candidateCertificateInputSchema.parse(input);
    const record = await this.repository.createCertificate(userId, value);
    if (!record) throw new CandidateError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return record;
  }

  async updateCertificate(userId: string, id: string, input: unknown) {
    const value = candidateCertificateInputSchema.parse(input);
    const record = await this.repository.updateCertificate(userId, id, value);
    if (!record) throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Certificate record not found');
    return record;
  }

  async deleteCertificate(userId: string, id: string) {
    if (!(await this.repository.deleteCertificate(userId, id))) {
      throw new CandidateError('RESOURCE_NOT_FOUND', 404, 'Certificate record not found');
    }
  }
}
