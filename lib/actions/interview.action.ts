"use server"
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function generateInterviewDetails(interviewGenerationPrompt: string): Promise<string | undefined> {
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash", // make sure this model exists in the SDK
    contents: interviewGenerationPrompt,
  });

  return result.text;
}