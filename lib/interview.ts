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

/**
 * Retrieves all public interviews created by "Simterview" and, if available,
 * enriches them with the user's feedback data (e.g., pass/fail status and 
 * feedback submission time). This function is used to show users which public
 * interviews they've attempted and their corresponding results.
 *
 * Public interviews are identified by the "createdBy" field set to "Simterview".
 * If the user has submitted feedback for a public interview, the corresponding 
 * interview object will be updated with the "passed" status and the "createdAt" 
 * timestamp from the feedback (replacing the original interview's createdAt).
 *
 * @param {string} userId - The ID of the user whose feedback history should be matched against public interviews.
 * @returns {Promise<InterviewResponse>} An object containing the enriched list of public interviews,
 *                                       or an error message if the operation fails.
 */
export async function getPublicInterviews(userId: string): Promise<InterviewResponse> {
  try {
    // 1. fetch all public interviews
    const interviewsSnap = await db
      .collection("interviews")
      .where("createdBy", "==", "Simterview")
      .get();

    if (interviewsSnap.empty) {
      return { success: true, data: [], status: 200 };
    }

    const interviews: Interview[] = interviewsSnap.docs.map(doc => ({
      ...(doc.data() as Omit<Interview, "id" | "passed">),
      id: doc.id,
      passed: undefined,       // placeholder
    }));

    // 2. fetch all feedbacks for this user
    const feedbacksSnap = await db
      .collection("feedbacks")
      .where("userId", "==", userId)
      .get();

    if (feedbacksSnap.empty) {
      // none of the public interviews have been attempted by this user
      return { success: true, data: interviews, status: 200 };
    }

    // 3. build map from interviewId → feedback
    const feedbackMap: Record<string, Feedback> = {};
    feedbacksSnap.docs.forEach(doc => {
      const fb = doc.data() as Feedback;
      feedbackMap[fb.interviewId] = {
        ...fb,
        id: doc.id,
      };
    });

    // 4. enrich each interview if there's feedback
    const result = interviews.map(iv => {
      const fb = feedbackMap[iv.id];
      if (!fb) {
        return iv;
      }
      return {
        ...iv,
        passed: fb.passed,
        createdAt: fb.createdAt, // overwrite with when user gave feedback
      };
    });

    console.log("Result" + result);

    return {
      success: true,
      data: result,
      status: 200,
    };
  } catch (err) {
    console.error(`Error in getPublicInterviews for user ${userId}:`, err);
    return {
      success: false,
      status: 500,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}