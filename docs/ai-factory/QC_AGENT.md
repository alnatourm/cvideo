# CVIDEO AI Factory — Autonomous QC Agent

## Mission
The QC Agent is the post-deployment product tester. It must verify real user journeys in the deployed staging environment before a human Product Owner is asked to approve a release.

A green build is not a green product.

## Release pipeline
Build Agent -> Code Review Agent -> Automated Test Agent -> Deploy Agent -> QC Agent -> Release Gate -> Product Owner

The Product Owner validates product feel and business intent. They should not be the primary button-by-button tester.

## QC Agent responsibilities

### 1. Deployment smoke test
- Confirm web application loads on mobile and desktop viewports.
- Confirm API health endpoint responds successfully.
- Confirm authenticated routes do not expose unauthorized data.
- Capture browser console errors and failed network requests.

### 2. Candidate journey
- Register/login as a candidate test account.
- Open Home, Messages, and Profile.
- Complete the simplified professional profile.
- Verify experience accepts and displays a numeric value.
- Verify certificates accept and display a numeric value.
- Verify education uses the approved dropdown values.
- Upload/replace introduction video and verify playback after processing.
- Upload/download/replace/delete CV where applicable.
- Verify profile save persists after refresh and re-login.
- Verify logout exists inside Profile on mobile and does not float over content.
- Verify a candidate cannot browse jobs, apply to jobs, initiate cold recruiter conversations, or browse other candidates.

### 3. Recruiter/company journey
- Register/login as an approved recruiter test account.
- Verify Search, Saved Lists, Messages, and Company Account.
- Search candidates using taxonomy filters.
- Verify minimum-experience filtering changes results correctly.
- Open a candidate and verify name, education, experience, certificate count, skills, preferred titles, and video are displayed when available.
- Save candidate to a named list.
- Repeat save/list actions and verify duplicate lists are not created unexpectedly.
- Verify lists show candidate names rather than raw IDs.
- Initiate recruiter-to-candidate chat.
- Send an interview request.
- Verify interview request has an explicit visible status.
- Verify logout exists inside Company Account on mobile and does not float over content.

### 4. Candidate return journey
- Re-login as the candidate.
- Verify recruiter message appears.
- Verify interview request appears.
- Accept the interview request.
- Verify recruiter sees the updated interview status.

### 5. Responsive and visual checks
Run critical screens at minimum on:
- mobile viewport
- desktop viewport

Flag:
- overlapping controls
- floating controls covering content
- clipped Arabic or English text
- broken RTL/LTR layout
- invisible/empty professional fields
- raw database IDs shown to users
- black/non-playing video
- duplicate visible records
- missing loading, success, error, or status feedback

## Evidence package
For every QC run produce:
- deployed URL and tested commit SHA
- test timestamp
- PASS/FAIL per scenario
- screenshots for critical checkpoints and every visual failure
- console errors
- failed API/network requests
- reproduction steps for every failure
- expected vs actual behavior

## Defect policy
When a reproducible defect is found, create a GitHub issue containing:
1. concise title
2. severity
3. affected role and route
4. tested commit/deployment
5. reproduction steps
6. expected result
7. actual result
8. screenshot/log evidence when available
9. regression flag when a previously passing behavior breaks

Do not create duplicate issues for the same active defect.

## Severity
- BLOCKER: security/privacy failure, authentication failure, data corruption/loss, core journey unusable
- HIGH: major core journey fails with no reasonable workaround
- MEDIUM: feature works incorrectly but a workaround exists
- LOW: visual/copy/usability defect that does not block the journey

## Release Gate
A release is automatically BLOCKED when:
- any BLOCKER exists
- any unresolved HIGH defect affects Candidate -> Recruiter -> Candidate core journey
- authentication or tenant-isolation checks fail
- video/profile/search/chat/interview core flow cannot complete
- QC did not run against the exact deployed commit

A release can be marked QC PASS when:
- all mandatory journeys pass
- no BLOCKER defects exist
- no unresolved HIGH core-flow defects exist
- evidence package is complete
- tested commit equals deployed commit

QC PASS does not merge or release production automatically. Product Owner approval remains the final business gate.

## First CVIDEO regression pack
The initial automated regression suite must permanently include defects already discovered during CVIDEO hardening:
- mobile logout hidden from authenticated mobile navigation
- logout control floating over page content
- Railway deployment skipped when web changes were outside service watch patterns
- minimum experience search filter not applying
- duplicate automatic saved lists
- saved-list candidate displayed as an ID instead of a human-readable name
- missing professional education/experience/certificate values
- unclear or missing interview-request status
- introduction video uploaded but rendered black/non-playing
- CV upload/access failures
- unconfigured interview meeting provider must produce a clear controlled state rather than a broken journey

## Principle
Every production defect discovered by a human becomes a permanent automated regression test. The factory should get harder to fool after every product it builds.
