import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

export const NEON_AUTH_URL: string =
  (import.meta.env?.VITE_NEON_AUTH_URL as string) ||
  "https://ep-ancient-salad-b50jp2r7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";

export function hasNeonAuth(): boolean {
  return Boolean(NEON_AUTH_URL && NEON_AUTH_URL.startsWith("http"));
}

/**
 * Neon Auth Client configured with BetterAuthReactAdapter
 * Connects directly to Lakebase Postgres Managed Better Auth
 */
export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
