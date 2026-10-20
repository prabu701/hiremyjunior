const get = (k: string) => Deno.env.get(k)?.trim() || undefined;

export const env = {
  supabaseUrl: get('SUPABASE_URL')!,
  publicUrl: get('SUPABASE_PUBLIC_URL')!,
  siteUrl: get('SITE_URL') ?? 'http://localhost:4000',
  serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY')!,
  anonKey: get('SUPABASE_ANON_KEY')!,
  phoneLoginTestCode: get('PHONE_LOGIN_TEST_CODE'),
  jwtSecret: get('JWT_SECRET')!,
  mailpitUrl: get('MAILPIT_URL') ?? 'http://mail:8025',

  twilio: { accountSid: get('TWILIO_ACCOUNT_SID'), authToken: get('TWILIO_AUTH_TOKEN'), verifyServiceSid: get('TWILIO_VERIFY_SERVICE_SID') },
  stripe: { secretKey: get('STRIPE_SECRET_KEY'), webhookSecret: get('STRIPE_WEBHOOK_SECRET') },
  checkr: { apiKey: get('CHECKR_API_KEY'), package: get('CHECKR_PACKAGE') ?? 'basic_criminal' },
};

/** Each vendor runs for real only when all of its credentials are configured. */
export const live = {
  twilio: !!(env.twilio.accountSid && env.twilio.authToken && env.twilio.verifyServiceSid),
  stripeIdentity: !!env.stripe.secretKey,
  checkr: !!env.checkr.apiKey,
};
