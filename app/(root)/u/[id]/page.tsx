/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { getInterviewsOfUser } from "@/app/api/interview/get/route";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { toast } from "sonner";

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[] | undefined>([]);

  // Fetch current user on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error(error);
        toast.error("Error fetching user information");
      }
    }
    fetchUser();
  }, []);

  // Once user is available, fetch interviews with feedback details
  useEffect(() => {
    if (!user) return;
    async function fetchInterviews() {
      try {
        const result = await getInterviewsOfUser(user.id);
        console.log(result.data);
        setInterviews(result.data);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        toast.error("Error fetching feedbacks");
      }
    }
    fetchInterviews();
  }, [user]);

  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl text-3xl">Your past interviews</h1>
      <div className="interviews-section flex justify-center flex-wrap">
        {interviews?.map((interview) => (
          <InterviewCard key={interview.id} {...interview} />
        ))}
      </div>
    </section>
  );
}
