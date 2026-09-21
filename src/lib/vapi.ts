/**
 * Vapi Voice AI Agent Configuration for RCH PlumbFlow.
 * Powers hands-free voice dispatching, customer intake, and on-site notes.
 */

import { createServerFn } from "@tanstack/react-start";

export const VAPI_PUBLIC_KEY = "a70bed79-7b94-4f27-8ad2-8aefe1f66b9a";

export const VAPI_ASSISTANT_ID = "f0084546-e569-4f0d-a3ab-534e616a7f03";

export interface VapiTranscriptMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
}

export type VapiCallStatus = "idle" | "loading" | "active" | "error";

export interface VapiWebCallSession {
  id: string;
  webCallUrl: string;
  status?: string;
  assistantId?: string;
  transport?: {
    callToken?: string;
    [key: string]: unknown;
  };
  artifactPlan?: {
    videoRecordingEnabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const createVapiWebCallSession = createServerFn({ method: "POST" })
  .validator((data?: { assistantId?: string }) => data)
  .handler(async ({ data }) => {
    const assistantId = data?.assistantId || VAPI_ASSISTANT_ID;
    const publicKey =
      (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.VITE_VAPI_PUBLIC_KEY ||
      VAPI_PUBLIC_KEY;

    const res = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicKey}`,
      },
      body: JSON.stringify({ assistantId }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create Vapi web call session (${res.status}): ${errText}`);
    }

    const session = (await res.json()) as VapiWebCallSession;
    return session;
  });

