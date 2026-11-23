import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    outputDir: '../../.atl/playwright',
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5901',
        screenshot: 'off',
    },
    timeout: 60_000,
    workers: 1,
    retries: 0,
    reporter: 'list',
});
