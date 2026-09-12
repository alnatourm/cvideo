const apiOrigin = process.env.CVIDEO_SMOKE_API_ORIGIN?.trim().replace(/\/$/, '');
const webOrigin = process.env.CVIDEO_SMOKE_WEB_ORIGIN?.trim().replace(/\/$/, '');

if (!apiOrigin) {
  console.error('CVIDEO_SMOKE_API_ORIGIN is required');
  process.exit(1);
}

async function requestWithRetry(url, expectedStatus, attempts = 20) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000), redirect: 'error' });
      if (response.status !== expectedStatus) {
        throw new Error(`${url} returned ${response.status}; expected ${expectedStatus}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

function requireSecurityHeaders(response) {
  if (response.headers.get('x-content-type-options') !== 'nosniff') {
    throw new Error('API response is missing X-Content-Type-Options: nosniff');
  }
  if (response.headers.get('x-frame-options') !== 'SAMEORIGIN') {
    throw new Error('API response is missing X-Frame-Options: SAMEORIGIN');
  }
}

const health = await requestWithRetry(`${apiOrigin}/api/v1/health`, 200);
requireSecurityHeaders(health);
const healthBody = await health.json();
if (healthBody.status !== 'ok' || healthBody.service !== 'cvideo-api' || healthBody.version !== 'v1') {
  throw new Error('API health payload does not match the CVIDEO v1 contract');
}

const missing = await requestWithRetry(`${apiOrigin}/api/v1/release-smoke-missing`, 404, 1);
requireSecurityHeaders(missing);
const missingBody = await missing.json();
if (missingBody?.error?.code !== 'NOT_FOUND') {
  throw new Error('API 404 response does not use the canonical error envelope');
}

if (webOrigin) {
  const web = await requestWithRetry(webOrigin, 200);
  const html = await web.text();
  if (!html.includes('id="root"')) throw new Error('Web response does not contain the CVIDEO application root');
}

console.log(JSON.stringify({
  status: 'pass',
  checks: ['api_health', 'api_security_headers', 'api_error_envelope', ...(webOrigin ? ['web_shell'] : [])],
}));
