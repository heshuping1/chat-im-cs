import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const chromeChannel = process.env.PLAYWRIGHT_CHROME_CHANNEL || detectWindowsChromeChannel();

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 920 },
  },
  webServer: {
    command: 'npm run dev:browser',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
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
