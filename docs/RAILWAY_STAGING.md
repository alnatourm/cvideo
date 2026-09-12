# Railway Staging Deployment

Status: **STAGING ONLY — NOT RELEASE APPROVED**

This procedure deploys the compiled web application and API as one public Railway service backed by one private Railway PostgreSQL service. It keeps browser requests, secure cookies and `/api` on the same origin.

## Target services

Keep only these services after verification:

- one public GitHub service built from this repository's root `Dockerfile`
- one private Railway PostgreSQL service with its persistent database volume

The existing standalone web and mobile Railway services are temporary. Do not delete them until the unified service passes every check below. Expo mobile applications are release builds, not long-running Railway services.

## Unified service configuration

1. Use the repository root as the service root directory.
2. Confirm Railway detects `railway.json` and the root `Dockerfile`.
3. Configure `DATABASE_URL` as a Railway reference to the PostgreSQL service's `DATABASE_URL`; do not paste or commit the resolved credential.
4. Set `NODE_ENV=production`.
5. Leave `VITE_API_BASE_URL` empty so the web application uses same-origin `/api` requests.
6. Keep Bunny Stream variables unset until all three approved provider values are available.

On each deploy, Railway runs `pnpm --filter @cvideo/api db:migrate` before starting the service. A failed or changed migration blocks deployment. Railway checks `/api/v1/health` before considering the deployment healthy.

## Private CV document storage

Before enabling CV upload:

1. Attach a persistent Railway volume to the unified service.
2. Mount it at `/data`.
3. Set `CV_DOCUMENT_STORAGE_DIR=/data/private-documents`.
4. Redeploy and verify upload/download authorization with two different tenants.

Never mount private documents inside `apps/web/dist` or expose the volume as a static/public directory. Until a volume is attached, leave `CV_DOCUMENT_STORAGE_DIR` unset; the API will keep CV document upload deferred instead of writing to disposable storage.

## Verification before cleanup

- [ ] Deployment pre-deploy logs show migrations `0001` through `0007` as applied or current.
- [ ] `GET /api/v1/health` returns HTTP 200 and `{"status":"ok","service":"cvideo-api","version":"v1"}`.
- [ ] Opening the unified public URL returns the CVIDEO web shell.
- [ ] Refreshing a nested browser route returns the web shell rather than a 404.
- [ ] `GET /api/v1/unknown` returns the canonical JSON 404 envelope.
- [ ] PostgreSQL has no public domain or public TCP exposure.
- [ ] The repository CI run succeeds, including the migration runner's second idempotence pass.

After all checks pass, stop the old standalone web service and confirm the unified URL again. Then remove the old web service and the Railway mobile service. Keep PostgreSQL and its volume.

## Secret handling

Database credentials appeared in an earlier deployment screenshot. Rotate the PostgreSQL password/connection credential before storing real user data, then keep the value only in Railway's secret/reference system. Do not include secret values in screenshots, issues, PRs or logs.

This staging deployment remains subject to the independent QA, Security and Product Owner release gates in [`docs/RELEASE_READINESS.md`](./RELEASE_READINESS.md).
