# CVIDEO API Contract v1.0

Status: DRAFT BUILDER CONTRACT
Base path: `/api/v1`

## Principles
- JSON REST API.
- Zod validation at request boundaries.
- Explicit DTOs; do not expose raw database rows.
- Every protected resource checks role and ownership/tenant server-side.
- Stable error envelope: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
- Pagination for list/search endpoints.
- Locale does not change stored canonical data; localized labels come from taxonomy/i18n layers.

## Auth family
Security-gated implementation.

Proposed routes:
- `POST /auth/register/candidate`
- `POST /auth/register/company`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`

Exact session/cookie/token mechanics follow Architecture and Security Gate approval.

## Candidate profile
- `GET /candidate/profile`
- `PUT /candidate/profile`
- `GET /candidate/profile/completeness`
- `PUT /candidate/availability`

Subresources:
- `GET|POST /candidate/experience`
- `PUT|DELETE /candidate/experience/:id`
- `GET|POST /candidate/education`
- `PUT|DELETE /candidate/education/:id`
- `GET|POST /candidate/certificates`
- `PUT|DELETE /candidate/certificates/:id`
- `GET|POST /candidate/languages`
- `DELETE /candidate/languages/:id`
- `PUT /candidate/skills`
- `PUT /candidate/preferred-roles`
- `GET /candidate/cv`
- `PUT /candidate/cv/content`
- `GET /candidate/cv/content`
- `DELETE /candidate/cv`

CV upload accepts a raw `application/pdf` body, an encoded `x-file-name` header and a bounded `Content-Length` up to 10 MB. The server verifies the PDF signature. Candidate DTOs expose only the original filename; raw storage keys are never returned.

## Candidate video
- `POST /candidate/video/upload-intent`
- `POST /candidate/video/complete`
- `GET /candidate/video`
- `DELETE /candidate/video`

Video DTO contains status, duration seconds, playback URL only when authorized/ready, thumbnail URL if available, created/updated timestamps.

Server verifies type/size/duration and transitions state through pending/uploading/processing/ready/rejected/failed.

## Company
- `GET /companies/me`
- `PUT /companies/me`
- `GET /companies/me/verification`

The company verification response includes the manual review status (`pending`, `verified`, or `rejected`), operational status (`active` or `suspended`), registration number and any candidate-visible rejection reason. Verification does not claim automation.

Members:
- `GET /company/members`
- `PUT /company/members/:id`

Member reads are tenant-scoped. Owner/admin mutations enforce the approved role hierarchy, prevent self/owner modification and write audit events. Suspension is reversible through `PUT`; destructive member deletion is not used. Secure email invitations remain deferred until delivery and token policies are approved.

## Recruiter candidate search
- `GET /search/candidates`
- `GET /search/candidates/:candidateId`
- `GET /search/candidates/:candidateId/cv`

Query filters may include category, subcategory, preferredRole, skills, minExperienceYears, certificate, country, city, language, availability and cursor/page-size parameters.

Candidate search DTO must expose only recruiter-authorized professional fields. No private account/security data.

Recruiter CV download requires an authenticated company role, company tenant membership and a discoverable candidate profile. It streams the private PDF as an attachment and never returns a storage URL or object key.

## Candidate view event
- `POST /search/candidates/:candidateId/view`

Used to count legitimate recruiter/company views according to final privacy policy. Must be deduplicated/rate-controlled according to implementation contract; builder must not invent public analytics promises.

## Saved Lists
- `GET /saved-lists`
- `POST /saved-lists`
- `GET /saved-lists/:listId`
- `PUT /saved-lists/:listId`
- `DELETE /saved-lists/:listId`
- `POST /saved-lists/:listId/candidates`
- `DELETE /saved-lists/:listId/candidates/:candidateId`

Every list belongs to the company tenant. Cross-tenant reads/writes return authorization/not-found behavior per security design.

## Conversations
- `GET /conversations`
- `POST /conversations`
- `GET /conversations/:conversationId`

`POST /conversations` is company/recruiter-only and requires candidateId. Candidate cannot create a new conversation.

## Messages
- `GET /conversations/:conversationId/messages`
- `POST /conversations/:conversationId/messages`

Both parties may post after an authorized conversation exists. Add pagination/cursoring.

## Interviews
- `POST /interviews`
- `GET /interviews`
- `GET /interviews/:id`
- `POST /interviews/:id/accept`
- `POST /interviews/:id/suggest-time`
- `POST /interviews/:id/decline`
- `POST /interviews/:id/cancel`

Create is company/recruiter-only. Candidate may accept/suggest/decline their own request. Company may cancel its tenant-owned request subject to rules.

Interview DTO:
- id
- candidateId
- companyId
- requestedByUserId
- opportunityTitle
- startsAtUtc
- timezone
- durationMinutes
- meetingType: google_meet | video_call | in_person
- message
- status
- meetingJoinUrl when authorized/created
- location when in-person
- createdAt
- updatedAt

Suggested-time payload includes proposed startsAt/timezone and optional message.

## Taxonomy
Read-only to normal users:
- `GET /taxonomy/categories`
- `GET /taxonomy/categories/:id/subcategories`
- `GET /taxonomy/job-titles`
- `GET /taxonomy/skills`
- `GET /taxonomy/languages`
- `GET /taxonomy/countries`

Admin mutation routes sit under `/admin/taxonomy/...`.

## Admin
Protected super-admin family:
- `GET /admin/overview`
- `GET /admin/users`
- `GET /admin/candidates`
- `GET /admin/companies`
- `GET /admin/company-verifications`
- `POST /admin/company-verifications/:id/approve`
- `POST /admin/company-verifications/:id/reject`
- `PUT /admin/companies/:companyId/status`
- `GET /admin/videos`
- `POST /admin/videos/:id/approve`
- `POST /admin/videos/:id/reject`
- CRUD `/admin/taxonomy/...`
- `GET /admin/audit`

Verification approve/reject and company active/suspended mutations are super-admin-only and create audit events. Rejection requires a reason. A pending verification may be decided only once. Company suspension invalidates active company-member authorization on the next authenticated request.

## Error codes
Initial stable codes should include:
- VALIDATION_ERROR
- UNAUTHENTICATED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- RATE_LIMITED
- VIDEO_INVALID_TYPE
- VIDEO_TOO_LARGE
- VIDEO_TOO_LONG
- VIDEO_NOT_READY
- COMPANY_VERIFICATION_REQUIRED (only if final policy enables this gate)
- CONVERSATION_INITIATION_FORBIDDEN
- INTERVIEW_INVALID_STATE

## API acceptance
Builder must provide request/response examples and tests for every implemented route family. Protected behavior requires negative tests, including cross-role and cross-tenant attempts. Endpoints not yet implemented must not be documented as production-complete.
