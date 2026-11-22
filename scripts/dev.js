#!/usr/bin/env node
// Development entry point: injects dev-only defaults when variables are unset,
// then boots the API exactly like production does (via index.js and env.js).
// No .env file is created or committed; real secrets are always provided by the
// operator through the environment.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-please-rotate-0123456789abcdef';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://ganaderia_app:ganaderia_app_dev@127.0.0.1:55432/ganaderia';
process.env.ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:55432/ganaderia';

await import('../index.js');
