import { getUserInterviewFeedbacks } from '@/lib/interview';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import InterviewCard from './InterviewCard';
import { Button } from './ui/button';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="w-full mt-8">
      <div className="border rounded-lg p-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Past Interviews Feedbacks</h2>

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
              <h3 className="text-xl font-medium mb-2">No interviews yet</h3>
              <p className="mb-6 max-w-md text-center text-slate-400">
                Complete your first interview to see your performance analysis here
              </p>
              <Button asChild className="btn-primary text-black">
                <Link href="/custom-interview">Start an interview</Link>
              </Button>
            </div>
          )
        ) : (
          <div className="border rounded-md p-8 flex flex-col items-center">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute top-0 w-full h-full border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400">Loading your interviews...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedbackList