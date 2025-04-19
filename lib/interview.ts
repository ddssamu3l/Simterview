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

    const { difficulty, length, questions, type, createdBy } = interviewSnapshot.data() as {
      difficulty: string;
      length: number,
      questions: string[];
      type: string;
      createdBy: string;
    };

    return { success: true, status: 200, data: { difficulty, length, questions, type, createdBy } };
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
    // 1. Fetch feedbacks for this user, ordered by createdAt descending
    const feedbacksSnapshot = await db
      .collection("feedbacks")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    if (feedbacksSnapshot.empty) {
      return { success: true, data: [], status: 200 };
    }

    // 2. Extract feedback info in sorted order
    const feedbacksData = feedbacksSnapshot.docs.map(doc => {
      const feedback = doc.data() as Feedback;
      return {
        feedbackId: doc.id,
        interviewId: feedback.interviewId,
        passed: feedback.passed,
      };
    });
    const interviewIds = feedbacksData.map(f => f.interviewId);

    // 3. Batch‐fetch the interviews (Firestore 'in' limit is 10 per query)
    const BATCH_SIZE = 10;
    const batchPromises: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
    for (let i = 0; i < interviewIds.length; i += BATCH_SIZE) {
      const batchIds = interviewIds.slice(i, i + BATCH_SIZE);
      batchPromises.push(
        db
          .collection("interviews")
          .where(FieldPath.documentId(), "in", batchIds)
          .get()
      );
    }
    const snapshots = await Promise.all(batchPromises);
    const interviewDocs = snapshots.flatMap(snap => snap.docs);

    // 4. Build a map of interviewId → interview data
    const interviewDataMap: Record<string, Interview> = {};
    interviewDocs.forEach(doc => {
      interviewDataMap[doc.id] = doc.data() as Interview;
    });

    // 5. Combine in the same order as feedbacks (most recent first)
    const combinedResults: CombinedResult[] = feedbacksData.map(
      ({ feedbackId, interviewId, passed }) => {
        const interview = interviewDataMap[interviewId];
        return {
          ...interview,
          id: feedbackId,
          passed,
        };
      }
    );

    return {
      success: true,
      data: combinedResults,
      status: 200,
    };
  } catch (error) {
    console.error(`Error fetching interviews for user ${userId}:`, error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}