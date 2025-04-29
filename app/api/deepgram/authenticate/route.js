import { DeepgramError } from "@deepgram/sdk";
import { NextResponse } from "next/server";

/**
 * API route handler for retrieving the Deepgram API key.
 * 
 * This endpoint provides the Deepgram API key from environment variables
 * to the client-side application, enabling authentication with Deepgram's
 * speech-to-speech API.
 * 
 * @returns {Promise<NextResponse>} JSON response containing either:
 *   - On success: The Deepgram API key as { key: string }
 *   - On error: A DeepgramError if the API key is not set in environment variables
 */
export async function POST() {
  // Always use the provided API key
  return NextResponse.json(
    process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
      ? { key: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY }
      : new DeepgramError(
          "Can't do local development without setting a `NEXT_PUBLIC_DEEPGRAM_API_KEY` environment variable.",
        ),
  );
}
