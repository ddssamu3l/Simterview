"use server"
import { db } from "@/firebase/admin"
import { FieldPath } from "firebase-admin/firestore";

export async function getInterview(interviewId: string) {
  try {
    const interviewSnapshot = await db.collection('interviews').doc(interviewId).get();
    if (!interviewSnapshot.exists) {
      console.log("Error: interview with id: " + interviewId + " is not found.");
      return { success: false, status: 500 };
    }
    console.log(interviewSnapshot.data());

    const { length, questions, type, createdBy } = interviewSnapshot.data() as {
      length: number,
      questions: string[];
      type: string;
      createdBy: string;
    };

    return { success: true, status: 200, data: { length, questions, type, createdBy } };
  } catch (error) {
    console.error("Error fetching interview details: " + error);
    return { success: false, status: 500 }
  }
}

/**
 * Gets all feedback objects for a user and enriches them with interview data
 * @param {string} userId - The ID of the user to get feedbacks for
 * @returns {Promise<FeedbackResponse>}
 */
export async function getUserInterviewFeedbacks(userId: string): Promise<InterviewFeedbackResponse> {
  try {
    // 1. Get all feedback documents for this user
    const userFeedbacksSnapshot = await db
      .collection("feedbacks")
      .where("userId", "==", userId)
      .get();

    // If no feedbacks found, return empty array
    if (userFeedbacksSnapshot.empty) {
      return { success: true, data: [], status: 200 };
    }

    // 2. Extract feedback IDs and interviewIDs
    const feedbacksData: { feedbackId: string; interviewId: string; passed: boolean }[] = [];
    const interviewIds: string[] = [];

    userFeedbacksSnapshot.forEach(doc => {
      const feedback = doc.data() as Feedback;
      feedbacksData.push({
        feedbackId: doc.id,
        interviewId: feedback.interviewId,
        passed: feedback.passed, // Ensure this matches your field name in Firestore
      });
      interviewIds.push(feedback.interviewId);
    });

    // Create a mapping from interviewId to feedbackId
    const interviewToFeedbackMap: Record<string, { id: string, passed: boolean }> = {};
    feedbacksData.forEach(item => {
      // Initialize the object first
      interviewToFeedbackMap[item.interviewId] = {
        id: item.feedbackId,
        passed: item.passed
      };
    });

    // 3. Get the matching interviews in batches (Firestore has a limit of 10 'in' clauses)
    const combinedResults: CombinedResult[] = [];

    for (let i = 0; i < interviewIds.length; i += 10) {
      const batchIds = interviewIds.slice(i, i + 10);

      // Skip empty batches
      if (batchIds.length === 0) continue;

      const interviewsSnapshot = await db
        .collection("interviews")
        .where(FieldPath.documentId(), "in", batchIds)
        .get();

      // Combine interview data with corresponding feedback id
      interviewsSnapshot.forEach(doc => {
        const interviewId = doc.id;
        const interviewData = doc.data() as Interview;
        const feedbackInfo = interviewToFeedbackMap[interviewId];

        if (feedbackInfo) {
          combinedResults.push({
            ...interviewData,
            id: feedbackInfo.id, // Use the feedback's id as the id
            passed: feedbackInfo.passed,
          });
        }
      });
    }

    return {
      success: true,
      data: combinedResults,
      status: 200
    };

  } catch (error) {
    console.error(`Error fetching interviews for user ${userId}:`, error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}