"use server"

import { db } from "@/firebase/admin"

export async function getInterview(interviewId: string){
  try{
    const interviewSnapshot = await db.collection('interviews').doc(interviewId).get();
    if (!interviewSnapshot.exists){
      console.log("Error: interview with id: " + interviewId + " is not found.");
      return {success: false, status: 500};
    }
    console.log(interviewSnapshot.data());

    const { length, questions, type } = interviewSnapshot.data() as {
      length: number,
      questions: string[];
      type: string;
    };
    
    return { success: true, status: 200, data: {length, questions, type} };
  }catch(error){
    console.error("Error fetching interview details: " + error);
    return { success: false, status: 500 }
  }
}