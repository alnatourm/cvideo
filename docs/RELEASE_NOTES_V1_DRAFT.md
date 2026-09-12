# CVIDEO v1 Draft Release Notes

Status: **DRAFT — NOT RELEASED**

## Included

- Candidate registration and secure session flow.
- Video-first candidate profile with a 30-second, 720p-limited Introduction Video workflow.
- Optional private candidate CV PDF.
- Candidate experience, education, certificate, role, skill and language editing.
- Recruiter candidate search and professional profile viewing.
- Tenant-isolated Saved Lists.
- Company-first conversations and participant-only messaging.
- Interview request and candidate response lifecycle.
- Protected administration and manual company verification workflow.
- Company profile and approved owner/admin/recruiter member hierarchy.
- Arabic/English web and mobile product shells.
- Critical recruiter journey and cross-tenant regression coverage.

## Security baseline

- Server-side role and company-tenant enforcement.
- Candidate cold-contact initiation blocked.
- Cross-tenant Saved List, conversation, interview and member access returns not found.
- Secure web cookies in production mode with CSRF enforcement for cookie-authenticated mutations.
- Provider credentials kept server-side and private document storage kept behind authenticated routes.

## Known limitations

See `docs/RELEASE_READINESS.md`. The most important blockers are Google Meet production integration, manual browser/device QA, independent Security approval, production credentials/configuration and final Product Owner approval.
