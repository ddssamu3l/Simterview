import React from 'react'
import Image from 'next/image'
import { formatISODate } from '@/lib/utils'

const FeedbackCard = ({ interviewId, userId, passed, strengths, areasForImprovement, finalAssessment, createdAt }: Feedback) => {
  return (
    <div className="card-border w-full max-w-2xl mx-auto min-h-196 max-sm:min-h-128 max-h-[90vh] bg-transparent">
      {/* Header - similar to InterviewCard header */}
      <div className="card-interview border-b py-3">
        <div className="flex justify-between px-4 max-sm:px-0">
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
          <h3 className="text-md font-bold text-slate-300">Final Assessment:</h3>
          {/* <div className="bg-transparent border px-6 py-3 text-center">
            <p className="text-slate-200">{passed ? 'PASS' : 'FAIL'}</p>
          </div> */}
        </div>
        <div className="mt-3 bg-transparent p-3">
          <p className="text-sm text-slate-300">{finalAssessment}</p>
        </div>
      </div>

      {/* Report card sections with grade-like styling */}
      <div className="border-b py-3 px-4 min-h-36 max-sm:min-h-24">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-300">Strengths</h3>
          <div className="border-b border-slate-600 w-2/3"></div>
        </div>
        <p className="text-sm text-slate-400">{strengths}</p>
      </div>

      <div className="py-3 px-4 min-h-36 max-sm:min-h-24">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-300">Areas for Improvement</h3>
          <div className="border-b border-slate-600 w-2/3"></div>
        </div>
        <p className="text-sm text-slate-400">{areasForImprovement}</p>
      </div>
    </div>
  )
}

export default FeedbackCard