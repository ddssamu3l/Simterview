/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"
import { createClient } from '@deepgram/sdk';
const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);

export async function getDeepGramResponse(text: string) {
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-2-odysseus-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    const stream = await response.getStream();

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString("base64");

    return { success: true, status: 200, data: base64 };
  } catch (error) {
    console.error("Error getting DeepGram response:", error);
    return { success: false, status: 500, error };
  }
}
