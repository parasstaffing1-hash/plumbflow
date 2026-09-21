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
    conversationType?: string;
  };
  artifactPlan?: {
    videoRecordingEnabled?: boolean;
  };
}

export const createVapiWebCallSession = createServerFn({ method: "POST" })
  .validator((data?: { assistantId?: string }) => data)
  .handler(async ({ data }): Promise<VapiWebCallSession> => {
    const assistantId = data?.assistantId || VAPI_ASSISTANT_ID;
    const envSource = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env;
    const publicKey = (envSource ? envSource["VITE_VAPI_PUBLIC_KEY"] : undefined) || VAPI_PUBLIC_KEY;

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
      try {
        const parsed = JSON.parse(errText) as { message?: string; error?: string };
        if (
          parsed?.message?.toLowerCase().includes("concurrency") ||
          parsed?.error?.toLowerCase().includes("concurrency") ||
          errText.toLowerCase().includes("concurrency")
        ) {
          throw new Error("Dave is currently wrapping up a previous voice call. Please wait 15 seconds and retry.");
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.includes("Dave is currently wrapping up")) {
          throw parseErr;
        }
      }
      throw new Error(`Voice server error (${res.status}): ${errText}`);
    }

    const session = (await res.json()) as VapiWebCallSession;
    return session;
  });

