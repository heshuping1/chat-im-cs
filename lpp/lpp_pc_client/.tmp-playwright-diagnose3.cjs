const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const session = {
    apiBaseUrl: 'http://127.0.0.1:34073',
    tenantToken: 'test-token',
    tenantId: 'test-tenant',
    tenantCode: 'TEST',
    tenantName: 'Task 7 Tenant',
    userId: 'me-user',
    platformUserId: 'me-platform',
    lppId: 'me-lpp',
    displayName: 'Me',
    userType: 2,
    membershipRole: 2,
    spaceType: 2,
    roleLabel: 'Tester'
  };
  await page.addInitScript((session) => {
    localStorage.setItem('dummy-key', 'hello');
    localStorage.setItem('lpp.pc.authSession', JSON.stringify(session));
    localStorage.setItem('site_line_current_site_id_v1', session.apiBaseUrl);
    localStorage.setItem('site_line_cached_switchable_sites_v1', JSON.stringify([{ id: session.apiBaseUrl, name: 'current', apiBaseUrl: session.apiBaseUrl }]));
  }, session);
  page.on('response', async (response) => {
    if (response.url().includes('/api/')) console.log('RESPONSE', response.status(), response.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE', msg.text());
  });
  page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
  await page.route('**/api/**', async (route) => {
    console.log('REQUEST', route.request().method(), route.request().url());
    await route.continue();
  });
  await page.goto('http://127.0.0.1:34073/');
  await page.waitForTimeout(3000);
  console.log(await page.evaluate(() => ({ dummy: localStorage.getItem('dummy-key'), auth: localStorage.getItem('lpp.pc.authSession') })));
  await browser.close();
})();
