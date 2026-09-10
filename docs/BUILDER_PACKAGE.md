# CVIDEO Builder Package v1.0

Status: DRAFT FOR PRODUCT OWNER APPROVAL

## 1. Builder role
The Builder implements CVIDEO. The Builder is not the Product Manager, UX owner, architect, security approver, QA approver, or release authority.

Source-of-truth order:
1. OGroup Factory Product Contract
2. CVIDEO Architecture Contract v1.0
3. This Builder Package
4. Approved Stitch visual composition/style only
5. Builder implementation choices

If lower layers conflict with higher layers, higher layers win. Do not guess silently. Report the conflict.

## 2. Product summary
CVIDEO is a video-first reverse-employment platform.

Recruiter journey: Search -> Watch -> Save -> Chat -> Interview.
Candidate journey: Create Profile -> Upload 30s Introduction Video -> Get Discovered -> Reply -> Interview.

Candidates do not browse vacancies and do not apply to jobs. Companies search the talent pool. Company/recruiter initiates first contact. Saved Lists are not an ATS pipeline.

## 3. Required stack
- Web: React + TypeScript + Vite + Tailwind CSS
- Mobile: React Native + Expo + TypeScript
- API: Node.js + TypeScript + Express
- Database: PostgreSQL
- ORM: Drizzle
- Validation: Zod
- Tests: Vitest + Supertest + React Testing Library; Playwright for critical web journeys when practical
- CI: GitHub Actions
- Local DB: Docker Compose PostgreSQL
- API prefix: /api/v1

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
    migrations/
    seed/
  docs/
  .github/workflows/
  docker-compose.yml
  package.json
  .env.example

## 4. Canonical roles
- super_admin
- company_owner
- company_admin
- recruiter
- candidate

Security rules are server-side. Frontend visibility is never authorization.

## 5. Canonical navigation
Candidate:
- Home
- Messages
- Profile

Recruiter/company:
- Search
- Saved Lists
- Messages
- Company Account

Admin is protected and separate. Do not place an Admin link in public, candidate, or recruiter navigation.

## 6. Visual implementation rule
Use approved Stitch screens for visual hierarchy, spacing, responsive composition, component appearance, portrait-video emphasis, and desktop/mobile layout.

Do not copy invented Stitch product language or unsupported sample claims.

Forbidden implementation concepts unless Product Owner later approves them:
- Apply button
- candidate job browsing/search
- job-posting-first product model
- applications/application tracking
- ATS pipeline/funnel
- public social feed
- public comments/followers/likes
- candidate cold messaging to recruiters
- AI match score/radar
- face/personality/voice/emotion/attractiveness/honesty/employability scoring
- unsupported verification claims
- salary/compensation as a core v1 field
- unsupported marketing statistics
- handshake/pitch/pipeline terminology

Use `Introduction Video`, `Saved Lists`, `Messages`, `Request Interview`, `Skills`, `Experience`, `Certificates`, and other canonical terms.

## 7. Screen contract
### Public web
- Landing page
- Login
- Candidate registration
- Company registration
- language switch

### Candidate
- onboarding
- Home dashboard
- Profile view
- Profile edit
- Introduction Video upload/replace/preview
- skills and preferred roles
- experience
- education
- certificates
- languages
- optional CV
- Messages list
- Conversation
- Interview request detail
- Accept / Suggest Another Time / Decline
- settings/account basics

### Recruiter/company
- onboarding
- company setup
- verification-pending state
- Search
- filters
- result/discovery view
- immersive portrait-video discovery
- full candidate profile
- Save candidate
- Saved Lists
- Saved List detail
- create/rename/delete list
- Messages list
- Conversation
- initiate conversation
- Request Interview
- Interview confirmation/state
- Company Account
- company profile edit
- team/member management

### Admin
- dashboard overview
- users
- candidates
- companies
- company verification
- video moderation
- taxonomy/categories/subcategories/job titles/skills
- configuration/plans placeholders where contract permits
- audit view

## 8. Candidate profile contract
Candidate professional profile supports:
- name
- profile photo
- country
- city
- primary field/category
- primary subcategory
- up to two extra subfields
- up to five preferred job titles
- multiple skills
- years of experience
- experience history
- education
- languages
- multiple certificates
- professional summary
- 30-second Introduction Video
- optional CV
- availability/open-to-opportunities state when finalized

Certificate fields:
- certificate name
- issuing organization
- issue date
- optional expiry date
- optional credential ID/link
- optional image/PDF attachment

## 9. Video contract
The Introduction Video is the hero media object.

- product limit: 30 seconds
- target delivery: up to 720p
- recorded/uploaded media, not live broadcast
- allow replace/update without rebuilding profile
- states: pending, uploading, processing, ready, rejected, failed
- validate MIME/type, size, duration
- media provider behind adapter
- do not implement employment AI inference from video

## 10. Recruiter search contract
Search filters may include:
- category/field
- subcategory
- preferred job title
- skills
- experience
- certificates
- country
- city
- languages
- availability

Discovery experience is video-first and fast. Desktop should preserve filters while recruiter advances through candidates. Mobile can use swipe/next behavior. No entertainment/social mechanics.

## 11. Saved Lists contract
Company users can:
- create list
- rename list
- delete list
- save candidate to one or more lists
- remove candidate
- view list contents

Saved Lists are tenant-owned resources. They are not stages, pipelines, applications, or funnels.

## 12. Messaging contract
- company/recruiter initiates first conversation
- candidate cannot initiate a cold conversation
- once conversation exists, both sides may exchange messages
- authorization enforced on API for every conversation/message action
- no public messaging exposure

## 13. Interview contract
Recruiter/company may request interview without a job posting.

Request fields:
- opportunity/role title
- date
- time
- timezone
- duration
- type
- optional message

Types initially:
- Google Meet
- Video Call
- In Person

Candidate responses:
- Accept
- Suggest Another Time
- Decline

Google Calendar/Meet integration must sit behind a provider adapter. Do not hard-wire business logic to Google-specific payloads.

## 14. Company contract
Company fields:
- company name
- country
- city
- commercial registration number
- industry
- company size
- website
- logo
- description
- owner/admin contact

No U.S.-only EIN assumption.

## 15. Localization
- English LTR
- Arabic RTL
- no hardcoded strings spread across components
- centralized localization keys
- locale-aware dates/times
- interview records preserve timezone
- RTL must be visually designed, not merely text-aligned

## 16. Implementation phases
### Phase 1: Foundation
Allowed before Security Gate implementation approval:
- monorepo scaffold
- TypeScript configuration
- lint/format/test infrastructure
- design tokens and shared UI primitives
- localization shell
- public landing/auth visual shells
- candidate/recruiter/admin route shells using mock/static data
- API health endpoint and non-sensitive skeleton
- PostgreSQL Docker Compose
- CI skeleton

Do not merge real auth/RBAC/tenant/session implementation in Phase 1.

### Phase 2: Core data/profile/video
- database schemas/migrations
- candidate profile domain
- taxonomy
- certificate/experience/education/language data
- video adapter and media states
- profile read/write services
- recruiter-safe candidate read model

Protected endpoints become mergeable only after applicable Security Gate approval.

### Phase 3: Discovery and engagement
- recruiter search/filter
- video discovery
- Saved Lists
- company-first messaging
- interview request lifecycle
- meeting provider integration boundary

### Phase 4: Admin and release completion
- protected admin
- company verification
- moderation
- Arabic RTL completion
- E2E regression
- docs
- CI/release evidence

## 17. Builder evidence required after every phase
Builder must provide:
- changed-file summary
- exact commands run
- typecheck result
- build result
- test result
- migration result where applicable
- screenshots/runnable routes where applicable
- API examples where applicable
- known limitations
- unverified items

Never say PASS if not actually run. Use NOT VERIFIED.

## 18. Independent review
Builder self-review is not final approval.

Factory QA independently checks product behavior and tests.
Factory Security independently checks auth, RBAC, tenant isolation, IDOR, sessions, uploads, admin boundaries, validation, secrets, abuse controls.
Factory Documentation compares docs to actual code.
Factory Release checks CI/evidence/readiness.

## 19. Human approval gates
Explicit Product Owner approval is required before merging implementation that changes or creates:
- authentication
- authorization/RBAC
- tenant isolation
- session security
- secrets handling
- production infrastructure
- destructive migrations
- irreversible high-impact data operations
- encryption/payment boundaries if later introduced

## 20. Definition of Done for v1
CVIDEO v1 is not done until:
- required product flows exist
- web and mobile share one backend contract
- Arabic and English work
- critical tests pass
- auth/tenant boundaries are independently reviewed
- no prohibited product drift appears
- docs reflect actual implementation
- CI/release evidence exists
- Product Owner gives final release approval

## 21. Builder instruction
Do not build beyond this package because a generated design or code assistant suggests extra features. Build the smallest complete CVIDEO v1 that satisfies the Product Contract, Architecture, and this package. Escalate conflicts instead of inventing product behavior.