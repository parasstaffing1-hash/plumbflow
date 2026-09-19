/**
 * PlumbFlow OAuth Integration Layer.
 * Supports live Google and Apple OAuth 2.0 / OpenID Connect flows,
 * with graceful fallback to interactive simulated accounts for trade contractor testing.
 */

export interface OAuthProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: "google" | "apple";
}

export const DEMO_OAUTH_PROFILES: OAuthProfile[] = [
  {
    id: "g_ray",
    name: "Ray Hardwick",
    email: "ray@rchdrainage.co.uk",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    provider: "google",
  },
  {
    id: "g_dean",
    name: "Dean Fletcher",
    email: "dean@fletcherplumbing.co.uk",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    provider: "google",
  },
  {
    id: "a_ray",
    name: "Ray Hardwick (Apple ID)",
    email: "ray.hardwick@icloud.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    provider: "apple",
  },
  {
    id: "a_marcus",
    name: "Marcus Reilly (Apple ID)",
    email: "marcus.reilly@icloud.com",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    provider: "apple",
  },
];

export function getGoogleClientId(): string {
  if (typeof window === "undefined") return "";
  return (
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID || ""
  );
}

export function getAppleClientId(): string {
  if (typeof window === "undefined") return "";
  return (
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APPLE_CLIENT_ID || ""
  );
}

export function hasGoogleOAuth(): boolean {
  const id = getGoogleClientId();
  return Boolean(id && id.trim().length > 0 && !id.includes("PLACEHOLDER"));
}

export function hasAppleOAuth(): boolean {
  const id = getAppleClientId();
  return Boolean(id && id.trim().length > 0 && !id.includes("PLACEHOLDER"));
}

/**
 * Initiates the Google OAuth 2.0 redirect flow.
 */
export function startGoogleOAuth(redirectTarget = "/app") {
  const clientId = getGoogleClientId();
  const redirectUri = `${window.location.origin}/login`;

  const state = JSON.stringify({
    provider: "google",
    target: redirectTarget,
    nonce: Math.random().toString(36).slice(2),
  });

  try {
    sessionStorage.setItem("plumbflow_oauth_state", state);
  } catch {
    /* private browsing fallback */
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "openid email profile",
    include_granted_scopes: "true",
    state: encodeURIComponent(state),
    prompt: "select_account",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Initiates the Sign in with Apple OAuth 2.0 / OpenID Connect redirect flow.
 */
export function startAppleOAuth(redirectTarget = "/app") {
  const clientId = getAppleClientId();
  const redirectUri = `${window.location.origin}/login`;

  const state = JSON.stringify({
    provider: "apple",
    target: redirectTarget,
    nonce: Math.random().toString(36).slice(2),
  });

  try {
    sessionStorage.setItem("plumbflow_oauth_state", state);
  } catch {
    /* private browsing fallback */
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    scope: "name email",
    response_mode: "fragment",
    state: encodeURIComponent(state),
  });

  window.location.href = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}
