import { z } from 'zod';
import { SELF_SERVE_ROLES } from './roles';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address' }));

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' });

export const signInSchema = z.object({
  email: emailSchema,
  role: z.enum(SELF_SERVE_ROLES),
});
export type SignInInput = z.infer<typeof signInSchema>;
