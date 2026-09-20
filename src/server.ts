import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
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
