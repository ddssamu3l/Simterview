import { DeepgramError } from "@deepgram/sdk";
import { NextResponse } from "next/server";

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
