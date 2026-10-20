import { describe, expect, it } from 'vitest';
import { emailSchema, otpSchema, signInSchema } from './auth';
import { isSelfServeRole } from './roles';

describe('emailSchema', () => {
  it('normalises case and whitespace', () => {
    expect(emailSchema.parse('  Maya@Email.COM ')).toBe('maya@email.com');
  });
  it('rejects junk', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('accepts exactly six digits', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
    expect(otpSchema.safeParse('12345').success).toBe(false);
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('never allows admin as a sign-up role', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', role: 'admin' }).success).toBe(false);
    expect(isSelfServeRole('admin')).toBe(false);
  });
  it('accepts the three self-serve roles', () => {
    for (const role of ['junior', 'parent', 'employer']) {
      expect(signInSchema.safeParse({ email: 'a@b.co', role }).success).toBe(true);
    }
  });
});
