import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

export type EffectiveRole = 'super_admin' | 'company_owner' | 'company_admin' | 'recruiter' | 'candidate';
export type Locale = 'en' | 'ar';

export interface Principal {
  userId: string;
  email: string;
  kind: 'candidate' | 'company_member' | 'super_admin';
  effectiveRole: EffectiveRole;
  companyId: string | null;
  companyMemberId: string | null;
  sessionId: string;
  clientType: 'web' | 'mobile';
}

export interface CandidateVideo {
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';
  playbackUrl?: string | null;
  thumbnailUrl?: string | null;
  originalFilename?: string | null;
  durationSeconds?: number | null;
  height?: number | null;
  failureReason?: string | null;
}

export interface CandidateExperience {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

export interface CandidateCertificate {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export type CandidateExperienceInput = Omit<CandidateExperience, 'id'>;
export type CandidateEducationInput = Omit<CandidateEducation, 'id'>;
export type CandidateCertificateInput = Omit<CandidateCertificate, 'id'>;

export interface CandidateProfile {
  id: string;
  displayName: string;
  headline: string | null;
  profilePhotoUrl: string | null;
  countryCode: string;
  city: string;
  primaryCategoryId: string | null;
  primarySubcategoryId: string | null;
  yearsExperience: number;
  professionalSummary: string | null;
  cvOriginalFilename: string | null;
  extraSubfieldIds: string[];
  preferredRoleIds: string[];
  skillIds: string[];
  languageIds: string[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  certificates: CandidateCertificate[];
  video: CandidateVideo | null;
}

export interface CandidateSearchItem {
  id: string;
  displayName: string;
  headline: string | null;
  countryCode: string;
  city: string;
  yearsExperience: number;
  primaryCategoryId: string | null;
  primarySubcategoryId: string | null;
  introductionVideoId: string;
  introductionVideoUrl: string | null;
  introductionVideoThumbnailUrl: string | null;
}

export interface CandidateDetail extends CandidateSearchItem {
  professionalSummary: string | null;
  cvOriginalFilename: string | null;
  preferredRoleIds: string[];
  skillIds: string[];
  languageIds: string[];
  certificates: Array<Record<string, unknown>>;
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
}

export interface SavedList {
  id: string;
  name: string;
  description: string | null;
  candidateCount: number;
  candidateIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  companyId: string;
  candidateId: string;
  createdByUserId: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  existing?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  companyId: string;
  candidateId: string;
  requestedByUserId: string;
  opportunityTitle: string;
  startsAtUtc: string;
  timezone: string;
  durationMinutes: number;
  meetingType: 'google_meet' | 'video_call' | 'in_person';
  message: string | null;
  location: string | null;
  status: 'pending' | 'accepted' | 'suggested_time' | 'declined' | 'cancelled';
  suggestedStartsAtUtc?: string | null;
  suggestedTimezone?: string | null;
  meetingJoinUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface CompanyVerificationStatus {
  id: string;
  companyId: string;
  companyName: string;
  countryCode: string;
  city: string;
  commercialRegistrationNumber: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  operationalStatus: 'active' | 'suspended';
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const TOKEN_KEY = 'cvideo_mobile_session';
let cachedToken: string | null | undefined;

function apiBase() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!value) throw new ApiError(0, 'API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_BASE_URL is not configured');
  return value;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getSessionToken() {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

async function setSessionToken(token: string) {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSessionToken() {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (authenticated) {
    const token = await getSessionToken();
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    headers.set('authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the CVIDEO API');
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    if (response.status === 401) await clearSessionToken().catch(() => undefined);
    throw new ApiError(response.status, payload.error?.code ?? 'REQUEST_FAILED', payload.error?.message ?? 'Request failed');
  }
  return payload.data as T;
}

const json = (value: unknown) => JSON.stringify(value);

export const api = {
  async login(email: string, password: string) {
    const result = await request<{ principal: Principal; sessionToken: string; expiresAt: string }>(
      '/api/v1/auth/login',
      { method: 'POST', body: json({ email, password, clientType: 'mobile' }) },
      false,
    );
    await setSessionToken(result.sessionToken);
    return result.principal;
  },
  me: () => request<{ principal: Principal }>('/api/v1/auth/me'),
  async logout() {
    try {
      if (await getSessionToken()) await request<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      await clearSessionToken();
    }
  },
  registerCandidate: (input: { email: string; password: string; displayName: string; countryCode: string; city: string }) =>
    request<unknown>('/api/v1/auth/register/candidate', { method: 'POST', body: json(input) }, false),
  registerCompany: (input: { email: string; password: string; companyName: string; countryCode: string; city: string; commercialRegistrationNumber: string }) =>
    request<unknown>('/api/v1/auth/register/company', { method: 'POST', body: json(input) }, false),
  companyVerification: () => request<CompanyVerificationStatus>('/api/v1/companies/me/verification'),

  candidateProfile: () => request<CandidateProfile>('/api/v1/candidate/profile'),
  updateCandidateProfile: (input: unknown) => request<CandidateProfile>('/api/v1/candidate/profile', { method: 'PUT', body: json(input) }),
  createExperience: (input: CandidateExperienceInput) => request<CandidateExperience>('/api/v1/candidate/experience', { method: 'POST', body: json(input) }),
  updateExperience: (id: string, input: CandidateExperienceInput) => request<CandidateExperience>(`/api/v1/candidate/experience/${encodeURIComponent(id)}`, { method: 'PUT', body: json(input) }),
  deleteExperience: (id: string) => request<void>(`/api/v1/candidate/experience/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createEducation: (input: CandidateEducationInput) => request<CandidateEducation>('/api/v1/candidate/education', { method: 'POST', body: json(input) }),
  updateEducation: (id: string, input: CandidateEducationInput) => request<CandidateEducation>(`/api/v1/candidate/education/${encodeURIComponent(id)}`, { method: 'PUT', body: json(input) }),
  deleteEducation: (id: string) => request<void>(`/api/v1/candidate/education/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createCertificate: (input: CandidateCertificateInput) => request<CandidateCertificate>('/api/v1/candidate/certificates', { method: 'POST', body: json(input) }),
  updateCertificate: (id: string, input: CandidateCertificateInput) => request<CandidateCertificate>(`/api/v1/candidate/certificates/${encodeURIComponent(id)}`, { method: 'PUT', body: json(input) }),
  deleteCertificate: (id: string) => request<void>(`/api/v1/candidate/certificates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  completeness: () => request<{ completed: number; total: number; percent: number }>('/api/v1/candidate/profile/completeness'),
  visibility: () => request<{ discoverable: boolean }>('/api/v1/candidate/visibility'),
  setVisibility: (discoverable: boolean) => request<{ discoverable: boolean }>('/api/v1/candidate/visibility', { method: 'PUT', body: json({ discoverable }) }),
  candidateVideo: () => request<CandidateVideo | null>('/api/v1/candidate/video'),
  startCandidateVideo: (input: { filename: string; mimeType: string; sizeBytes: number; durationSeconds: number; height: number }) =>
    request<CandidateVideo & { uploadPath: string; maxBytes: number }>('/api/v1/candidate/video/start', { method: 'POST', body: json(input) }),
  async uploadCandidateVideo(uri: string, mimeType: string, sizeBytes: number) {
    const token = await getSessionToken();
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    const response = await expoFetch(`${apiBase()}/api/v1/candidate/video/content`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': mimeType,
        'content-length': String(sizeBytes),
      },
      body: new File(uri),
    });
    const payload = (await response.json().catch(() => ({}))) as { data?: CandidateVideo; error?: { code?: string; message?: string } };
    if (!response.ok || !payload.data) {
      if (response.status === 401) await clearSessionToken().catch(() => undefined);
      throw new ApiError(response.status, payload.error?.code ?? 'UPLOAD_FAILED', payload.error?.message ?? 'Video upload failed');
    }
    return payload.data;
  },
  syncCandidateVideo: () => request<CandidateVideo>('/api/v1/candidate/video/sync', { method: 'POST' }),
  deleteCandidateVideo: () => request<void>('/api/v1/candidate/video', { method: 'DELETE' }),
  async uploadCandidateCv(uri: string, filename: string, sizeBytes: number) {
    const token = await getSessionToken();
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    const response = await expoFetch(`${apiBase()}/api/v1/candidate/cv/content`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/pdf',
        'content-length': String(sizeBytes),
        'x-file-name': encodeURIComponent(filename),
      },
      body: new File(uri),
    });
    const payload = (await response.json().catch(() => ({}))) as { data?: { filename: string }; error?: { code?: string; message?: string } };
    if (!response.ok || !payload.data) {
      if (response.status === 401) await clearSessionToken().catch(() => undefined);
      throw new ApiError(response.status, payload.error?.code ?? 'UPLOAD_FAILED', payload.error?.message ?? 'CV upload failed');
    }
    return payload.data;
  },
  deleteCandidateCv: () => request<void>('/api/v1/candidate/cv', { method: 'DELETE' }),
  candidateInterviews: () => request<Interview[]>('/api/v1/interviews'),
  acceptInterview: (id: string) => request<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
  declineInterview: (id: string, message?: string) => request<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/decline`, { method: 'POST', body: json({ message }) }),
  suggestInterviewTime: (id: string, startsAtUtc: string, timezone: string, message?: string) =>
    request<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/suggest-time`, { method: 'POST', body: json({ startsAtUtc, timezone, message }) }),

  searchCandidates: (params: URLSearchParams) => request<{ items: CandidateSearchItem[]; nextCursor: string | null }>(`/api/v1/search/candidates?${params.toString()}`),
  candidateDetail: (id: string) => request<CandidateDetail>(`/api/v1/search/candidates/${encodeURIComponent(id)}`),
  savedLists: () => request<SavedList[]>('/api/v1/saved-lists'),
  savedList: (id: string) => request<SavedList>(`/api/v1/saved-lists/${encodeURIComponent(id)}`),
  createSavedList: (name: string) => request<SavedList>('/api/v1/saved-lists', { method: 'POST', body: json({ name }) }),
  addCandidateToList: (listId: string, candidateId: string) => request<SavedList>(`/api/v1/saved-lists/${encodeURIComponent(listId)}/candidates`, { method: 'POST', body: json({ candidateId }) }),
  removeCandidateFromList: (listId: string, candidateId: string) => request<void>(`/api/v1/saved-lists/${encodeURIComponent(listId)}/candidates/${encodeURIComponent(candidateId)}`, { method: 'DELETE' }),
  conversations: () => request<Conversation[]>('/api/v1/conversations'),
  createConversation: (candidateId: string) => request<Conversation>('/api/v1/conversations', { method: 'POST', body: json({ candidateId }) }),
  messages: (conversationId: string) => request<ChatMessage[]>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`),
  sendMessage: (conversationId: string, body: string) => request<ChatMessage>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: json({ body }) }),
  interviews: () => request<Interview[]>('/api/v1/interviews'),
  createInterview: (input: { candidateId: string; opportunityTitle: string; startsAtUtc: string; timezone: string; durationMinutes: number; meetingType: Interview['meetingType']; message?: string; location?: string }) =>
    request<Interview>('/api/v1/interviews', { method: 'POST', body: json(input) }),

  categories: () => request<TaxonomyItem[]>('/api/v1/taxonomy/categories', {}, false),
  subcategories: (categoryId: string) => request<TaxonomyItem[]>(`/api/v1/taxonomy/categories/${encodeURIComponent(categoryId)}/subcategories`, {}, false),
  jobTitles: (q = '') => request<TaxonomyItem[]>(`/api/v1/taxonomy/job-titles?q=${encodeURIComponent(q)}`, {}, false),
  skills: (q = '') => request<TaxonomyItem[]>(`/api/v1/taxonomy/skills?q=${encodeURIComponent(q)}`, {}, false),
  languages: () => request<TaxonomyItem[]>('/api/v1/taxonomy/languages', {}, false),
};
