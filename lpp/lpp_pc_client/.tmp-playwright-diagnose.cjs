const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const session = {
    apiBaseUrl: 'http://127.0.0.1:5173',
    tenantToken: 'test-token',
    tenantId: 'test-tenant',
    tenantCode: 'TEST',
    tenantName: 'Task 7 Tenant',
    userId: 'me-user',
    platformUserId: 'me-platform',
    lppId: 'me-lpp',
    displayName: 'Me',
    roleLabel: 'Tester',
  };
  await page.addInitScript((session) => {
    window.localStorage.setItem('lpp.pc.authSession', JSON.stringify(session));
    window.localStorage.setItem('site_line_current_site_id_v1', session.apiBaseUrl);
    window.localStorage.setItem('site_line_cached_switchable_sites_v1', JSON.stringify([{ id: session.apiBaseUrl, name: '当前登录线路', apiBaseUrl: session.apiBaseUrl }]));
  }, session);
  await page.goto('http://127.0.0.1:34073/');
  await page.waitForTimeout(2000);
  console.log('storage', await page.evaluate(() => localStorage.getItem('lpp.pc.authSession')));
  console.log('app-shell', await page.locator('.app-shell').count());
  console.log('heading', await page.locator('h1').allTextContents());
  console.log('body', (await page.textContent('body'))?.slice(0, 400));
  await browser.close();
})();
