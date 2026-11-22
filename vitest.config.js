import { defineConfig } from 'vitest/config';

// Integration tests run against the ephemeral cluster started by globalSetup
// (port 55433). The env is declared here because vitest workers do not inherit
// process.env mutations made in globalSetup after they already spawned.
export default defineConfig({
    test: {
        include: ['test/**/*.test.js'],
        globalSetup: 'test/integration/helpers/global-setup.js',
        env: {
            NODE_ENV: 'test',
            PORT: '3100',
            JWT_SECRET: 'test-secret-test-secret-test-secret-01',
            JWT_EXPIRES_IN: '1h',
            BASE_URL: 'http://localhost:3100',
            DATABASE_URL: 'postgres://ganaderia_app:ganaderia_app_dev@127.0.0.1:55433/ganaderia_test',
            ADMIN_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:55433/ganaderia_test',
        },
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
