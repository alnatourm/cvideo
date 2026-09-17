import { expect, test, type Page } from '@playwright/test';

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
  await expect(page.getByRole('button', { name: /Logout|تسجيل الخروج/i })).toHaveCount(0);
  await page.goto('/candidate/messages');
  await expect(page.getByRole('button', { name: /Logout|تسجيل الخروج/i })).toHaveCount(0);
  await page.goto('/candidate/profile');
  await assertHealthyPage(page);
  const logout = page.getByRole('button', { name: /Logout|تسجيل الخروج/i });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(page).toHaveURL(/\/login/);
});

test('recruiter can enter search and account areas', async ({ page }) => {
  test.skip(!recruiterEmail || !recruiterPassword, 'recruiter QC credentials are not configured');
  await login(page, recruiterEmail!, recruiterPassword!);
  await expect(page).toHaveURL(/\/recruiter\//);
  await page.goto('/recruiter/search');
  await assertHealthyPage(page);
  await expect(page.locator('main')).toBeVisible();
  await page.goto('/recruiter/account');
  await assertHealthyPage(page);
  await expect(page.getByRole('button', { name: /Logout|تسجيل الخروج/i })).toBeVisible();
});
