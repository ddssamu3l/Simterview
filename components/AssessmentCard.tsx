/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { formatISODate } from '@/lib/utils'
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

const FeedbackCard = ({ interviewId, userId, passed, strengths, areasForImprovement, finalAssessment, createdAt }: Feedback) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  function retakeInterview(){
    setIsRedirecting(true);
    router.push(`/live-deepgram-interview/${interviewId}`);
  }
  return (
    <div className="card-border w-full max-w-2xl mx-auto min-h-196 max-sm:min-h-128 max-h-[90vh] bg-transparent">
      {/* Header - similar to InterviewCard header */}
      <div className="card-interview border-b py-3">
        <div className="flex justify-between max-sm:px-0">
          <div className="flex items-center">
            <h2 className="text-lg max-sm:text-base font-bold text-slate-200">
              Interview Feedback
            </h2>
          </div>
          <div className="flex-col items-center">
            <p className="badge-text flex justify-end">
              {passed ? (
                <Image src="/check.svg" alt="checkmark" width={15} height={15} className="mr-2" />
              ) : (
                <Image src="/cross.svg" alt="crossmark" width={15} height={15} className="mr-2" />
              )}
              {passed ? 'Passed' : 'Failed'}
            </p>
            {/* Date section */}
            <p className="flex text-xs text-slate-400">
              {formatISODate(createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Final Assessment - highlighted like a grade */}
      <div className="border-b py-4 px-4 min-h-96 max-sm:min-h-64">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-slate-300">Final Assessment</h3>
          <Button type="button" className="max-sm:max-w-[80px] max-sm:text-sm font-bold cursor-pointer" onClick={retakeInterview}>
            {isRedirecting? "Redirecting" : "Retake"}
          </Button>
        </div>
        <div className="mt-3 bg-transparent p-3">
          <p className="text-base text-slate-300">{finalAssessment}</p>
        </div>
      </div>

      {/* Report card sections with grade-like styling */}
      <div className="border-b py-3 px-4 min-h-36 max-sm:min-h-24">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-300">Strengths</h3>
          <div className="border-b border-slate-600 w-2/3"></div>
        </div>
        <p className="text-base text-slate-400">{strengths}</p>
      </div>

      <div className="py-3 px-4 min-h-36 max-sm:min-h-24">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-300">Areas for Improvement</h3>
          <div className="border-b border-slate-600 w-2/3"></div>
        </div>
        <p className="text-base text-slate-400">{areasForImprovement}</p>
      </div>
    </div>
  )
}

export default FeedbackCard