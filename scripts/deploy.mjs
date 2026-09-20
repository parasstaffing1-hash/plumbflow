import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Load .env if not set in process.env
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";

console.log("🚀 Starting Cloudflare Edge Deployment for PlumbFlow...");
console.log(`👤 Target Account: ${accountId}`);

// Inject environment variables from .env into .output/server/wrangler.json for Cloudflare edge execution
const serverWranglerPath = path.resolve(".output/server/wrangler.json");
if (fs.existsSync(serverWranglerPath)) {
  const serverConfig = JSON.parse(fs.readFileSync(serverWranglerPath, "utf-8"));
  serverConfig.vars = {
    ...(serverConfig.vars || {}),
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "RCH PlumbFlow <onboarding@resend.dev>",
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "plumbflow",
    R2_ENDPOINT: process.env.R2_ENDPOINT || "",
    NEON_AUTH_BASE_URL:
      process.env.NEON_AUTH_BASE_URL ||
      "https://ep-ancient-salad-b50jp2r7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth",
    VITE_NEON_AUTH_URL:
      process.env.VITE_NEON_AUTH_URL ||
      "https://ep-ancient-salad-b50jp2r7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth",
  };
  fs.writeFileSync(serverWranglerPath, JSON.stringify(serverConfig, null, 2), "utf-8");
  console.log("📦 Injected server environment variables into edge worker config.");
}

const wranglerBin = path.resolve("node_modules/wrangler/bin/wrangler.js");

const child = spawn("node", [wranglerBin, "deploy", "--config", ".output/server/wrangler.json"], {
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CI: "true",
  },
  stdio: "inherit",
});

child.on("close", async (code) => {
  if (code === 0) {
    console.log("\n✅ Upload succeeded! Verifying workers.dev route...");
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/plumbflow/subdomain`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: true }),
        },
      );
      console.log("🌐 Production Custom Domain: https://rchplumbflow.co.uk");
      console.log("🌐 Production WWW Domain:    https://www.rchplumbflow.co.uk");
      console.log("🌐 Edge Worker Fallback:      https://plumbflow.voicefield.workers.dev\n");
    } catch (e) {
      console.log("🌐 Production Custom Domain: https://rchplumbflow.co.uk\n");
    }
  } else {
    console.error(`\n❌ Deployment failed with exit code ${code}`);
    process.exit(code);
  }
});
