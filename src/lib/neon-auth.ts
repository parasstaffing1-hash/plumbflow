import type { ReactBetterAuthClient } from "@neondatabase/auth";

export const NEON_AUTH_URL: string =
  (import.meta.env["VITE_NEON_AUTH_URL"] as string) ||
  "https://ep-ancient-salad-b50jp2r7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";

export function hasNeonAuth(): boolean {
  return Boolean(NEON_AUTH_URL && NEON_AUTH_URL.startsWith("http"));
}

let _clientPromise: Promise<ReactBetterAuthClient | null> | null = null;

/**
 * Dynamically import Neon Auth client in the browser only.
 * This ensures @neondatabase/auth and its top-level crypto.randomUUID()
 * are NEVER executed in Cloudflare Worker global scope during SSR.
 */
export async function getBrowserAuthClient(): Promise<ReactBetterAuthClient | null> {
  if (import.meta.env.SSR || typeof window === "undefined") {
    return null;
  }
  if (!_clientPromise) {
    _clientPromise = (async () => {
      try {
        const [{ createAuthClient }, { BetterAuthReactAdapter }] = await Promise.all([
          import("@neondatabase/auth"),
          import("@neondatabase/auth/react/adapters"),
        ]);
        return createAuthClient(NEON_AUTH_URL, {
          adapter: BetterAuthReactAdapter(),
        }) as ReactBetterAuthClient;
      } catch (err) {
        console.error("[Neon Auth] Failed to initialize in browser:", err);
        return null;
      }
    })();
  }
  return _clientPromise;
}

export const authClient = {
  signIn: {
    email: async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
      const client = await getBrowserAuthClient();
      if (!client) return { data: null, error: new Error("Auth not available on server") };
      return client.signIn.email(credentials);
    },
    social: async (params: { provider: string; callbackURL?: string }) => {
      const client = await getBrowserAuthClient();
      if (!client) return { data: null, error: new Error("Auth not available on server") };
      return (client.signIn as unknown as { social: (p: typeof params) => Promise<unknown> }).social(params);
    },
  },
  signUp: {
    email: async (credentials: {
      email: string;
      password: string;
      name: string;
      callbackURL?: string;
    }) => {
      const client = await getBrowserAuthClient();
      if (!client) return { data: null, error: new Error("Auth not available on server") };
      return client.signUp.email(credentials);
    },
  },
  signOut: async () => {
    const client = await getBrowserAuthClient();
    if (!client) return { data: null, error: null };
    return client.signOut();
  },
  getSession: async () => {
    const client = await getBrowserAuthClient();
    if (!client) return { data: null, error: null };
    return client.getSession();
  },
};

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
