# CVIDEO v1 Release Readiness

Status: **NOT RELEASE APPROVED**

This document is the operator checklist for the current stacked v1 build. Passing CI or the smoke command does not authorize a production release. The Product Owner must approve release after independent QA and Security review.

## Supported deployment shape

- Serve the compiled web application and `/api` on the same HTTPS origin.
- Route `/api/*` to the Node API and all other application routes to the web SPA.
- Run the API with `NODE_ENV=production` so web session cookies are `Secure`, `HttpOnly` and `SameSite=Strict`.
- Use PostgreSQL 16 with encrypted transport and managed backups.
- Mount `CV_DOCUMENT_STORAGE_DIR` as private persistent storage outside every public/static web root.
- Do not expose Bunny Stream API credentials to web or mobile builds.

Cross-origin browser hosting is not configured in v1. A separate web origin requires an explicit, reviewed CORS and cookie policy before deployment.

## Build artifacts

From the repository root with Node 22.13+ and pnpm 10.15.1:

```sh
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Expected application artifacts:

- API: `apps/api/dist`
- Web: `apps/web/dist`
- Mobile: Expo/EAS artifacts are produced separately with account-owner signing credentials.

## Runtime configuration

| Variable | Required | Secret | Release rule |
|---|---:|---:|---|
| `NODE_ENV=production` | Yes | No | Required for secure web cookies. |
| `PORT` | Yes | No | Internal API listener port. |
| `DATABASE_URL` | Yes | Yes | Production PostgreSQL only; enable TLS according to the provider. |
| `CV_DOCUMENT_STORAGE_DIR` | Yes for CV upload | No | Private persistent mount; never a public web directory. |
| `BUNNY_STREAM_LIBRARY_ID` | Yes for video upload | No | Configure together with both Bunny values below. |
| `BUNNY_STREAM_API_KEY` | Yes for video upload | Yes | Server-side secret only. |
| `BUNNY_STREAM_CDN_HOSTNAME` | Yes for playback | No | Approved Bunny pull-zone hostname. |
| `VITE_API_BASE_URL` | Build-time | No | Leave empty for the supported same-origin deployment. |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile build-time | No | Public HTTPS API origin reachable by devices. |

Never commit populated environment files, database dumps, OAuth credentials, mobile signing keys or provider tokens.

## Database deployment

1. Take and verify a recoverable production backup.
2. Apply `database/migrations/0001` through `0007` in numeric order with `ON_ERROR_STOP=1`.
3. Run the same schema/security assertions used by `.github/workflows/ci.yml`.
4. Deploy the compiled API only after migration success.

The repository does not contain destructive down migrations. Roll back application code independently; do not reverse database changes without a reviewed recovery plan.

## Post-deployment smoke test

Run against the deployed HTTPS origins:

```sh
CVIDEO_SMOKE_API_ORIGIN=https://cvideo.example \
CVIDEO_SMOKE_WEB_ORIGIN=https://cvideo.example \
pnpm smoke:release
```

The smoke command checks the API health contract, baseline security headers, canonical 404 envelope and optional web shell. It does not replace authenticated journey, media-upload, tenant-isolation or device testing.

## Release blockers and known limitations

- Google OAuth/Calendar/Meet production integration is not implemented; Google Meet requests cannot be treated as production-ready.
- Secure teammate invitations are deferred pending delivery and invitation-token policy.
- Country and Commercial Registration Number self-service changes are deferred pending reverification policy.
- Company verification status does not yet gate all search/contact actions.
- CV storage uses a private filesystem pilot adapter; production S3-compatible storage and certificate documents are deferred.
- English/Arabic browser walkthrough and iOS/Android device walkthrough are **NOT VERIFIED**.
- Independent RBAC/IDOR Security approval is **NOT VERIFIED**.
- The stacked draft PR chain remains unmerged.

## Final release gate

- [ ] Every stacked PR reviewed in dependency order.
- [ ] Independent QA report completed with evidence.
- [ ] Independent Security report completed with no unresolved blockers.
- [ ] English LTR and Arabic RTL journeys checked on desktop and mobile widths.
- [ ] iOS and Android candidate/company journeys checked on real release builds.
- [ ] Production database backup and migration rehearsal verified.
- [ ] Production Bunny Stream, database, storage, domain and TLS configuration supplied by the account owner.
- [ ] Google Meet either fully configured and verified or removed/disabled from the release scope.
- [ ] Post-deployment smoke command passes against the production URLs.
- [ ] Product Owner explicitly approves production release.
