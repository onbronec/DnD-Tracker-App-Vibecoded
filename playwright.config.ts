import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: 'node server.js',
      port: 3100,
      reuseExistingServer: false,
      env: { DND_DM_TOKEN: 'test-token', DND_AUTOSAVE_FILE: 'test-results/e2e-autosave.json', PORT: '3100' }
    },
    {
      command: 'npm.cmd run dev:vite',
      port: 5174,
      reuseExistingServer: false,
      env: { VITE_PORT: '5174', VITE_PROXY_PORT: '3100' }
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
