/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { getUserInterviewFeedbacks } from "@/lib/interview";
import { useParams } from 'next/navigation'
import { toast } from "sonner";
import Image from 'next/image'
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    <section className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-slate-100 mb-3">Your Past Interviews</h1>
        <p className="text-slate-300 max-w-xl text-center">Review your previous interview sessions and analyze your performance</p>
      </div>

      {!isLoading ? (
        interviews && interviews.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-4">
            {interviews.map((interview) => (
              <InterviewCard key={interview.id} {...interview} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 border rounded-md ">
            <Image
              src="/confused.png"
              alt="No interviews"
              width={120}
              height={120}
              className="mb-6 opacity-60"
              unoptimized
            />
            <h3 className="text-xl font-medium mb-2">No interviews yet</h3>
            <p className="mb-6 max-w-md text-center">Complete your first interview to see your performance analysis here</p>
            <Button asChild className="btn-primary text-black">
              <Link href="/custom-interview">Start an interview</Link>
            </Button>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center py-12">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute top-0 w-full h-full border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300">Loading your interviews...</p>
        </div>
      )}
    </section>
  );
}
