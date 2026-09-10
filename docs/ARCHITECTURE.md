# CVIDEO Architecture Contract v1.0

Status: DRAFT FOR PRODUCT OWNER APPROVAL

## 1. Purpose
This contract translates the approved CVIDEO product and visual design into implementation boundaries. The Factory Product Contract is authoritative for behavior. The Stitch export is authoritative only for approved visual layout/style; invented Stitch terminology, sample data, hidden labels, salary/compensation, handshake/pipeline language, verification claims, and unsupported statistics are not product requirements.

## 2. Product invariant
CVIDEO is a video-first reverse-employment platform.

Recruiter: Search -> Watch -> Save -> Chat -> Interview.
Candidate: Create Profile -> Upload 30s Introduction Video -> Get Discovered -> Reply -> Interview.

No candidate job browsing/applying. No ATS pipeline. No employment AI scoring from video. Company initiates first contact.

## 3. Runtime architecture
One product, one backend contract, one primary PostgreSQL database.

- Web: React + TypeScript + Vite + Tailwind
- Mobile: React Native + Expo + TypeScript
- API: Node.js + TypeScript + Express
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod at API boundaries
- API prefix: /api/v1
- Media: provider abstraction over S3-compatible/video service
- Meetings: provider abstraction; Google Calendar/Meet first integration
- Tests: Vitest, Supertest, React Testing Library; Playwright for critical web journeys where practical
- CI: GitHub Actions
- Local infrastructure: Docker Compose with PostgreSQL

Suggested monorepo:

cvideo/
  apps/web/
  apps/mobile/
  apps/api/
  packages/ui/
  packages/types/
  packages/validation/
  packages/config/
  database/
  docs/
  .github/workflows/

## 4. Identity and authorization boundary
Canonical roles:
- super_admin
- company_owner
- company_admin
- recruiter
- candidate

Company-owned data is tenant-scoped. Authorization and tenant ownership must be enforced server-side on every protected resource. Frontend hiding is never authorization.

Web authentication target: secure HttpOnly cookie/session architecture with CSRF protection where applicable.
Mobile authentication target: secure token/session stored using platform secure storage.
Passwords: Argon2id.

Auth, authorization, RBAC, tenant isolation, session security and related production changes are HUMAN-APPROVAL GATES before merge.

## 5. Core domains
### Candidate
CandidateAccount, CandidateProfile, CandidateVideo, CandidateSkill, CandidatePreferredRole, CandidateExperience, CandidateEducation, CandidateCertificate, CandidateLanguage, CandidateCV, CandidateAvailability.

### Company
Company, CompanyVerification, CompanyMember. Company registration supports country and commercial registration number; no US-only EIN assumption.

### Discovery
SearchQuery/filters are request-level concepts, not an ATS pipeline. Filters include category/subcategory, preferred role, skills, experience, certificates, country/city, language and availability where applicable. Ranking must not introduce prohibited employment AI scoring.

### Saved Lists
SavedList and SavedCandidate. Lists belong to a company tenant and may contain candidates. They are not application stages or recruitment pipelines.

### Messaging
Conversation and Message. A company member must initiate a conversation. A candidate may reply only after the company-side conversation exists. Backend enforces this rule.

### Interviews
InterviewRequest contains opportunity/role title, proposed date/time, timezone, duration, meeting type, optional message, status, proposer and participants. Candidate responses: accept, suggest another time, decline. Meeting types initially: Google Meet, video call, in person.

### Administration
Protected admin capabilities for users, candidates, companies, company verification, video moderation, taxonomy, plans/configuration and audit activity. Admin is not linked from public/candidate/recruiter navigation.

## 6. Video architecture
The 30-second Introduction Video is the primary candidate media object. CV is optional and secondary.

Requirements:
- server-authorized upload flow
- MIME/type and size validation
- duration validation with 30-second product limit
- target delivery quality up to 720p
- processing state: pending/uploading/processing/ready/rejected/failed
- replace video without rebuilding candidate profile
- signed/private media access where provider supports it
- provider-specific implementation behind a media adapter

The product must not infer personality, emotion, attractiveness, honesty, voice quality, employability or match scores from candidate video.

## 7. Candidate profile limits
- one main field/category
- primary subcategory plus up to two extra subfields
- up to five preferred job titles
- multiple skills
- experience history
- education
- languages
- multiple certificates with issuer/date/expiry/credential reference and optional attachment
- professional summary
- 30-second Introduction Video
- optional CV

## 8. Localization
English LTR and Arabic RTL are first-class. User-facing strings must be localized rather than embedded throughout components. Layout primitives must support direction changes. Dates/times must be locale-aware and interview records must preserve timezone.

## 9. Design implementation rule
Builder uses approved Stitch screens for visual composition, spacing, hierarchy, responsive behavior and component appearance.

Factory contract overrides Stitch when Stitch contains:
- salary/compensation concepts not approved by Product Owner
- handshake terminology
- pitch terminology for Introduction Video
- pipeline/funnel/ATS concepts
- verification claims not backed by a defined feature
- unsupported statistics
- AI match/scoring concepts
- social-network mechanics

Canonical recruiter navigation: Search | Saved Lists | Messages | Company Account.
Canonical candidate navigation: Home | Messages | Profile.

## 10. API boundary
REST API under /api/v1. Controllers must validate input, call domain/service logic and return explicit DTOs. Database rows are not exposed blindly. Protected identifiers must be checked for role and tenant ownership before read/write.

Initial API families:
- /auth
- /candidate/profile
- /candidate/video
- /candidate/certificates
- /companies
- /company/members
- /search/candidates
- /saved-lists
- /conversations
- /messages
- /interviews
- /admin

Exact endpoint schemas are frozen in the Builder Package/OpenAPI stage, not invented independently by the Builder.

## 11. Data and privacy rules
Candidate profiles are intended for professional discovery by authorized company/recruiter users according to final visibility policy. Sensitive credentials and private attachments must not be exposed through predictable public URLs. Audit high-impact admin/company actions. Never place secrets in repository source or client bundles.

## 12. Non-functional requirements
- responsive web and native-feeling mobile
- fast video discovery and candidate transitions
- pagination/cursoring for large result sets
- accessible web controls and keyboard navigation
- minimum 44px mobile touch targets
- structured server logs
- centralized error handling
- rate limiting on abuse-sensitive endpoints
- upload abuse controls
- deterministic migrations
- seed data separated from production data

## 13. Required test boundaries
At minimum verify:
- candidate cannot access recruiter/company actions
- candidate cannot initiate cold conversation
- recruiter can initiate conversation
- cross-tenant company access is denied
- saved lists are tenant-isolated
- interview lifecycle authorization
- admin boundary
- input validation
- video upload validation/duration state behavior
- Arabic/English rendering smoke tests
- critical Search -> Watch -> Save -> Chat -> Interview journey

A claim is PASS only with evidence. Otherwise use NOT VERIFIED.

## 14. Deferred decisions
The Builder must not invent these. Product Owner/Factory will freeze them before affected implementation:
- commercial pricing and recruiter seat model
- final candidate visibility policy
- company verification requirement before discovery/contact
- exact moderation/publishing policy
- watch-count privacy/granularity
- deterministic search ranking/sort order
- calendar authorization/account-linking behavior
- exact video storage/transcoding provider

## 15. Human approval boundary
This architecture defines intended security boundaries but does NOT authorize merging their implementation. Explicit Product Owner approval is required before merging auth, authorization/RBAC, tenant isolation, session/security-boundary, secrets, production infrastructure, destructive migrations or irreversible high-impact data operations.

## 16. Architecture acceptance
Architecture is ready for Builder Package preparation when Product Owner approves:
- one shared API/database architecture
- web/mobile stack
- canonical domains and role model
- server-side tenant/authorization principle
- 30-second/720p video boundary
- company-first messaging
- interview/Google Meet provider boundary
- Stitch-as-visual-only override rule

After approval, Factory prepares the Builder Package and implementation work is opened on governed feature branches.