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
 * Generates a custom interview based on specified parameters using Google's Generative AI and Firestore.
 *
 * This function:
 * 1. Asks Gemini to select a relevant LeetCode-style problem ID based on the role, type, difficulty, and job description.
 * 2. Determines the correct question category (algorithms, database, design) and difficulty (easy, medium, hard).
 * 3. Fetches the corresponding question and solution from Firestore.
 * 4. Builds and stores a new interview document in Firestore.
 *
 * @param {string} type - The type/category of interview (e.g., "algorithm", "database", "design", "behavioral")
 * @param {string} role - The job role (e.g., "Software Engineer", "Product Manager")
 * @param {number} length - The interview duration in minutes
 * @param {string} difficulty - The difficulty level (e.g., "Intern", "Junior", "Senior")
 * @param {string|undefined} jobDescription - Optional job description to tailor questions
 * @param {string} uid - User ID of the creator
 * @returns {Promise<{success: boolean, id?: string, status: number, error?: any}>}
 *   Result object with success flag, interview ID (if successful), status code, and error (if any)
 */
export async function generateCustomInterview(
  type: string,
  role: string,
  length: number,
  difficulty: string,
  jobDescription: string | undefined,
  uid: string
) {
  try {
    // Step 1: Ask Gemini to choose a relevant category and LeetCode-style problem ID
    // The prompt instructs Gemini to return a JSON object with category and problemId, using the mapped difficulty
    const mappedDifficulty = mapDifficulty(difficulty);
    const idPrompt = `
You are an AI interview assistant. Based on the role and job jobDescription, select:\n- The best matching category (algorithms, database, or design)\n- A LeetCode problem ID that exists in that category and the specified difficulty\n\nThe difficulty is: ${mappedDifficulty}\n\nRespond ONLY in this JSON format:\n{"category": "<category>", "problemId": "<problemId>"}\n\nRole: ${role}\n${jobDescription ? `Job Description: ${jobDescription}` : ""}`;

    const idResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: idPrompt,
    });

    // Log the raw Gemini response for debugging
    console.log("Gemini response:", idResponse.text);

    // Clean Gemini's response: remove code block markers and trim whitespace
    let rawText = idResponse.text || "";
    rawText = rawText.replace(/```json|```/g, "").trim();

    let category = "algorithms";
    let problemId = "";
    try {
      const parsed = JSON.parse(rawText);
      category = parsed.category?.toLowerCase() || "algorithms";
      // Extract only the first number (LeetCode ID) from the problemId string
      const match = parsed.problemId?.match(/\d+/);
      problemId = match ? match[0] : "";
    } catch (err) {
      throw new Error("Gemini did not return a valid JSON with category and problemId");
    }

    if (!problemId) {
      throw new Error("Gemini did not return a valid problem ID");
    }

    // Step 2: Fetch the question data from Firebase
    // Use mapped difficulty for Firestore path
    const questionPath = `questions/${category}/${mappedDifficulty}/${problemId}`;
    console.log("Fetching question from Firestore path:", questionPath);
    // Reference the correct Firestore document
    const questionRef = db
      .collection("questions")
      .doc(category)
      .collection(mappedDifficulty)
      .doc(problemId);

    const questionSnap = await questionRef.get();

    if (!questionSnap.exists) {
      throw new Error(`Question ID ${problemId} not found in Firebase`);
    }

    // Extract question description and editorial (solution)
    const questionData = questionSnap.data();
    const description = questionData?.description;
    const editorial = questionData?.editorial;

    // Ensure required data is present
    if (!description || (!editorial && type !== "behavioral")) {
      throw new Error("Missing question description or solution");
    }

    // Step 3: Build the interview object to store in Firestore
    const newInterview: Record<string, any> = {
      type,
      name: `${role} interview`,
      difficulty,
      length,
      description: jobDescription || `Generated ${type} interview for ${role} (Problem ID: ${problemId})`,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      questions: [description],
      // Only include solution for non-behavioral interviews
      ...(type !== "behavioral" ? { solution: editorial } : {}),
    };

    // Store the new interview in Firestore
    const res = await db.collection("interviews").add(newInterview);
    console.log("New custom interview added: " + res.id);

    return { success: true, id: res.id, status: 200 };
  } catch (e) {
    // Log and return error details
    console.error("Error generating custom interview: ", e);
    return { success: false, status: 500, error: e };
  }
}

/**
 * Maps user-friendly difficulty levels to Firestore subcollections.
 * e.g., "intern", "junior" => "easy"; "mid" => "medium"; "senior", "lead", "staff" => "hard"
 * @param {string} difficulty - The difficulty string from the user
 * @returns {string} - The mapped Firestore difficulty level
 */
function mapDifficulty(difficulty: string): string {
  const mapping: Record<string, string> = {
    "intern": "easy",
    "junior/new grad": "easy",
    "mid level": "medium",
    "senior": "hard",
  };

  return mapping[difficulty.toLowerCase()] || "easy"; // default fallback
}
