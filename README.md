# 🔧 RCH PlumbFlow

> Modern Job Management & Hands-Free AI Voice Assistant for Plumbing & Heating Engineers.

**Live Production Sites**:
- 🌐 [https://rchplumbflow.co.uk](https://rchplumbflow.co.uk)
- 🌐 [https://www.rchplumbflow.co.uk](https://www.rchplumbflow.co.uk)
- ⚡ [https://plumbflow.voicefield.workers.dev](https://plumbflow.voicefield.workers.dev)

---

## 🚀 Key Features

- **🎙️ Real-time AI Voice Assistant (Hands-Free)**:
  - Powered by **Vapi** WebRTC audio stream for real-time natural language voice interaction in the van or on-site.
  - Dictate job completions, quote revisions, customer follow-ups, and booking appointments without typing.
  - Resilient browser WebRTC integration with automatic reconnect and permission handling.
- **⚡ Neon Auth (Managed Better Auth)**:
  - Enterprise authentication backed by Neon Lakebase Postgres.
  - Multi-tenant contractor workspaces with real-time session synchronization.
  - Seamless fallback support for rapid demonstration contractor workspaces.
- **📋 Complete Plumbing Contractor Workflow**:
  - Customer CRM, job sheets, quotes, invoice generation, and price book.
  - Public booking portals with dedicated area landing pages and slug routing.
  - PDF/digital completion reports and safety certificates.
- **🌍 Edge-Optimized Architecture**:
  - Built with **TanStack Start**, **React 19**, and **Tailwind CSS**.
  - Server-side rendered (SSR) and deployed to **Cloudflare Workers** with zero cold-starts.
  - Static asset streaming via Cloudflare Assets KV.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack SSR) + [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Voice AI**: [@vapi-ai/web](https://vapi.ai)
- **Database & Auth**: [Neon](https://neon.tech) Lakebase Postgres & [Neon Auth](https://neon.com/docs/auth)
- **Edge Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/) via [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- **Email Delivery**: [Resend](https://resend.com)
- **Object Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/)

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/parasstaffing1-hash/plumbflow.git
cd plumbflow
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in credentials:
```bash
cp .env.example .env
```

Key environment variables:
- `VITE_VAPI_PUBLIC_KEY`: Vapi public API key
- `VITE_VAPI_ASSISTANT_ID`: Vapi assistant ID
- `VITE_NEON_AUTH_URL`: Neon Auth endpoint URL
- `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID`: Edge deployment credentials
- `RESEND_API_KEY`: Email notification API key

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚀 Build & Edge Deployment

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

---

## 📄 License
All rights reserved © 2026 RCH PlumbFlow.
