/**
 * Deepgram Nova-2 Speech-to-Text Server Engine
 * Provides ultra-fast, UK trade-optimized voice transcription.
 */

const UK_PLUMBING_KEYWORDS = [
  "boiler:2",
  "radiator:2",
  "TRV:2",
  "thermostatic radiator valve:2",
  "Worcester Bosch:2",
  "Vaillant:2",
  "Baxi:2",
  "Ideal:2",
  "Glow-worm:2",
  "stopcock:2",
  "unvented cylinder:2",
  "Megaflo:2",
  "immersion heater:2",
  "powerflush:2",
  "Saniflo:2",
  "macerator:2",
  "flue:2",
  "pressure relief valve:2",
  "PRV:2",
  "expansion vessel:2",
  "central heating:2",
  "heat exchanger:2",
  "condensate pipe:2",
  "gas safe:2",
  "call out:2",
  "emergency leak:2",
  "blocked drain:2",
];

export interface TranscribeResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: string;
}

export async function transcribeAudioBuffer(
  audioBuffer: Uint8Array | ArrayBuffer,
  mimeType = "audio/webm",
): Promise<TranscribeResult> {
  const apiKey =
    process.env["DEEPGRAM_API_KEY"] ||
    process.env["VITE_DEEPGRAM_API_KEY"] ||
    "074568ceb1140741097d232d140f1df611398d16";

  if (!apiKey) {
    return { success: false, error: "Deepgram API key is not configured." };
  }

  const params = new URLSearchParams({
    model: "nova-2",
    language: "en-GB",
    smart_format: "true",
    punctuate: "true",
    diarize: "false",
  });

  for (const kw of UK_PLUMBING_KEYWORDS) {
    params.append("keywords", kw);
  }

  const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: audioBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Deepgram] API error:", res.status, errText);
      return {
        success: false,
        error: `Deepgram error (${res.status}): ${errText || res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
          }>;
        }>;
      };
    };

    const bestAlt = data.results?.channels?.[0]?.alternatives?.[0];
    const transcript = bestAlt?.transcript?.trim() || "";
    const confidence = bestAlt?.confidence ?? 0;

    return {
      success: true,
      transcript,
      confidence,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Deepgram] Transcription exception:", msg);
    return { success: false, error: msg };
  }
}
