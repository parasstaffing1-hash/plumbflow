/**
 * Google OAuth 2.0 Server-Side Callback Handler for RCH PlumbFlow.
 *
 * Handles the redirect from Google Cloud Console:
 *   GET /api/auth/callback/google?code=...&state=...
 *
 * Exchanges authorization code for access tokens, fetches user profile,
 * and securely redirects the authenticated user into PlumbFlow CRM.
 */

export async function handleGoogleOAuthCallback(
  request: Request,
  env: unknown,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle Google OAuth errors (e.g. user cancelled)
  if (error) {
    console.warn("[Google OAuth] Received error from Google:", error);
    return Response.redirect(`${url.origin}/login?error=${encodeURIComponent(error)}`, 302);
  }

  // Parse state to recover target destination (default: /app)
  let target = "/app";
  if (rawState) {
    try {
      const decoded = decodeURIComponent(rawState);
      const parsed = JSON.parse(decoded) as { target?: string };
      if (parsed.target && parsed.target.startsWith("/")) {
        target = parsed.target;
      }
    } catch {
      // Keep default /app
    }
  }

  // If no code was provided (e.g. hash fragment or direct navigation),
  // return a lightweight HTML bridge to forward hash tokens to /login
  if (!code) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating with Google | RCH PlumbFlow</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0d0e; color: #ffffff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; padding: 24px;">
    <div style="font-size: 22px; font-weight: 800; color: #f59e0b; margin-bottom: 8px;">RCH PlumbFlow</div>
    <p style="color: #94a3b8; font-size: 15px;">Connecting Google Trade Account...</p>
  </div>
  <script>
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash && hash.includes("access_token")) {
      window.location.replace('/login' + hash);
    } else {
      window.location.replace('/login' + (search || ''));
    }
  </script>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Resolve Client ID & Client Secret from Worker env or Node process.env
  const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string>;
  const processEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env || {};

  const clientId =
    envObj["VITE_GOOGLE_CLIENT_ID"] ||
    processEnv["VITE_GOOGLE_CLIENT_ID"] ||
    "206321876549-bp5c71auoh8437839ud2l68m456d4gbj.apps.googleusercontent.com";

  const clientSecret =
    envObj["GOOGLE_CLIENT_SECRET"] ||
    processEnv["GOOGLE_CLIENT_SECRET"] ||
    "";

  const redirectUri = `${url.origin}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[Google OAuth] Token exchange failed:", tokenRes.status, errText);
      return Response.redirect(
        `${url.origin}/login?error=google_token_exchange_failed`,
        302,
      );
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      id_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    if (!tokenData.access_token) {
      console.error("[Google OAuth] No access_token returned from token endpoint");
      return Response.redirect(`${url.origin}/login?error=no_access_token`, 302);
    }

    // 2. Fetch authenticated user profile from Google UserInfo endpoint
    let email = "";
    let name = "Google User";
    let picture = "";

    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userRes.ok) {
        const profile = (await userRes.json()) as {
          email?: string;
          name?: string;
          given_name?: string;
          picture?: string;
        };
        email = profile.email || "";
        name = profile.name || profile.given_name || "Google User";
        picture = profile.picture || "";
      }
    } catch (profileErr) {
      console.warn("[Google OAuth] UserInfo fetch warning:", profileErr);
    }

    // 3. Construct landing hash parameters for /login to seamlessly establish user session
    const landingParams = new URLSearchParams({
      access_token: tokenData.access_token,
      provider: "google",
      user_email: email,
      user_name: name,
      avatar_url: picture,
      target,
    });

    if (tokenData.id_token) {
      landingParams.set("id_token", tokenData.id_token);
    }

    // Redirect user to /login with hash fragment so client-side state is populated
    return Response.redirect(
      `${url.origin}/login#${landingParams.toString()}`,
      302,
    );
  } catch (err) {
    console.error("[Google OAuth] Unexpected error in callback handler:", err);
    return Response.redirect(`${url.origin}/login?error=oauth_internal_error`, 302);
  }
}
