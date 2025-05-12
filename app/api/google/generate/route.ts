/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { db } from "@/firebase/admin";
import { interviewGenerationExamples } from "@/public";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Google Generative AI client instance with API key from environment variables.
 */
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY });

/**
 * Generates a custom interview based on specified parameters using Google's Generative AI.
 * 
 * This function creates a tailored interview by generating questions based on the type,
 * role, difficulty level, and optional job description. For technical interviews,
 * it also generates a solution guide. The generated interview is stored in Firestore.
 * 
 * @param {string} type - The type of interview ("behavioral" or "technical")
 * @param {string} role - The job role (e.g., "Software Engineer", "Product Manager")
 * @param {number} length - The interview duration in minutes
 * @param {string} difficulty - The difficulty level (e.g., "Intern", "Junior", "Senior")
 * @param {string|undefined} jobDescription - Optional job description to tailor questions
 * @param {string} uid - User ID of the creator
 * @returns {Promise<{success: boolean, id?: string, status: number, error?: any}>} 
 *   Result object with success flag, interview ID (if successful), status code, and error (if any)
 */
export async function generateCustomInterview(type: string, role: string, length: number, difficulty: string, jobDescription: string | undefined, uid: string){
  try{
    const interviewGenerationPrompt =
      `Generate interview content for a ${difficulty} ${role} role (${length} min).` +
      (jobDescription ? ` Job description: ${jobDescription}` : "") +
      ` ROLE: Interview Q Gen. TYPE:"${type}". OUTPUT: Questions ONLY. Description summary (15 words MAX) also.` +
      interviewGenerationExamples;

    // Prepare dynamic schema
    const properties: Record<string, any> = {
      description: {
        type: Type.STRING,
        description: "Brief description of interview contents (15 words MAX)",
      },
      questions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Either 5-7 behavioral questions or 1 LeetCode problem description",
      },
    };

    const requiredFields = ["description", "questions"];

    // Only include solution for non-behavioral (technical) interviews
    if (type !== "behavioral") {
      properties.solution = {
        type: Type.STRING,
        description: "The solution guide for the chosen LeetCode problem. Required for technical interview.",
      };
      requiredFields.push("solution");
    }

    // Generate content
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: interviewGenerationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties,
          required: requiredFields,
        },
        temperature: 0.8,
        thinkingConfig: {
          thinkingBudget: 0, // thinking budget of 0 turns off the thinking mode
        },
      },
    });

    // go to firebase questions bank (500 questions), randomly select 1

    const data = JSON.parse(response.text!);
    
    // Build the interview object, including solution if it exists
    const newInterview: Record<string, any> = {
      type,
      name: `${role} interview`,
      difficulty,
      length,
      description: data.description,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      questions: data.questions,
      // spread in solution only when it's defined
      ...(data.solution !== undefined ? { solution: data.solution } : {}),
    };

    const res = await db.collection("interviews").add(newInterview);
    console.log("New custom interview added: " + res.id);

    return { success: true, id: res.id, status: 200 };
  }catch(e){
    console.error("Error generating custom interview instructions: " + e);
    return { success: false, status: 500, error: e };
  }
}
