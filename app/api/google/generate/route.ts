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
  
  console.log(`\n=== STARTING INTERVIEW GENERATION ===`);
  console.log(` Request params: type=${type}, role=${role}, length=${length}min, difficulty=${difficulty}`);
  console.log(` User ID: ${uid}`);
  console.log(` Job description provided: ${jobDescription ? 'Yes' : 'No'}`);
  
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
    
    console.log(` ${new Date().toLocaleTimeString()} - Created base interview object`);

    // For behavioral interviews, generate questions using AI
    if (type === "behavioral") {
      console.log(` Processing BEHAVIORAL interview request`);
      
      const interviewGenerationPrompt =
        `Generate interview content for a ${difficulty} ${role} role (${length} min).` +
        (jobDescription ? ` Job description: ${jobDescription}` : "") +
        ` ROLE: Interview Q Gen. TYPE:"${type}". OUTPUT: Questions ONLY. Description summary (15 words MAX) also.` +
        interviewGenerationExamples;
      
      console.log(` ${new Date().toLocaleTimeString()} - Sending prompt to Gemini AI`);
      console.log(` Prompt length: ${interviewGenerationPrompt.length} characters`);

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
      
      console.log(` ${new Date().toLocaleTimeString()} - Received AI response`);

      try {
        const data = JSON.parse(response.text!);
        console.log(`Successfully parsed AI response`);
        console.log(` Interview description: "${data.description}"`);
        console.log(` Generated ${data.questions.length} questions`);
        
        newInterview.description = data.description;
        newInterview.questions = data.questions;
      } catch (parseError) {
        console.error(` Failed to parse AI response: ${parseError}`);
        console.log(` Raw response: ${response.text?.substring(0, 200)}...`);
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }
    } 
    // For technical interviews, use AI to determine question type and difficulty
    else {
      console.log(` Processing TECHNICAL interview request`);
      
      // Analyze job description for skills if provided
      console.log(` ${new Date().toLocaleTimeString()} - Analyzing job description for skills`);
      const skills = jobDescription ? await analyzeJobDescription(jobDescription) : [];
      console.log(` Extracted skills: ${skills.length > 0 ? skills.join(", ") : "None"}`);
      
      // First, determine the best question type and difficulty based on role and job description
      console.log(` ${new Date().toLocaleTimeString()} - Determining appropriate question type`);
      
      const questionTypePrompt = `I need to select an appropriate leetcode question type and difficulty for a candidate.

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

        Return ONLY a JSON with two fields: questionType and questionDifficulty`;
      
      console.log(` Question type prompt length: ${questionTypePrompt.length} characters`);
      
      const questionTypeResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: questionTypePrompt,
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
      
      console.log(` ${new Date().toLocaleTimeString()} - Received question type recommendation`);
      
      try {
        const aiRecommendation = JSON.parse(questionTypeResponse.text!);
        console.log(` AI recommended: questionType=${aiRecommendation.questionType}, difficulty=${aiRecommendation.questionDifficulty}`);
        console.log(` Reasoning: ${aiRecommendation.reasoning}`);
        
        // Use AI recommendation for question type
        const questionType = aiRecommendation.questionType;
        const questionDifficulty = aiRecommendation.questionDifficulty;
        
        // Fetch a random question from the question bank using AI-determined parameters
        console.log(` ${new Date().toLocaleTimeString()} - Fetching random ${questionDifficulty} ${questionType} question from database`);
        const questionSnapshot = await fetchRandomQuestion(questionType, questionDifficulty);
        
        if (questionSnapshot.empty) {
          console.error(` No ${questionDifficulty} ${questionType} questions found in database`);
          throw new Error(`No ${questionDifficulty} ${questionType} questions found in database`);
        }

        // Get a random document from the results
        const questions = questionSnapshot.docs;
        console.log(` Found ${questions.length} matching questions in database`);
        
        const randomIndex = Math.floor(Math.random() * questions.length);
        const questionDoc = questions[randomIndex];
        const questionId = questionDoc.id; // This is the problem ID (e.g., "1", "100", "1002")
        console.log(` Randomly selected question ID: ${questionId}`);
        
        // Get the problem data from the selected document
        const problemData = questionDoc.data();
        console.log(` Retrieved problem data with keys: ${Object.keys(problemData).join(', ')}`);
        
        // Ensure we have the required fields
        if (!problemData.description) {
          console.error(` Question ${questionId} is missing description field`);
          throw new Error(`Selected question is missing required field: description`);
        }
        
        // Generate a custom description with AI (fast operation)
        console.log(` ${new Date().toLocaleTimeString()} - Generating interview description`);
        const descriptionResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: `Write a brief description (15 words max) for a ${difficulty} ${role} technical interview focusing on ${questionType}.`,
          config: {
            maxOutputTokens: 30,
            temperature: 0.4,
          },
        });
        
        // Add question data to interview
        const interviewDescription = descriptionResponse.text?.trim() || `${difficulty} ${role} ${questionType} interview`;
        console.log(` Generated description: "${interviewDescription}"`);
        
        // Set the required fields in the interview object
        newInterview.description = interviewDescription;
        newInterview.questions = [problemData.description]; // Ensure it's an array as expected by the original code
        
        // Add solution if available, or use an empty string as fallback
        if (problemData.editorial) {
          newInterview.editorial = problemData.editorial;
          console.log(` Solution found, length: ${newInterview.editorial.length} characters`);
        } else {
          console.log(` No solution found in database, using empty string`);
          newInterview.editorial = "";
        }
        
        // Add additional metadata that might be useful
        newInterview.problemId = questionId;
        newInterview.questionType = questionType;
        newInterview.questionDifficulty = questionDifficulty;
        
        console.log(` Question length: ${newInterview.questions[0].length} characters`);
      } catch (parseError) {
        console.error(` Error processing technical interview: ${parseError}`);
        console.log(` Raw AI response: ${questionTypeResponse.text?.substring(0, 200)}...`);
        throw new Error(`Error processing technical interview: ${parseError}`);
      }
    }

    // Save to database
    console.log(` ${new Date().toLocaleTimeString()} - Saving interview to database`);
    const res = await db.collection("interviews").add(newInterview);
    console.log(` New interview saved successfully with ID: ${res.id}`);
    console.log(`=== INTERVIEW GENERATION COMPLETE ===\n`);

    return { success: true, id: res.id, status: 200 };
  } catch(e) {
    console.error(` ERROR GENERATING INTERVIEW: ${e}`);
    console.log(`=== INTERVIEW GENERATION FAILED ===\n`);
    return { success: false, status: 500, error: e };
  }
}


/**
 * Analyzes a job description to extract key technical skills.
 * This helps with matching appropriate question types.
 * @param jobDescription The job description text
 * @returns Array of technical skills
 */
async function analyzeJobDescription(jobDescription: string | undefined): Promise<string[]> {
  console.log(`\n--- ANALYZING JOB DESCRIPTION ---`);
  console.log(` Job description length: ${jobDescription?.length || 0} characters`);
  
  if (!jobDescription || jobDescription.trim() === "") {
    console.log(` Empty job description, returning empty skills array`);
    console.log(`--- ANALYSIS COMPLETE ---\n`);
    return [];
  }
  
  try {
    // Improved prompt with clearer instructions and examples
    const extractPrompt = `
    Extract the key technical skills from this job description.
    Focus on programming languages, frameworks, technologies, tools, and specific domains.
    Return ONLY a JSON array of strings with the skill names. For example: ["JavaScript", "React", "CI/CD", "Cloud Computing"]
    
    Job Description: ${jobDescription}`;
      
    console.log(` ${new Date().toLocaleTimeString()} - Sending job description to AI for skill extraction`);
    
    // First try with responseSchema approach
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: extractPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of technical skills from the job description"
          },
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      });
      
      console.log(` ${new Date().toLocaleTimeString()} - Received AI response for skills`);
      
      if (response.text && response.text.trim() !== "") {
        try {
          const skills = JSON.parse(response.text);
          if (Array.isArray(skills) && skills.length > 0) {
            console.log(` Successfully extracted ${skills.length} skills: ${skills.join(", ")}`);
            console.log(`--- ANALYSIS COMPLETE ---\n`);
            return skills;
          } else {
            console.log(`Retrieved empty skills array, trying fallback method`);
          }
        } catch (parseError) {
          console.log(` Failed to parse skills as JSON array, trying fallback method`);
          console.log(` Raw response text: ${response.text.substring(0, 100)}...`);
        }
      } else {
        console.log(` Empty response from AI model, trying fallback method`);
      }
    } catch (primaryError) {
      console.log(`Primary extraction method failed: ${primaryError}, trying fallback method`);
    }
    
    // Fallback method: use free-form text extraction and process manually
    console.log(`${new Date().toLocaleTimeString()} - Trying fallback extraction method`);
    const fallbackPrompt = `
    From this job description, list ONLY the technical skills required (programming languages, frameworks, technologies, databases, etc.)
    Format your response as a simple comma-separated list without explanations or other text.
    Example response: "JavaScript, React, Node.js, AWS, SQL"
    
    Job Description: ${jobDescription}`;
    
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: fallbackPrompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 256,
      }
    });
    
    if (!fallbackResponse.text || fallbackResponse.text.trim() === "") {
      console.log(`Fallback method also returned empty response`);
      console.log(`--- ANALYSIS COMPLETE WITH DEFAULT SKILLS ---\n`);
      
      // Return common software engineering skills as default
      const defaultSkills = ["JavaScript", "Python", "Java", "Data Structures", "Algorithms"];
      console.log(`Using default skills: ${defaultSkills.join(", ")}`);
      return defaultSkills;
    }
    
    // Process the comma-separated list into an array
    const cleanText = fallbackResponse.text.trim();
    console.log(`Raw skills text: "${cleanText.substring(0, 100)}${cleanText.length > 100 ? '...' : ''}"`);
    
    // Split by commas, clean up each skill, and filter out empty items
    const skills = cleanText
      .split(/,|;|\n/)
      .map(skill => skill.trim().replace(/^[•\-\*\s]+|[\.:\s]+$/g, ''))
      .filter(skill => skill.length > 0 && skill.length < 50); // Filter out empty or overly long items
    
    console.log(`Successfully extracted ${skills.length} skills via fallback method: ${skills.join(", ")}`);
    console.log(`--- ANALYSIS COMPLETE ---\n`);
    return skills;
    
  } catch (error) {
    console.error(`Error during job description analysis: ${error}`);
    console.log(`--- ANALYSIS FAILED, USING DEFAULT SKILLS ---\n`);
    
    // Return common software engineering skills as default
    const defaultSkills = ["JavaScript", "Python", "Java", "Data Structures", "Algorithms"];
    console.log(` Using default skills: ${defaultSkills.join(", ")}`);
    return defaultSkills;
  }
}

/**
 * Fetches a random question from the question bank based on type and difficulty
 */
async function fetchRandomQuestion(questionType: string, difficulty: string) {
  console.log(`\n--- FETCHING QUESTION FROM DATABASE ---`);
  console.log(`Querying: questions/${questionType}/${difficulty}`);
  
  try {
    // Navigate through the nested structure: questions → questionType → difficulty
    const snapshot = await db.collection("questions")
      .doc(questionType)
      .collection(difficulty)
      .get();
    
    console.log(`Query returned ${snapshot.size} documents`);
    console.log(`--- DATABASE QUERY COMPLETE ---\n`);
    return snapshot;
  } catch (error) {
    console.error(`Database query error: ${error}`);
    console.log(`--- DATABASE QUERY FAILED ---\n`);
    throw error;
  }
}