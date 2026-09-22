import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { handleVapiToolCall, handleVoiceInvoiceApi } from "./server/invoice-tools";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"}, try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError();
  const errMsg =
    captured instanceof Error
      ? `${captured.message}\n${captured.stack}`
      : String(captured ?? `h3 swallowed SSR error: ${body}`);
  console.error(errMsg);
  return new Response(renderErrorPage() + `\n<!-- H3 SSR Error:\n${errMsg}\n-->`, {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-debug-error": encodeURIComponent(errMsg.slice(0, 300)),
    },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleVapiProxy(request: Request, env: unknown): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Remove leading /api/vapi or /api/vapi/
  const subPath = url.pathname.replace(/^\/api\/vapi\/?/, "");
  const targetUrl = `https://api.vapi.ai/${subPath}${url.search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "host" && lower !== "origin" && lower !== "referer") {
      forwardHeaders.set(key, value);
    }
  });

  const envObj = env && typeof env === "object" ? (env as Record<string, string>) : {};
  const processEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env;
  const vapiPublicKey =
    envObj["VITE_VAPI_PUBLIC_KEY"] ||
    (processEnv ? processEnv["VITE_VAPI_PUBLIC_KEY"] : undefined) ||
    "a70bed79-7b94-4f27-8ad2-8aefe1f66b9a";

  if (!forwardHeaders.has("authorization")) {
    forwardHeaders.set("authorization", `Bearer ${vapiPublicKey}`);
  }

  let body: string | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.text();
    } catch {
      body = null;
    }
  }

  try {
    const vapiRes = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const responseText = await vapiRes.text();

    return new Response(responseText, {
      status: vapiRes.status,
      statusText: vapiRes.statusText,
      headers: {
        "Content-Type": vapiRes.headers.get("content-type") || "application/json; charset=utf-8",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[Vapi Proxy] Error connecting to Vapi API:", err);
    return new Response(
      JSON.stringify({
        error: "Vapi proxy error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (env && typeof env === "object") {
      const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
      if (!g.process) {
        g.process = { env: {} };
      }
      const targetEnv = g.process.env ?? (g.process.env = {});
      Object.assign(targetEnv, env as Record<string, string>);
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/vapi-tools")) {
      return await handleVapiToolCall(request);
    }
    if (url.pathname.startsWith("/api/voice-invoices")) {
      return await handleVoiceInvoiceApi(request);
    }
    if (url.pathname.startsWith("/api/vapi")) {
      return await handleVapiProxy(request, env);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      const errMsg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
      console.error(errMsg);
      return new Response(renderErrorPage() + `\n<!-- Catch SSR Error:\n${errMsg}\n-->`, {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-debug-error": encodeURIComponent(errMsg.slice(0, 300)),
        },
      });
    }
  },
};
