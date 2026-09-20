# Production Deployment & OAuth Integration Playbook

This document is your exact step-by-step roadmap when your client provides the custom domain (e.g. `plumbflow.co.uk`).

---

## Step 1: Deploy to Edge Hosting (Cloudflare Pages or Vercel)

PlumbFlow builds natively with Nitro (`cloudflare-module` preset) and Vite into a high-performance edge deployment.

### Option A: Cloudflare Pages / Workers (Recommended)

Because Cloudflare already hosts your R2 bucket (`plumbflow`), hosting on Cloudflare delivers lowest latency:

1. Run the production build:
   ```powershell
   npm run build
   ```
2. Deploy via Wrangler:
   ```powershell
   npx wrangler pages deploy .output/public --project-name plumbflow
   ```
3. In the Cloudflare Dashboard:
   - Navigate to **Workers & Pages** -> **plumbflow** -> **Custom Domains**.
   - Enter your client's domain (e.g. `plumbflow.co.uk` and `www.plumbflow.co.uk`).
   - Cloudflare automatically provisions edge SSL/TLS certificates with zero configuration.

### Option B: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow prompts.
3. Attach domain under **Project Settings** -> **Domains**.

---

## Step 2: Set Up OAuth with the Client's Domain

OAuth providers (Google, GitHub, Microsoft) require a real, verified public domain for redirect URIs.

### Google OAuth Setup (Google Cloud Console)

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Application type: _Web application_).
3. Under **Authorized JavaScript origins**, add:
   - `https://yourdomain.co.uk`
   - `https://www.yourdomain.co.uk`
4. Under **Authorized redirect URIs**, add:
   - `https://yourdomain.co.uk/api/auth/callback/google`
   - _(And for local testing: `http://localhost:8080/api/auth/callback/google`)_
5. Copy the **Client ID** and **Client Secret** into your production environment variables.

### Neon Auth (Managed Better Auth) OAuth

If using Neon Auth (`auth: true` in `neon.ts`):

1. In the Neon Console or via CLI:
   ```powershell
   neon neon-auth oauth-provider add google --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET>
   ```
2. Redirect URI to provide to Google:
   `https://<neon-auth-subdomain>.neon.tech/oauth/callback/google`

---

## Step 3: Verify the Custom Domain in Resend

To send emails from `hello@yourdomain.co.uk` instead of the sandbox address (`onboarding@resend.dev`):

1. Go to [resend.com/domains](https://resend.com/domains) and click **Add Domain**.
2. Enter the client's domain (e.g. `yourdomain.co.uk` or `mail.yourdomain.co.uk`).
3. Resend will provide 3 DNS records:
   - **DKIM** (TXT record)
   - **SPF** (MX / TXT record)
   - **DMARC** (TXT record)
4. Add these 3 records to the client's DNS registrar (Cloudflare, GoDaddy, Namecheap, etc.).
5. Once verified (usually 2-5 minutes), update `.env`:
   ```bash
   RESEND_FROM_EMAIL="RCH PlumbFlow <hello@yourdomain.co.uk>"
   ```

---

## Step 4: Link Neon Database & Apply Schema

Once you have your client's database credentials or Neon API key:

1. Link project:
   ```powershell
   neon link --project-id silent-frost-77535595 --branch production -y
   ```
2. Apply database tables and Row Level Security:
   Execute [`docs/phase2-migration.sql`](file:///d:/AAFAT/docs/phase2-migration.sql) against your branch.
3. Add `DATABASE_URL` to your production environment variables.

---

## Pre-Launch Production Checklist

- [x] Bundle & SSR performance optimized (sub-10s build, CSS charts, vendor splitting)
- [x] Offline local WebP assets verified
- [x] Cloudflare R2 bucket (`plumbflow`) integrated & verified
- [x] Resend email delivery verified (API key active, password reset working)
- [x] Formspree contact form verified (`xzezznba`)
- [x] Authentication & route guards verified
- [ ] Client domain added to edge host (Cloudflare / Vercel)
- [ ] Google OAuth / Neon OAuth credentials configured with domain
- [ ] Resend DNS records (SPF, DKIM) verified for custom sender
- [ ] Neon PostgreSQL schema applied
- [ ] Stripe keys attached for subscription billing
