// Login by email only (no slug). The email uniquely resolves the tenant.
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

// This suite exercises the auth DTO + service contract; the service test
// binds to the integration cluster from auth.test.js, so here we pin the
// contract: loginDto accepts { email, password } without slug.
import { loginDto } from '../../../src/dto/auth.dto.js';

describe('loginDto accepts email-only login', () => {
  it('validates { email, password } without slug', () => {
    const parsed = loginDto.safeParse({
      email: 'TATO75682125@Gmail.com',
      password: 'whatever-pass',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('tato75682125@gmail.com');
    }
  });

  it('still rejects missing password', () => {
    expect(loginDto.safeParse({ email: 'x@y.z' }).success).toBe(false);
  });
});
