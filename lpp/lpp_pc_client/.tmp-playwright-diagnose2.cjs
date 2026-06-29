const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const session = { apiBaseUrl: 'http://127.0.0.1:34073', tenantToken: 'test-token', displayName: 'Me' };
  await page.addInitScript((session) => {
    localStorage.setItem('dummy-key', 'hello');
    localStorage.setItem('lpp.pc.authSession', JSON.stringify(session));
  }, session);
  await page.goto('http://127.0.0.1:34073/');
  await page.waitForTimeout(1000);
  console.log(await page.evaluate(() => ({ dummy: localStorage.getItem('dummy-key'), auth: localStorage.getItem('lpp.pc.authSession') })));
  await browser.close();
})();
