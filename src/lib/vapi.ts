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

/**
 * Deepgram Nova-2 STT configuration for Vapi dispatcher.
 * Boosts UK heating and plumbing terminology for accurate recognition.
 */
export const DEEPGRAM_TRANSCRIBER_CONFIG = {
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-GB",
    smartFormat: true,
    keywords: [
      "boiler:2",
      "radiator:2",
      "TRV:2",
      "Worcester Bosch:2",
      "Vaillant:2",
      "Baxi:2",
      "unvented cylinder:2",
      "Megaflo:2",
      "stopcock:2",
      "powerflush:2",
      "flue:2",
      "Saniflo:2",
    ],
  },
};
