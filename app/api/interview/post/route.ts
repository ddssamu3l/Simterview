"use server"
import { db } from "@/firebase/admin"

/**
 * Saves or updates interview feedback in Firestore.
 * 
 * This function checks if feedback for the given interview and user already exists.
 * If it does, the existing feedback is updated. If not, a new feedback record is created.
 * The feedback includes assessment of the interview performance, strengths, areas for
 * improvement, and an overall assessment.
 * 
 * @param {FeedbackForm} params - The feedback data object
 * @param {string} params.interviewId - ID of the interview
 * @param {string} params.userId - ID of the user who took the interview
 * @param {boolean} params.passed - Whether the user passed the interview
 * @param {string} params.strengths - Feedback on the user's strengths
 * @param {string} params.areasForImprovement - Feedback on areas where the user can improve
 * @param {string} params.finalAssessment - Overall assessment of the user's performance
 * @returns {Promise<{success: boolean, status: number}>} Result object with success flag and status code
 */
export async function saveInterviewFeedback({ interviewId, userId, passed, strengths, areasForImprovement, finalAssessment }: FeedbackForm){
  try{
    const feedbacksRef = db.collection('feedbacks');
    // check if a feedback already exists
    const snapshot = await feedbacksRef
      .where('userId', '==', userId)
      .where('interviewId', '==', interviewId)
      .get();

    if(!snapshot.empty){
      const docRef = snapshot.docs[0].ref;
      await docRef.update({ 
        passed: passed, 
        finalAssessment: finalAssessment,
        strengths: strengths,
        areasForImprovement: areasForImprovement,
        createdAt: new Date().toISOString() 
      });
      console.log(`Feedback updated successfully. interviewId: ${interviewId} userId: ${userId}`);
      return {success: true, status: 200};
    }

    const newFeedback: Feedback = {
      interviewId,
      userId,
      passed,
      strengths,
      areasForImprovement,
      finalAssessment,
      createdAt: new Date().toISOString(),
    };


    // if not, create a new feedback
    await feedbacksRef.add(newFeedback);
    return {success: true, status: 200};
  }catch(error){  
    console.error("Error saving interview feedback: " + JSON.stringify(error));
    return {success: false, status:500};
  }
}