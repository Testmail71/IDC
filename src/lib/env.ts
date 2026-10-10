/**
 * Centralised environment access.
 *
 * Public values (NEXT_PUBLIC_*) are safe for the browser and are validated
 * lazily. Server-only secrets are only ever read from code that runs on the
 * server (server components, server actions and route handlers).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env.local and set a value.`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get siteUrl(): string {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000"
    );
  },
};

/**
 * Server-only service-role key. Accessing this from the browser is prevented
 * because `env.server` is only imported by server-only modules. The build
 * will not bundle this into client code as the value is read at request time.
 */
export const serverEnv = {
  get serviceRoleKey(): string {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
};

/** True when the optional online payment gateway is configured. */
export function paymentGatewayEnabled(): boolean {
  return Boolean(
    process.env.PAYMENT_GATEWAY_PROVIDER &&
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET,
  );
}

/** True when the optional WhatsApp Business Platform is configured. */
export function whatsappApiEnabled(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
  );
}
