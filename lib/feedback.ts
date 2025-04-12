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