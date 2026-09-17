import { expect, test, type APIResponse, type Page } from '@playwright/test';

const candidateEmail = process.env.CVIDEO_QC_CANDIDATE_EMAIL;
const candidatePassword = process.env.CVIDEO_QC_CANDIDATE_PASSWORD;
const recruiterEmail = process.env.CVIDEO_QC_RECRUITER_EMAIL;
const recruiterPassword = process.env.CVIDEO_QC_RECRUITER_PASSWORD;

async function assertHealthyPage(page: Page) {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Something went wrong|Internal Server Error/i);
  expect(pageErrors, `browser page errors: ${pageErrors.join('\n')}`).toEqual([]);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function jsonData<T>(response: APIResponse, operation: string): Promise<T> {
  expect(response.ok(), `${operation} ${response.url()} -> ${response.status()}`).toBeTruthy();
  const payload = await response.json() as { data: T };
  return payload.data;
}

async function apiGet<T>(page: Page, path: string) {
  return jsonData<T>(await page.request.get(path), 'GET');
}

async function apiPost<T>(page: Page, path: string, data: unknown) {
  const csrf = await page.evaluate(() => localStorage.getItem('cvideo_csrf'));
  return jsonData<T>(await page.request.post(path, { data, headers: csrf ? { 'x-csrf-token': csrf } : undefined }), 'POST');
}

async function apiPut<T>(page: Page, path: string, data: unknown) {
  const csrf = await page.evaluate(() => localStorage.getItem('cvideo_csrf'));
  return jsonData<T>(await page.request.put(path, { data, headers: csrf ? { 'x-csrf-token': csrf } : undefined }), 'PUT');
}

const logoutName = /Logout|تسجيل الخروج|خروج/i;

test('public shell and login render without browser errors', async ({ page }) => {
  await page.goto('/');
  await assertHealthyPage(page);
  await expect(page.getByText('CVIDEO', { exact: true }).first()).toBeVisible();
  await page.goto('/login');
  await assertHealthyPage(page);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('candidate mobile account flow keeps logout off home and exposes it in profile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile UX assertion');
  test.skip(!candidateEmail || !candidatePassword, 'candidate QC credentials are not configured');
  await login(page, candidateEmail!, candidatePassword!);
  await expect(page).toHaveURL(/\/candidate\//);
  await page.goto('/candidate/home');
  await assertHealthyPage(page);
  await expect(page.getByRole('button', { name: logoutName })).toHaveCount(0);
  await page.goto('/candidate/messages');
  await expect(page.getByRole('button', { name: logoutName })).toHaveCount(0);
  await page.goto('/candidate/profile');
  await assertHealthyPage(page);
  const logout = page.getByRole('button', { name: logoutName });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(page).toHaveURL(/\/login/);
});

test('recruiter can enter search and account areas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'desktop sidebar assertion');
  test.skip(!recruiterEmail || !recruiterPassword, 'recruiter QC credentials are not configured');
  await login(page, recruiterEmail!, recruiterPassword!);
  await expect(page).toHaveURL(/\/recruiter\//);
  await page.goto('/recruiter/search');
  await assertHealthyPage(page);
  await expect(page.locator('main')).toBeVisible();
  await page.goto('/recruiter/account');
  await assertHealthyPage(page);
  await expect(page.getByRole('button', { name: logoutName })).toBeVisible();
});

test('candidate -> recruiter -> candidate critical transaction', async ({ page, browser }) => {
  test.skip(!candidateEmail || !candidatePassword || !recruiterEmail || !recruiterPassword, 'full QC credentials are not configured');

  await login(page, candidateEmail!, candidatePassword!);
  const me = await apiGet<{ principal: { userId: string } }>(page, '/api/v1/auth/me');
  const profile = await apiGet<{ id: string; displayName: string; yearsExperience: number; certificateCount: number; highestEducationLevel: string }>(page, '/api/v1/candidate/profile');
  expect(profile.displayName.trim()).not.toBe('');
  expect(Number.isInteger(profile.yearsExperience)).toBeTruthy();
  expect(Number.isInteger(profile.certificateCount)).toBeTruthy();
  expect(['none','high_school','vocational','diploma','bachelor','master','doctorate','professor']).toContain(profile.highestEducationLevel);
  expect(me.principal.userId).toBeTruthy();

  const visibility = await apiGet<{ discoverable: boolean; ready?: boolean }>(page, '/api/v1/candidate/visibility');
  test.skip(!visibility.discoverable, 'QC candidate must be discoverable for recruiter transaction');

  const recruiterContext = await browser.newContext();
  const recruiterPage = await recruiterContext.newPage();
  await login(recruiterPage, recruiterEmail!, recruiterPassword!);

  const search = await apiGet<{ items: Array<{ id: string; displayName: string; yearsExperience: number; certificateCount: number; highestEducationLevel: string; introductionVideoUrl?: string | null; introductionVideoEmbedUrl?: string | null }> }>(recruiterPage, `/api/v1/search/candidates?minExperienceYears=${profile.yearsExperience}&pageSize=100`);
  const card = search.items.find((item) => item.id === profile.id);
  expect(card, 'discoverable QC candidate missing from recruiter search').toBeTruthy();
  expect(card!.displayName).toBe(profile.displayName);
  expect(card!.yearsExperience).toBeGreaterThanOrEqual(profile.yearsExperience);
  expect(card!.certificateCount).toBe(profile.certificateCount);
  expect(card!.highestEducationLevel).toBe(profile.highestEducationLevel);
  expect(card!.introductionVideoUrl || card!.introductionVideoEmbedUrl, 'candidate introduction video is not playable/discoverable').toBeTruthy();

  const tooExperienced = await apiGet<{ items: Array<{ id: string }> }>(recruiterPage, `/api/v1/search/candidates?minExperienceYears=${profile.yearsExperience + 1}&pageSize=100`);
  expect(tooExperienced.items.some((item) => item.id === profile.id), 'minimum-experience filter did not exclude the QC candidate').toBeFalsy();

  const detail = await apiGet<{ id: string; displayName: string; yearsExperience: number; certificateCount: number; highestEducationLevel: string }>(recruiterPage, `/api/v1/search/candidates/${profile.id}`);
  expect(detail).toMatchObject({ id: profile.id, displayName: profile.displayName, yearsExperience: profile.yearsExperience, certificateCount: profile.certificateCount, highestEducationLevel: profile.highestEducationLevel });

  const runKey = Date.now().toString(36);
  const list = await apiPost<{ id: string; name: string }>(recruiterPage, '/api/v1/saved-lists', { name: `QC ${runKey}`, description: 'Automated browser QC list' });
  await apiPost(recruiterPage, `/api/v1/saved-lists/${list.id}/candidates`, { candidateId: profile.id });
  await apiPost(recruiterPage, `/api/v1/saved-lists/${list.id}/candidates`, { candidateId: profile.id });
  const saved = await apiGet<{ candidateCount: number; candidateIds?: string[]; candidates?: Array<{ id: string; displayName: string }> }>(recruiterPage, `/api/v1/saved-lists/${list.id}`);
  expect(saved.candidateCount).toBe(1);
  expect(saved.candidateIds?.filter((id) => id === profile.id).length ?? saved.candidates?.filter((candidate) => candidate.id === profile.id).length).toBe(1);
  if (saved.candidates?.length) expect(saved.candidates[0]!.displayName).toBe(profile.displayName);

  const conversation = await apiPost<{ id: string }>(recruiterPage, '/api/v1/conversations', { candidateId: profile.id });
  const marker = `QC-${runKey}`;
  await apiPost(recruiterPage, `/api/v1/conversations/${conversation.id}/messages`, { body: `Automated CVIDEO QC ${marker}` });

  const startsAtUtc = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const interview = await apiPost<{ id: string; status: string }>(recruiterPage, '/api/v1/interviews', {
    candidateId: profile.id,
    opportunityTitle: `QC Interview ${marker}`,
    startsAtUtc,
    timezone: 'Asia/Amman',
    durationMinutes: 30,
    meetingType: 'video_call',
    message: `Automated QC ${marker}`,
  });
  expect(interview.status).toBe('pending');

  const candidateConversations = await apiGet<Array<{ id: string }>>(page, '/api/v1/conversations');
  expect(candidateConversations.some((item) => item.id === conversation.id), 'recruiter conversation not visible to candidate').toBeTruthy();
  const messages = await apiGet<Array<{ body: string }>>(page, `/api/v1/conversations/${conversation.id}/messages`);
  expect(messages.some((message) => message.body.includes(marker)), 'recruiter message not visible to candidate').toBeTruthy();

  const candidateInterviews = await apiGet<Array<{ id: string; status: string }>>(page, '/api/v1/interviews');
  expect(candidateInterviews.find((item) => item.id === interview.id)?.status).toBe('pending');
  const accepted = await apiPut<{ id: string; status: string }>(page, `/api/v1/interviews/${interview.id}/candidate-response`, { type: 'accept' });
  expect(accepted.status).toBe('accepted');

  const recruiterInterviews = await apiGet<Array<{ id: string; status: string }>>(recruiterPage, '/api/v1/interviews');
  expect(recruiterInterviews.find((item) => item.id === interview.id)?.status, 'candidate acceptance did not propagate to recruiter').toBe('accepted');

  await recruiterContext.close();
});
