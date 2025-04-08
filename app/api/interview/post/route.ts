"use server"
import { db } from "@/firebase/admin"

export async function saveInterviewFeedback({interviewId, userId, pass, feedback}: FeedbackProps){
  try{
    const feedbacksRef = db.collection('feedbacks');
    // check if a feedback already exists
    const snapshot = await feedbacksRef
      .where('userId', '==', userId)
      .where('interviewId', '==', interviewId)
      .get();

    if(!snapshot.empty){
      const docRef = snapshot.docs[0].ref;
      await docRef.update({ pass: pass, feedback: feedback });
      console.log(`Feedback updated successfully. interviewId: ${interviewId} userId: ${userId}`);
      return {success: true, status: 200};
    }

    // if not, create a new feedback
    feedbacksRef.add({interviewId: interviewId, userId: userId, pass: pass, feedback: feedback});
    return {success: true, status: 200};
  }catch(error){  
    console.error("Error saving interview feedback: " + JSON.stringify(error));
    return {success: false, status:500};
  }
}