import { defineConfig } from '@playwright/test';

// First export/sync the app and run `node serve-site.mjs` at the repository
// root. Tests use a separate browser context; mock data never enters the app.
export default defineConfig({
  testDir: './tests/web',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '.playwright-results',
  use: {
    baseURL: process.env.ECOTREK_BASE_URL || 'http://127.0.0.1:8000',
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 30.2672, longitude: -97.7431 },
    permissions: ['geolocation'],
    launchOptions: process.env.ECOTREK_CHROMIUM_PATH ? {
      executablePath: process.env.ECOTREK_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader'],
    } : undefined,
  },
});
