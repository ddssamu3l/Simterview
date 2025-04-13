/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { getUserInterviewFeedbacks } from "@/lib/interview";
import { useParams } from 'next/navigation'
import { toast } from "sonner";

export default function Page() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [interviews, setInterviews] = useState<any[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Once user is available, fetch interviews with feedback details
  useEffect(() => {
    if (!userId) return;
    async function fetchInterviews() {
      try {
        const result = await getUserInterviewFeedbacks(userId);
        setInterviews(result.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        toast.error("Error fetching feedbacks");
      }
    }
    fetchInterviews();
  }, [userId]);

  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl text-3xl">Your past interviews</h1>
      {!isLoading? 
        <div className="interviews-section flex justify-center flex-wrap">
          {interviews?.map((interview) => (
            // interview.id actually refers to the feedback id that contains the feedback for that interview
            <InterviewCard key={interview.id} {...interview} />
          ))}
        </div>
      :
        // eslint-disable-next-line @next/next/no-img-element
        <p className="mt-8">
          Loading feedbacks...
        </p>
      }
      
    </section>
  );
}
