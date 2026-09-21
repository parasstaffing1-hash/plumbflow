import { createServerFn } from "@tanstack/react-start";
import { transcribeAudioBuffer, type TranscribeResult } from "@/server/deepgram";

export interface TranscribeRequest {
  audioBase64: string;
  mimeType: string;
}

/**
 * Server function to transcribe audio using Deepgram Nova-2 speech-to-text.
 */
export const requestDeepgramTranscription = createServerFn({ method: "POST" })
  .validator((data: TranscribeRequest) => data)
  .handler(async ({ data }): Promise<TranscribeResult> => {
    try {
      const { audioBase64, mimeType } = data;
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return await transcribeAudioBuffer(bytes, mimeType);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

/**
 * Client helper to transcribe a recorded Audio Blob directly via Deepgram.
 */
export async function transcribeBlobWithDeepgram(blob: Blob): Promise<TranscribeResult> {
  const mimeType = blob.type || "audio/webm";
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binaryString = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const audioBase64 = btoa(binaryString);

  return await requestDeepgramTranscription({
    data: {
      audioBase64,
      mimeType,
    },
  });
}
