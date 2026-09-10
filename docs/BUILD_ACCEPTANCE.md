# CVIDEO Build Acceptance Contract v1.0

Status: DRAFT BUILDER CONTRACT

## Evidence rule
A builder statement is not evidence. A phase is PASS only when the claimed work has been actually built/run/tested and the evidence is provided. Otherwise use NOT VERIFIED.

## Required delivery report per phase
Builder must provide:
1. branch/commit or delivery identifier
2. changed-file summary
3. exact install/build/typecheck/test commands executed
4. command results
5. migration status when schema changed
6. screenshots or runnable route evidence for UI work
7. API request/response evidence for API work
8. known limitations
9. failed tests or deferred items
10. security-sensitive changes explicitly highlighted

## Phase 1 acceptance: foundation
Required:
- monorepo workspace installs cleanly
- web app starts/builds
- mobile app typechecks/starts in supported environment
- API starts and health endpoint responds
- PostgreSQL Docker Compose configuration validates
- shared TypeScript/config structure exists
- Tailwind/design tokens are wired
- English/Arabic localization shell exists
- candidate/recruiter/admin route shells exist
- no real auth/RBAC/tenant/session implementation is merged
- CI runs install, typecheck, tests and build jobs appropriate to current code

## Phase 2 acceptance: candidate/profile/video
Required:
- deterministic migration(s)
- candidate profile CRUD behavior for implemented fields
- two-extra-subfield maximum enforced and tested
- five-preferred-role maximum enforced and tested
- experience/education/language/certificate behavior tested
- optional CV behavior tested
- Introduction Video lifecycle states implemented
- 30-second duration rule tested
- file type/size validation tested
- 720p/product terminology respected
- no video-based employment scoring exists
- recruiter-facing candidate DTO excludes private account/security fields

Protected endpoints are NOT merge-ready until the Security Gate is approved and independently reviewed.

## Phase 3 acceptance: recruiter engagement
Required:
- search filters work on canonical fields
- desktop/mobile discovery uses video-first flow
- Saved Lists create/read/update/delete and candidate membership work
- Saved Lists tenant isolation tests pass
- recruiter/company can initiate conversation
- candidate cannot initiate cold conversation
- unauthorized conversation access fails
- authorized participant messaging works
- recruiter can create interview request
- candidate can accept/suggest another time/decline
- interview state-transition tests pass
- meeting provider is abstracted from business logic
- cross-tenant and cross-role negative tests pass

## Phase 4 acceptance: admin/release completion
Required:
- admin routes/actions enforce super-admin boundary
- company verification workflow works according to final policy
- video moderation works without scoring
- taxonomy admin supports EN/AR data
- Arabic RTL reviewed on all major screens
- responsive web reviewed at desktop/tablet/mobile widths
- critical E2E journey passes: recruiter Search -> Watch -> Save -> Chat -> Request Interview and candidate response
- documentation reflects actual implementation
- CI is green
- no secrets are committed
- release notes and known limitations are written

## Product drift rejection checks
The build fails product compliance if it introduces any unapproved:
- Apply/job browsing/application workflow
- job-board-first architecture
- ATS pipeline/stages/funnel
- candidate cold messaging
- public social feed/comments/followers/likes
- AI match/personality/face/voice/emotion/employability scoring
- salary/compensation core fields
- unsupported verification claims or marketing statistics
- live-broadcast semantics for the Introduction Video
- Stitch-only handshake/pitch/pipeline terminology

## QA output format
Independent QA reports each area as PASS, FAIL or NOT VERIFIED and attaches evidence/rationale. QA does not edit the specification to make implementation pass.

## Security output format
Independent Security review reports blocking findings, non-blocking findings, verified controls and NOT VERIFIED controls. Frontend-only restrictions do not satisfy authorization findings.

## Final release gate
Even after QA/Security pass, production release requires Product Owner approval. Security-boundary implementation and other Constitution-listed sensitive changes require their explicit approval before merge, not merely at final release.