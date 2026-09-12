export type EffectiveRole = 'super_admin' | 'company_owner' | 'company_admin' | 'recruiter' | 'candidate';

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
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
  video: CandidateVideo | null;
}

export interface CandidateVideo {
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';
  playbackUrl?: string | null;
  thumbnailUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  durationSeconds?: number | null;
  height?: number | null;
  failureReason?: string | null;
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

export interface CandidateSearchPage {
  items: CandidateSearchItem[];
  nextCursor: string | null;
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

export interface CompanyVerification {
  id: string;
  companyId: string;
  companyName: string;
  countryCode: string;
  city: string;
  commercialRegistrationNumber: string;
  submittedByEmail: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  operationalStatus: 'active' | 'suspended';
  reviewedAt: string | null;
  rejectionReason: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export type CompanyVerificationStatusView = Omit<CompanyVerification, 'submittedByEmail' | 'reviewNote'>;

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const CSRF_KEY = 'cvideo_csrf';

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

function isUnsafe(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !(init.body instanceof Blob) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (isUnsafe(method)) {
    const csrf = localStorage.getItem(CSRF_KEY);
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { code?: string; message?: string } };
  if (!response.ok) {
    throw new ApiError(response.status, payload.error?.code ?? 'REQUEST_FAILED', payload.error?.message ?? 'Request failed');
  }
  return payload.data as T;
}

async function apiDownload(path: string) {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw new ApiError(response.status, payload.error?.code ?? 'DOWNLOAD_FAILED', payload.error?.message ?? 'Download failed');
  }
  return response.blob();
}

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export const api = {
  async login(email: string, password: string) {
    const result = await apiRequest<{ principal: Principal; csrfToken: string; expiresAt: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: jsonBody({ email, password, clientType: 'web' }),
    });
    localStorage.setItem(CSRF_KEY, result.csrfToken);
    return result;
  },
  me: () => apiRequest<{ principal: Principal }>('/api/v1/auth/me'),
  async logout() {
    try {
      await apiRequest<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(CSRF_KEY);
    }
  },
  registerCandidate: (input: { email: string; password: string; displayName: string; countryCode: string; city: string }) =>
    apiRequest<unknown>('/api/v1/auth/register/candidate', { method: 'POST', body: jsonBody(input) }),
  registerCompany: (input: { email: string; password: string; companyName: string; countryCode: string; city: string; commercialRegistrationNumber: string }) =>
    apiRequest<unknown>('/api/v1/auth/register/company', { method: 'POST', body: jsonBody(input) }),
  getCompanyVerification: () => apiRequest<CompanyVerificationStatusView>('/api/v1/companies/me/verification'),
  listCompanyVerifications: (status?: CompanyVerification['verificationStatus']) => apiRequest<CompanyVerification[]>(`/api/v1/admin/company-verifications${status ? `?status=${status}` : ''}`),
  approveCompanyVerification: (id: string, note?: string) => apiRequest<CompanyVerification>(`/api/v1/admin/company-verifications/${encodeURIComponent(id)}/approve`, { method: 'POST', body: jsonBody({ note }) }),
  rejectCompanyVerification: (id: string, reason: string, note?: string) => apiRequest<CompanyVerification>(`/api/v1/admin/company-verifications/${encodeURIComponent(id)}/reject`, { method: 'POST', body: jsonBody({ reason, note }) }),
  setCompanyOperationalStatus: (companyId: string, status: CompanyVerification['operationalStatus']) => apiRequest<CompanyVerification>(`/api/v1/admin/companies/${encodeURIComponent(companyId)}/status`, { method: 'PUT', body: jsonBody({ status }) }),

  getCandidateProfile: () => apiRequest<CandidateProfile>('/api/v1/candidate/profile'),
  updateCandidateProfile: (input: unknown) => apiRequest<CandidateProfile>('/api/v1/candidate/profile', { method: 'PUT', body: jsonBody(input) }),
  getProfileCompleteness: () => apiRequest<{ completed: number; total: number; percent: number }>('/api/v1/candidate/profile/completeness'),
  getVisibility: () => apiRequest<{ discoverable: boolean; ready?: boolean; missing?: string[] }>('/api/v1/candidate/visibility'),
  setVisibility: (discoverable: boolean) => apiRequest<{ discoverable: boolean }>('/api/v1/candidate/visibility', { method: 'PUT', body: jsonBody({ discoverable }) }),
  getCandidateVideo: () => apiRequest<CandidateVideo | null>('/api/v1/candidate/video'),
  startCandidateVideo: (input: { filename: string; mimeType: string; sizeBytes: number; durationSeconds: number; height?: number }) =>
    apiRequest<CandidateVideo & { uploadPath: string; maxBytes: number }>('/api/v1/candidate/video/start', { method: 'POST', body: jsonBody(input) }),
  uploadCandidateVideo: (file: File) => apiRequest<CandidateVideo>('/api/v1/candidate/video/content', {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  }),
  syncCandidateVideo: () => apiRequest<CandidateVideo>('/api/v1/candidate/video/sync', { method: 'POST' }),
  deleteCandidateVideo: () => apiRequest<void>('/api/v1/candidate/video', { method: 'DELETE' }),
  uploadCandidateCv: (file: File) => apiRequest<{ filename: string }>('/api/v1/candidate/cv/content', {
    method: 'PUT',
    headers: { 'content-type': 'application/pdf', 'x-file-name': encodeURIComponent(file.name) },
    body: file,
  }),
  deleteCandidateCv: () => apiRequest<void>('/api/v1/candidate/cv', { method: 'DELETE' }),
  downloadOwnCv: () => apiDownload('/api/v1/candidate/cv/content'),

  searchCandidates: (params: URLSearchParams) => apiRequest<CandidateSearchPage>(`/api/v1/search/candidates?${params.toString()}`),
  getCandidateDetail: (candidateId: string) => apiRequest<CandidateDetail>(`/api/v1/search/candidates/${encodeURIComponent(candidateId)}`),
  downloadCandidateCv: (candidateId: string) => apiDownload(`/api/v1/search/candidates/${encodeURIComponent(candidateId)}/cv`),

  listSavedLists: () => apiRequest<SavedList[]>('/api/v1/saved-lists'),
  createSavedList: (name: string, description?: string) => apiRequest<SavedList>('/api/v1/saved-lists', { method: 'POST', body: jsonBody({ name, description }) }),
  getSavedList: (id: string) => apiRequest<SavedList>(`/api/v1/saved-lists/${encodeURIComponent(id)}`),
  addCandidateToList: (listId: string, candidateId: string) => apiRequest<SavedList>(`/api/v1/saved-lists/${encodeURIComponent(listId)}/candidates`, { method: 'POST', body: jsonBody({ candidateId }) }),
  removeCandidateFromList: (listId: string, candidateId: string) => apiRequest<void>(`/api/v1/saved-lists/${encodeURIComponent(listId)}/candidates/${encodeURIComponent(candidateId)}`, { method: 'DELETE' }),

  listConversations: () => apiRequest<Conversation[]>('/api/v1/conversations'),
  createConversation: (candidateId: string) => apiRequest<Conversation>('/api/v1/conversations', { method: 'POST', body: jsonBody({ candidateId }) }),
  listMessages: (conversationId: string) => apiRequest<ChatMessage[]>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`),
  sendMessage: (conversationId: string, body: string) => apiRequest<ChatMessage>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: jsonBody({ body }) }),

  listInterviews: () => apiRequest<Interview[]>('/api/v1/interviews'),
  createInterview: (input: { candidateId: string; opportunityTitle: string; startsAtUtc: string; timezone: string; durationMinutes: number; meetingType: Interview['meetingType']; message?: string; location?: string }) =>
    apiRequest<Interview>('/api/v1/interviews', { method: 'POST', body: jsonBody(input) }),
  acceptInterview: (id: string) => apiRequest<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
  declineInterview: (id: string, message?: string) => apiRequest<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/decline`, { method: 'POST', body: jsonBody({ message }) }),
  suggestInterviewTime: (id: string, startsAtUtc: string, timezone: string, message?: string) => apiRequest<Interview>(`/api/v1/interviews/${encodeURIComponent(id)}/suggest-time`, { method: 'POST', body: jsonBody({ startsAtUtc, timezone, message }) }),

  categories: () => apiRequest<TaxonomyItem[]>('/api/v1/taxonomy/categories'),
  subcategories: (categoryId: string) => apiRequest<TaxonomyItem[]>(`/api/v1/taxonomy/categories/${encodeURIComponent(categoryId)}/subcategories`),
  jobTitles: (q = '') => apiRequest<TaxonomyItem[]>(`/api/v1/taxonomy/job-titles?q=${encodeURIComponent(q)}`),
  skills: (q = '') => apiRequest<TaxonomyItem[]>(`/api/v1/taxonomy/skills?q=${encodeURIComponent(q)}`),
  languages: () => apiRequest<TaxonomyItem[]>('/api/v1/taxonomy/languages'),
};
