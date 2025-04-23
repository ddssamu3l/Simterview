import { getUserInterviewFeedbacks } from '@/lib/interview';
import { Link } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import InterviewCard from './InterviewCard';
import { Button } from './ui/button';
import Image from 'next/image';

const FeedbackList = ({userId}: {userId: string}) => {
  const [interviews, setInterviews] = useState<Interview[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <>
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
    </>
  )
}

export default FeedbackList