/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { getPublicInterviews } from "@/lib/interview";
import { toast } from "sonner";
import Image from 'next/image'
import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";

const InterviewList = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Once user is available, fetch interviews with feedback details
  useEffect(() => {
    async function fetchInterviews() {
      try {
        const user = await getCurrentUser();
        if(user && user.id){
          const userId = user.id;
          const result = await getPublicInterviews(userId);
          if (result.data)
            setInterviews(result.data);
          else
            toast.error("Error fetching interviews");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching interviews:", error);
        toast.error("Error fetching interviews");
      }
    }
    fetchInterviews();
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="border rounded-lg p-8 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Available Interviews</h1>
        
        <div className="mb-8 border rounded-md p-4 bg-slate-900/30">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6">
            <div className="flex items-center gap-2">
              <Image src="/coin.png" alt="SimCoin" width={24} height={24} unoptimized />
              {/* <p className="text-slate-300">1 SimCoin = 1 Minute of speaking time with the AI interviewer.</p> */}
              <p className="text-slate-300">Launch Promotion: All interviews are free!</p>
            </div>
            {/* <p className="text-slate-300 text-sm">(Coins are deducted after completing the interview)</p> */}
          </div>
        </div>

        {!isLoading ? (
          interviews && interviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.map((interview) => (
                <InterviewCard key={interview.id} {...interview} />
              ))}
            </div>
          ) : (
            <div className="border rounded-md p-8 flex flex-col items-center">
              <Image
                src="/confused.png"
                alt="No interviews"
                width={100}
                height={100}
                className="mb-6 opacity-60"
                unoptimized
              />
              <h3 className="text-xl font-medium mb-3">No interviews available</h3>
              <div className="space-y-2 text-center mb-6">
                <p className="text-slate-400">
                  Report this issue?
                  <Link 
                    href="mailto:rainsongsoftware@gmail.com?subject=Support%20Request"
                    className="text-slate-300 hover:text-primary-100 ml-1"
                  >
                    Contact support
                  </Link>
                </p>
                <p className="text-slate-400">
                  Or try generating a custom interview instead
                </p>
              </div>
              <Link href="/custom-interview">
                <Button className="btn-primary text-black">
                  Create Custom Interview
                </Button>
              </Link>
            </div>
          )
        ) : (
          <div className="border rounded-md p-8 flex flex-col items-center">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute top-0 w-full h-full border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400">Loading interviews...</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default InterviewList;