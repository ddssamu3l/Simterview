"use client"
import FeedbackCard from '@/components/FeedbackCard';
import { getFeedback } from '@/lib/feedback';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

export default function Page() {
  const params = useParams<{id: string}>();
  const [feedback, setFeedback] = useState<Feedback>();

  useEffect(() => {
    try{
      async function fetchFeedback(){
        const response = await getFeedback(params.id);
        setFeedback(response.data);
        console.log(feedback);
      }
      fetchFeedback();
    }catch(error){
      console.log("Error fetching feedback: " + error);
      toast.error("Error fetching interview feedback")
    }
  },[])
  
  return (
    <div className="flex items-center w-full">
      {feedback && <FeedbackCard {...feedback} />}
    </div>
  )
}