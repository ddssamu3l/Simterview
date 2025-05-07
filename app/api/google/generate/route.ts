"use server";
import { db } from "@/firebase/admin";
import { interviewGenerationExamples } from "@/public";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Google Generative AI client instance with API key from environment variables.
 */
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY });

/**
 * Generates a custom interview based on specified parameters.
 * Now uses a pre-populated question bank for technical questions to avoid timeouts.
 * 
 * @param {string} type - The type of interview ("behavioral" or "technical")
 * @param {string} role - The job role (e.g., "Software Engineer", "Product Manager")
 * @param {number} length - The interview duration in minutes
 * @param {string} difficulty - The difficulty level (e.g., "Intern", "Junior", "Senior")
 * @param {string|undefined} jobDescription - Optional job description to tailor questions
 * @param {string} uid - User ID of the creator
 * @returns {Promise<{success: boolean, id?: string, status: number, error?: any}>} 
 */
export async function generateCustomInterview(type: string, role: string, length: number, 
  difficulty: string, jobDescription: string | undefined, uid: string) {
  try {
    // Create new interview object with placeholder
    const newInterview: Record<string, any> = {
      type,
      name: `${role} interview`,
      difficulty,
      length,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    };

    // For behavioral interviews, generate questions using AI
    if (type === "behavioral") {
      const interviewGenerationPrompt =
        `Generate interview content for a ${difficulty} ${role} role (${length} min).` +
        (jobDescription ? ` Job description: ${jobDescription}` : "") +
        ` ROLE: Interview Q Gen. TYPE:"${type}". OUTPUT: Questions ONLY. Description summary (15 words MAX) also.` +
        interviewGenerationExamples;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: interviewGenerationPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description: "Brief description of interview contents (15 words MAX)",
              },
              questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "5-7 behavioral questions",
              },
            },
            required: ["description", "questions"],
          },
          temperature: 0.8,
        },
      });

      const data = JSON.parse(response.text!);
      newInterview.description = data.description;
      newInterview.questions = data.questions;
    } 
    // For technical interviews, use AI to determine question type and difficulty
    else {
      // Analyze job description for skills if provided
      const skills = jobDescription ? await analyzeJobDescription(jobDescription) : [];
      
      // First, determine the best question type and difficulty based on role and job description
      const questionTypeResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: `I need to select an appropriate technical interview question type and difficulty for a candidate.

Role: ${role}
Difficulty level selected: ${difficulty}
${jobDescription ? `Job Description: ${jobDescription}` : "No job description provided."}
${skills.length > 0 ? `Extracted Skills: ${skills.join(", ")}` : ""}

Based on this information, determine the most appropriate question type and difficulty level.
For question type, choose ONE from: algorithms, database, design
For difficulty, choose ONE from: easy, medium, hard

Consider the following:
- Software Engineers generally need algorithms questions
- Database Engineers need database questions
- System Architects need design questions
- The job description may indicate specific technical areas of focus
- Difficulty should match the role seniority but can be adjusted based on job requirements

Return ONLY a JSON with two fields: questionType and questionDifficulty`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["algorithms", "database", "design"],
                description: "The most appropriate question type"
              },
              questionDifficulty: {
                type: Type.STRING,
                enum: ["easy", "medium", "hard"],
                description: "The most appropriate difficulty level"
              },
              reasoning: {
                type: Type.STRING,
                description: "Brief explanation for the selection"
              }
            },
            required: ["questionType", "questionDifficulty", "reasoning"]
          },
          temperature: 0.3,
        },
      });
      
      const aiRecommendation = JSON.parse(questionTypeResponse.text!);
      
      // Use AI recommendation for question type
      const questionType = aiRecommendation.questionType;
      
      //const baseDifficulty = mapDifficultyLevel(difficulty);
      const questionDifficulty = aiRecommendation.questionDifficulty;
      
      // Add AI reasoning to the interview document
      newInterview.questionTypeReasoning = aiRecommendation.reasoning || `Selected ${questionType} (${questionDifficulty}) based on role and job requirements.`;
      
      // Fetch a random question from the question bank using AI-determined parameters
      const questionSnapshot = await fetchRandomQuestion(questionType, questionDifficulty);
      
      if (questionSnapshot.empty) {
        throw new Error(`No ${questionDifficulty} ${questionType} questions found in database`);
      }

      // Get a random document from the results
      const questions = questionSnapshot.docs;
      const randomIndex = Math.floor(Math.random() * questions.length);
      const questionDoc = questions[randomIndex];
      const questionId = questionDoc.id; // This is the problem ID (e.g., "1", "100", "1002")
      
      // Get the problem data from the selected document
      const problemData = questionDoc.data();
      
      // Generate a custom description with AI (fast operation)
      const descriptionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: `Write a brief description (15 words max) for a ${difficulty} ${role} technical interview focusing on ${questionType}.`,
        config: {
          maxOutputTokens: 30,
          temperature: 0.4,
        },
      });
      
      // Add question data to interview
      newInterview.description = descriptionResponse.text?.trim() || `${difficulty} ${role} ${questionType} interview`;
      newInterview.questions = [problemData.problemDescription || ""];
      newInterview.solution = problemData.editorialSolution || "";
      newInterview.problemId = questionId; // Store the problem ID for reference
      newInterview.questionType = questionType; // Store the question type
      newInterview.questionDifficulty = questionDifficulty; // Store the actual difficulty used
      
      // Track usage of this question (don't await to avoid slowing down response)
      trackQuestionUsage(questionType, questionDifficulty, questionId);
    }

    // Save to database
    const res = await db.collection("interviews").add(newInterview);
    console.log("New custom interview added: " + res.id);

    return { success: true, id: res.id, status: 200 };
  } catch(e) {
    console.error("Error generating custom interview: " + e);
    return { success: false, status: 500, error: e };
  }
}

/**
 * Tracks usage metrics for the questions to avoid overusing the same questions
 * @param questionType The type of question used
 * @param difficulty The difficulty level
 * @param problemId The specific problem ID that was used
 */
async function trackQuestionUsage(questionType: string, difficulty: string, problemId: string) {
  try {
    // Update usage counter in a "question_metrics" collection
    const metricRef = db.collection("question_metrics").doc(`${questionType}_${difficulty}_${problemId}`);
    
    // Use transaction to safely update the counter
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(metricRef);
      
      if (doc.exists) {
        // Increment usage count
        transaction.update(metricRef, {
          useCount: (doc.data()?.useCount || 0) + 1,
          lastUsed: new Date().toISOString()
        });
      } else {
        // Create new metric
        transaction.set(metricRef, {
          questionType,
          difficulty,
          problemId,
          useCount: 1,
          firstUsed: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        });
      }
    });
  } catch (error) {
    // Don't let metrics tracking failure affect the main function
    console.error("Failed to track question usage:", error);
  }
}

/**
 * Analyzes a job description to extract key technical skills.
 * This helps with matching appropriate question types.
 * @param jobDescription The job description text
 * @returns Array of technical skills
 */
async function analyzeJobDescription(jobDescription: string | undefined): Promise<string[]> {
  if (!jobDescription || jobDescription.trim() === "") {
    return [];
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: `Extract the key technical skills from this job description. Return only a JSON array of strings with the skill names.
      
Job Description: ${jobDescription}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of technical skills from the job description"
        },
        temperature: 0.2,
        maxOutputTokens: 100,
      },
    });
    
    if (!response.text || response.text.trim() === "") {
      console.log("Empty response from AI model when analyzing job description");
      return [];
    }
    
    try {
      // Added additional error handling around JSON parsing
      return JSON.parse(response.text) || [];
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.log("Raw response text:", response.text);
      return [];
    }
  } catch (error) {
    console.error("Error analyzing job description:", error);
    return [];
  }
}

/**
 * Fetches a random question from the question bank based on type and difficulty
 */
async function fetchRandomQuestion(questionType: string, difficulty: string) {
  // Navigate through the nested structure: questions → questionType → difficulty
  const snapshot = await db.collection("questions")
    .doc(questionType)
    .collection(difficulty)
    .get();
  
  return snapshot;
}