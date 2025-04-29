"use server"
import { db } from "@/firebase/admin"

/**
 * Retrieves a specific feedback record by its document ID.
 * 
 * @param {string} id - The Firestore document ID of the feedback to retrieve
 * @returns {Promise<FeedbackResponse>} A response object containing:
 *   - success: boolean indicating if the operation succeeded
 *   - status: HTTP status code (200 for success, 500 for error)
 *   - data: The feedback document data if found
 *   - error: Error message if operation failed
 */
export async function getFeedback(id: string): Promise<FeedbackResponse>{
  try{
    const feedbacksSnapshot = await db.collection('feedbacks').doc(id).get();
    if (!feedbacksSnapshot.exists) {
      console.log("Error: interview with id: " + id + " is not found.");
      return { success: false, status: 500 };
    }
    console.log(feedbacksSnapshot.data());

    return {
      success: true,
      status: 200,
      data: feedbacksSnapshot!.data() as Feedback,
    }
  }catch(error){
    console.error(`Error fetching feedback: ${id}:`, error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Creates a new feedback record for a user-interview pair if one doesn't already exist.
 * 
 * This function checks if a feedback record already exists for the specified user and
 * interview. If not, it creates a new feedback record with default values.
 * 
 * @param {string} userId - The ID of the user taking the interview
 * @param {string} interviewId - The ID of the interview being taken
 * @returns {Promise<{success: boolean, status: number, error?: string}>} 
 *   - A response object with success status and error message if applicable
 */
export async function initializeFeedback(userId: string, interviewId: string){
  try{
    const feedbacksSnapshot = await db.collection('feedbacks')
      .where("userId", "==", userId)
      .where("interviewId", "==", interviewId)
      .get();
    
    // if we already have a feedback, then return back
    if(!feedbacksSnapshot.empty){
      return {success: true, status: 200}
    }

    // if there isn't a feedback already, then create a new one
    const newFeedback: Feedback = {
      userId,
      interviewId,
      passed: false,
      strengths: "No feedback available.",
      areasForImprovement: "No feedback available.",
      finalAssessment: "No feedback available.",
      createdAt: new Date().toISOString(),
    }
    await db.collection('feedbacks').add(newFeedback);

    return {success: true, status: 200};

  }catch(error){
    console.error(`Error initializing feedback for: ${interviewId}:`, error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : String(error)
    };
  } 
}