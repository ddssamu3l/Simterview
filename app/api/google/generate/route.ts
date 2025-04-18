"use server";
import { db } from "@/firebase/admin";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY });

export async function generateCustomInterview(type: string, role: string, length: number, difficulty: string, jobDescription: string | undefined, uid: string){
  try{
    // generate the questions, and description
    const interviewGenerationPrompt = `Generate interview content for a ${difficulty} ${role} role (${length} min).

      ${jobDescription ? "Job description: " + jobDescription : ""}

      ROLE: Interview Q Gen. TYPE:"${type}". OUTPUT: Questions ONLY. Description summary (15 words MAX) also.

      IF TYPE="behavioral":
        GEN 5-7 Qs: background, teamwork, problem-solving, leadership, adaptability. NO code/algo Qs.
        1st Q: Self-intro.
        Mix generic/nuanced Qs. Tailor to job desc (if avail).
        TXT2SPEECH safe: NO / * or special chars.

      IF TYPE="technical":
        FIND 1 LeetCode (NOT well-known, trivial, or Blind 75). DIFF based on role:
          Beginner: Easy
          Intern/New Grad/Junior: Med
          Mid: Harder Med
          Senior: Hard
        SOLE PURPOSE: Write the problem description and 2-3 input+output examples in VALID HTML code. OUTPUT: HTML ONLY. NO extra text, explanations, etc. Use <pre><code> tags for multi-line code. NO behavioral Qs.
        HTML FORMAT EXAMPLE:
        <p><strong>Problem Description:</strong></p> <p>Given an <code>m x n</code> 2D binary grid <code>grid</code> which represents a map of <code>'1'</code>s (land) and <code>'0'</code>s (water), return the number of islands.</p> <p>An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.</p> <p><strong>Constraints:</strong></p> <ul> <li><code>m == grid.length</code></li> <li><code>n == grid[i].length</code></li> <li><code>1 <= m, n <= 300</code></li> <li><code>grid[i][j]</code> is <code>'0'</code> or <code>'1'</code>.</li> </ul> <p><strong>Example 1:</strong></p> <pre><code> Input: grid = [ ["1","1","1","1","0"], ["1","1","0","1","0"], ["1","1","0","0","0"], ["0","0","0","0","0"] ] Output: 1 </code></pre> <p><strong>Explanation:</strong> There is one island (i.e., one group of connected 1s).</p> <p><strong>Example 2:</strong></p> <pre><code> Input: grid = [ ["1","1","0","0","0"], ["1","1","0","0","0"], ["0","0","1","0","0"], ["0","0","0","1","1"] ] Output: 3 </code></pre> <p><strong>Explanation:</strong> There are three islands.</p>
      ADD description: STRING, 15 words MAX. #Brief interview summary
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
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
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Either 5-7 behavioral questions or 1 LeetCode problem description",
            },
          },
          required: ["description", "questions"],
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
    }

    const res = await db.collection("interviews").add(newInterview);
    console.log("New custom interview added: " + res.id);

    return { success: true, id: res.id, status: 200 };
  }catch(e){
    console.error("Error generating custom interview instructions: " + e);
    return { success: false, status: 500, error: e };
  }
}
