/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { getPublicInterviews } from "@/lib/interview";
import { toast } from "sonner";
import Image from 'next/image'
import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default function Page() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Once user is available, fetch interviews with feedback details
  useEffect(() => {
    async function fetchInterviews() {
      try {
        const user = await getCurrentUser();
        if(user && user.id){
          const userId = user.id;
          console.log("userId: " + userId);
          const result = await getPublicInterviews(userId);
          if (result.data)
            setInterviews(result.data);
          else
            toast.error("Error fetching interviews");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        toast.error("Error fetching feedbacks");
      }
    }
    fetchInterviews();
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mb-3">Interview List</h1>
        <p className="text-slate-300 max-w-xl text-center">Pick from a list of pre-generated interviews to get targeted practice.</p>
        <p className="flex flex-row gap-1 text-slate-300 max-w-xl text-center items-center">1 minute = 1x <Image src="/coin.png" alt="coin cost" width={18} height={18}/> (deducted post-interview)</p>
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
            <h3 className="text-xl font-medium mb-2">Hmm, it seems like there are no interviews available.</h3>
            <p className="max-w-md text-center">
              Report this issue?
              <Link 
                href="mailto:rainsongsoftware@gmail.com?subject=Support%20Request"
                className="text-slate-400 hover:text-primary-100"
              > Contact support.
              </Link>
            </p>
            <p className="max-w-md text-center">
              Or
              <Link
                href="/custom-interview"
                className="text-slate-400 hover:text-primary-100"
              > Generate a custom interview.</Link>
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center py-12">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute top-0 w-full h-full border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300">Loading interviews...</p>
        </div>
      )}
    </section>
  );
}
