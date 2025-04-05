"use server";
import { db } from "@/firebase/admin";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY });

export async function generateCustomInterview(type: string, role: string, length: number, difficulty: string, jobDescription: string | undefined, uid: string){
  try{
    // generate the questions, techstacks, and description
    const interviewGenerationPrompt = `Generate interview content for a ${difficulty} ${role} role (${length} min).

      ${jobDescription ? "Job description: " + jobDescription : ""}

      IMPORTANT: Interview type is "${type}". Generate ONLY questions for this type.

      If "behavioral":
      - Provide EXACTLY 5-7 behavioral questions covering: personal background, teamwork, problem-solving, leadership, adaptability.
      - DO NOT include coding/technical algorithm questions.
      - Provide a mix of generic/standard questions as well as some nuanced questions.
      - If a job description is provided, extract 1-2 key technologies (techStack).
      - Behavioral questions are going to be read by a voice assisrtant so do not use '/' or '*' or any characters that will break text-to-speech algorithms.

      If "technical":
      - Find 5 LeetCode problems suited to difficulty:
        * Beginner: LeetCode easy difficulty
        * Intern: easier medium
        * Junior/New Grad: standard medium
        * Mid Level: harder medium
        * Senior: hard
      - Include ONLY the problem number. e.g ["15", "24", "39", "139", "237"]
      - DO NOT include any behavioral questions."
      `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: interviewGenerationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "Brief interview summary (15 words max)",
            },
            techStack: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of up to 2 key technologies (empty for technical interviews or behavioral interviews with no job descriptions)",
            },
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Either 5-7 behavioral questions or 5 LeetCode problem numbers",
            },
          },
          required: ["description", "techStack", "questions"],
        },
        temperature: 1,
      },
    });
    const data = JSON.parse(response.text!);
    
    const newInterview = {
      type: type,
      name: role + " interview",
      difficulty: difficulty,
      length: length,
      description: data.description,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      questions: data.questions,
      techStack: data.techStack,
    }

    const res = await db.collection("interviews").add(newInterview);
    console.log("New custom interview added: " + res.id);

    return { success: true, id: res.id, status: 200 };
  }catch(e){
    console.error("Error generating custom interview instructions: " + e);
    return { success: false, status: 500, error: e };
  }
}
