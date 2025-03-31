import InterviewCard from '@/components/InterviewCard'
import { dummyInterviews } from '@/public'
import React from 'react'

const interviews = () => {
  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl">Interview List</h1>
      <p>Pick an interview to start your session</p>
      <div className="interviews-section">
        {dummyInterviews.map((interview) => (
          <InterviewCard key={interview.id} {...interview} />
        ))}
      </div>
    </section>
  )
}

export default interviews