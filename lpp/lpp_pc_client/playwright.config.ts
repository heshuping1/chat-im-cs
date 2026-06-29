import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const chromeChannel = process.env.PLAYWRIGHT_CHROME_CHANNEL || detectWindowsChromeChannel();
const derivedPlaywrightPort = 34000 + (process.pid % 1000);
const playwrightPort = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT || derivedPlaywrightPort);
const baseURL = `http://127.0.0.1:${Number.isFinite(playwrightPort) ? playwrightPort : 4173}`;

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 920 },
  },
  webServer: {
    command: `cmd /c cross-env VITE_PORT=${Number.isFinite(playwrightPort) ? playwrightPort : 4173} npm run dev:browser`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromeChannel ? { channel: chromeChannel } : {}),
      },
    },
  ],
});

function detectWindowsChromeChannel() {
  if (process.platform !== 'win32') return undefined;

  const browserCandidates = [
    {
      channel: 'chrome',
      executables: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ],
    },
    {
      channel: 'msedge',
      executables: [
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
    },
  ] as const;

  return browserCandidates.find((candidate) => candidate.executables.some((path) => existsSync(path)))?.channel;
}
