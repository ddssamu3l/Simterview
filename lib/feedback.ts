"use server"
import { db } from "@/firebase/admin"

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