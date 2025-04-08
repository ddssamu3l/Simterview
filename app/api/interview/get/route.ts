"use server"
import { db } from "@/firebase/admin"
import { FieldPath } from "firebase-admin/firestore";

interface Feedback {
  interviewId: string;
  pass: boolean;
}

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

export async function getInterviewsOfUser(userId: string) {
  try {
    const userFeedbacksSnapshot = await db
      .collection("feedbacks")
      .where("userId", "==", userId)
      .get();

    const feedbacks = userFeedbacksSnapshot.docs.map(doc => doc.data() as Feedback);

    // Declare feedbackMap with key type string and value type boolean.
    const feedbackMap: Record<string, boolean> = {};
    feedbacks.forEach(feedback => {
      feedbackMap[feedback.interviewId] = feedback.pass;
    });

    const interviewIds = Array.from(new Set(feedbacks.map(fb => fb.interviewId)));

    const interviewsSnapshot = await db
      .collection("interviews")
      .where(FieldPath.documentId(), "in", interviewIds)
      .get();

    const combinedInterviews = interviewsSnapshot.docs.map(doc => {
      const interviewData = doc.data();
      return { id: doc.id, ...interviewData, pass: feedbackMap[doc.id] };
    });

    console.log("Combined Interviews:", combinedInterviews);
    return { success: true, data: combinedInterviews };
  } catch (error) {
    console.error("Error fetching interviews of user " + userId + ": " + error);
    return { status: 200, success: false };
  }
}