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
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/plumbflow/subdomain`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: true }),
      });
      console.log("🌐 Live Edge URL: https://plumbflow.voicefield.workers.dev\n");
    } catch (e) {
      console.log("🌐 URL: https://plumbflow.voicefield.workers.dev (check dashboard if subdomain is enabled)\n");
    }
  } else {
    console.error(`\n❌ Deployment failed with exit code ${code}`);
    process.exit(code);
  }
});
