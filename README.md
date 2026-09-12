# CVIDEO

CVIDEO is OGroup's video-first reverse-employment platform.

> **Core principle:** Companies search people instead of people searching vacancies.

Candidates build reusable professional profiles centered on a short introduction video. Companies search the talent pool directly, watch candidate videos, save candidates, start conversations, and request interviews. Candidates do **not** browse vacancies or apply to jobs.

---

## New Chat / Factory Continuation Handoff

This README is intentionally the first continuity checkpoint for any new ChatGPT session, developer, or Factory agent.

If this project is resumed in a new chat:

1. Read this README first.
2. Inspect `main`, the latest pull requests, and the latest CI run before making changes.
3. Treat the OGroup AI Product Factory product contract and architecture documents as the source of truth when anything conflicts with generated UI/code.
4. Continue from **Next build sequence** below. Do not restart discovery or rebuild already merged features.
5. Use the Factory rule: **AI says finished -> Factory asks "Prove it."** A feature is not complete until CI/tests/review evidence exists.

### Last verified checkpoint

As of **2026-09-12**:

- Repository: `alnatourm/cvideo`
- Default branch: `main`
- Web Product Integration: **merged** through PR `#33`
- Mobile Product Integration: **merged** through PR `#34`
- PR #34 head: `dd30609812d8c41503854e6951ca38ec4bf6cff3`
- PR #34 merge commit: `3d014ab97e3d31817c6a3452a43ee67766fc1462`
- Factory CI for the final PR #34 head: **SUCCESS**, run `#50`

The earlier mobile typecheck failures involving RTL view styles and unsupported React Native font weights were fixed before PR #34 merged.

### Current Factory phase

**Product Integration / MVP Completion**

The core product engine, web integration, and first mobile integration are now in place. The next work is the final set of product-completion slices, then end-to-end QA, security regression, and release preparation.

---

## Product Contract Summary

### Candidate flow

`Register -> Build profile -> Publish 30-second Introduction Video -> Become discoverable -> Receive company contact -> Chat -> Respond to interview request`

Candidate navigation is restricted to:

- Home
- Messages
- Profile

Candidates do **not**:

- browse jobs
- apply to vacancies
- cold-message companies/recruiters
- receive AI employability/personality/face/voice scores

### Company / Recruiter flow

`Search -> Watch -> Save -> Chat -> Interview`

Company navigation is restricted to:

- Search
- Saved Lists
- Messages
- Company Account

The company initiates the first conversation. This rule is enforced by the backend, not only by the UI.

### Candidate profile

Approved profile model includes:

- photo
- display name
- country / city
- main field / specialization
- up to 2 additional subfields
- up to 5 preferred job titles
- skills
- years of experience
- work experience
- education
- certificates
- languages
- professional summary
- optional CV
- 30-second Introduction Video

Certificates are individual records with name, issuing organization, issue/expiry dates, credential ID/link, and optional document/image support.

### Introduction Video rules

- maximum duration: **30 seconds**
- maximum output resolution: **720p**
- video is the hero element of the candidate profile
- CV is secondary/optional
- Bunny Stream is the current production media provider boundary
- provider credentials and provider asset IDs remain server-side
- no face/personality/emotion/voice/employability scoring

### Interviews

Supported lifecycle:

- company creates request
- candidate Accepts / Suggests another time / Declines
- company can cancel
- role/title, date, time, duration, message, timezone
- Google Meet, other video call, or in-person
- Google Meet is behind a provider boundary; production OAuth/Calendar configuration is still pending

### Saved Lists

Saved Lists are private, tenant-isolated candidate collections. They are **not** ATS stages, pipelines, funnels, or application tracking.

---

## What is Already Built and Merged

### Foundation

- pnpm TypeScript monorepo
- React/Vite web app
- Expo/React Native mobile app
- Node/Express API
- PostgreSQL + Drizzle
- Zod validation
- Docker/PostgreSQL local environment
- GitHub Actions CI
- Arabic/English localization foundations

### Security

- authentication
- Argon2id password hashing
- secure web HttpOnly session cookie model
- CSRF protection for unsafe web requests
- secure mobile Bearer sessions
- session persistence/revocation
- RBAC
- company tenant isolation
- server-derived company/user identity
- authorization guards
- negative/cross-tenant security tests

### Candidate

- candidate registration/login
- protected profile API
- profile completeness
- profile editing
- experience
- education
- certificates
- taxonomy
- discovery visibility controls
- recruiter-safe candidate read models

### Discovery

- company/recruiter candidate search
- filter-ready recruiter-safe search model
- candidate detail view
- only discoverable profiles are exposed
- video playback/thumbnail URLs only, no provider secrets

### Saved Lists

- tenant-isolated Saved Lists
- add/remove candidate
- candidate availability/discoverability validation
- company-only access

### Messaging

- company-first conversation creation
- candidate replies after contact exists
- tenant/participant authorization
- conversation/message persistence

### Interviews

- interview request lifecycle
- candidate Accept / Suggest Another Time / Decline
- company cancellation
- participant access controls
- Google Meet provider boundary

### Web product integration

Merged in PR `#33`:

- secure login/logout/session restoration
- candidate/company registration
- candidate dashboard
- profile editing
- Introduction Video upload/playback management
- discovery visibility
- recruiter Search -> Watch -> Save -> Chat -> Interview
- Saved Lists
- Messaging
- Interviews
- Arabic/English direction support

### Mobile product integration

Merged in PR `#34`:

- secure Expo SecureStore Bearer sessions
- candidate/company login and registration
- candidate Home / Messages / Profile
- company Search / Saved Lists / Messages / Company Account
- candidate core profile editing
- discovery visibility
- interview accept/decline
- native HLS video playback with `expo-video`
- recruiter Search -> Watch -> Save -> Chat -> Interview
- bilingual Arabic/English mobile UI

---

## Next Build Sequence

Continue in this order unless a verified blocker requires changing sequence:

1. **Native mobile Introduction Video recording/upload**
   - record/select video on mobile
   - inspect duration/resolution before upload
   - upload through the protected CVIDEO API/Bunny Stream boundary
   - sync processing status
   - replace/delete video safely

2. **Candidate mobile editor completion**
   - experience CRUD
   - education CRUD
   - certificate CRUD
   - additional subfields
   - full preferred-role/skill/language editing polish

3. **CV and document storage**
   - optional candidate CV PDF
   - certificate image/PDF support
   - provider-neutral S3-compatible document storage boundary
   - protected upload/read/delete policy

4. **Admin and company verification**
   - protected `/admin`
   - company verification queue
   - country + Commercial Registration Number review
   - activate/suspend/reject controls
   - user/company moderation controls required for MVP

5. **Company account/member refinement**
   - company profile
   - member/role management according to approved RBAC hierarchy
   - verification status display

6. **Google Meet production integration**
   - real Google OAuth/Calendar/Meet provider adapter
   - no fake meeting URLs
   - production credentials supplied by account owner only

7. **End-to-end QA and security regression**
   - candidate registration -> profile -> video -> discovery
   - recruiter search -> watch -> save -> chat -> interview
   - Arabic RTL + English LTR
   - web responsive checks
   - iOS/Android checks
   - auth/RBAC/tenant/cold-message negative tests
   - database migrations from clean PostgreSQL

8. **Release preparation**
   - environment documentation
   - deployment configuration
   - production secrets checklist
   - smoke tests
   - final Product Owner release gate

Release operators must use [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md). Current user-facing changes and limitations are recorded in [`docs/RELEASE_NOTES_V1_DRAFT.md`](docs/RELEASE_NOTES_V1_DRAFT.md). These documents do not constitute release approval.

---

## External Production Configuration Still Required

Do not commit secrets. These require account-owner credentials/configuration at deployment time:

- Bunny Stream production library/CDN credentials
- Google OAuth / Calendar / Meet credentials
- production PostgreSQL connection
- production hosting/domain configuration
- S3-compatible document storage credentials when document upload is implemented
- Apple/Google store publishing credentials for release

The Factory should build provider adapters and configuration boundaries without fabricating production success when credentials are absent.

---

## Architecture

### Web

- React
- TypeScript
- Vite
- Tailwind/shared design tokens

### Mobile

- React Native
- Expo SDK 57
- TypeScript
- Expo Router / native product shell
- Expo SecureStore for mobile session storage
- `expo-video` for HLS playback

### API

- Node.js
- TypeScript
- Express
- REST under `/api/v1`
- Zod request validation

### Data

- PostgreSQL
- Drizzle ORM

### Security model

- Argon2id passwords
- opaque server sessions
- web HttpOnly cookies + CSRF
- mobile Bearer sessions
- server-side RBAC
- explicit tenant predicates
- no trust in client-supplied tenant/candidate ownership

---

## Governance

This repository contains the CVIDEO application source.

Product rules, architecture governance, design acceptance, QA gates, security review, documentation requirements, and release governance are controlled by the OGroup AI Product Factory:

- Factory repository: `alnatourm/ogroup-ai-factory`
- Product definition: `products/cvideo/`
- Factory CVIDEO tracking issue: `ogroup-ai-factory#43`

Source-of-truth priority:

1. approved Factory Product Contract
2. approved Architecture / Builder Package
3. security and acceptance rules
4. approved Stitch visual direction
5. implementation code

Stitch is visual guidance, not product authority. Generated code is not accepted as product truth.

### Human approval gates

Human/Product Owner approval is required for sensitive boundaries such as:

- authentication
- authorization / RBAC
- tenant isolation
- payments
- financial calculations
- encryption
- production infrastructure
- destructive migrations
- secrets
- irreversible data operations

Standing approval exists to continue the governed CVIDEO build, but security-sensitive changes still require CI and review evidence before merge.

---

## Prohibited Product Drift

Do not add any of the following unless the Product Contract is explicitly changed:

- Apply buttons
- candidate job browsing
- job-board-first workflow
- ATS/application pipeline/funnel
- candidate cold messaging
- public candidate social feeds
- likes/comments/followers
- AI Match Radar
- face/personality/voice/emotion/honesty/attractiveness/employability scoring
- fake match percentages
- studio credits or recording quotas
- 1080p video toggle
- public admin navigation
- unsupported verification or performance claims

---

## Factory Rule

No production implementation is considered complete because an AI says it is complete.

**Required evidence:**

`implementation -> typecheck -> build -> tests -> migrations -> authorization/security checks -> review -> merge`

If evidence cannot be produced, status must be **NOT VERIFIED**.
