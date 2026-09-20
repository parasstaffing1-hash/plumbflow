/**
 * Vapi Voice AI Agent Configuration for RCH PlumbFlow.
 * Powers hands-free voice dispatching, customer intake, and on-site notes.
 */

export const VAPI_PUBLIC_KEY = "a70bed79-7b94-4f27-8ad2-8aefe1f66b9a";

export const VAPI_ASSISTANT_ID = "f0084546-e569-4f0d-a3ab-534e616a7f03";

export interface VapiTranscriptMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
}

export type VapiCallStatus = "idle" | "loading" | "active" | "error";
