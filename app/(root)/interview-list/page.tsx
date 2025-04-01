import InterviewCard from '@/components/InterviewCard'
import { isAuthenticated } from '@/lib/actions/auth.action';
import { dummyInterviews } from '@/public'
import { redirect } from 'next/navigation';
import React from 'react'

const interviews = async () => {
  const userIsAuthenticated = await isAuthenticated();
  if (!userIsAuthenticated) redirect("/sign-in");
  
  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl">Interview List</h1>
      <p>Pick an interview to start your session</p>
      <div className="interviews-section flex justify-center">
        {dummyInterviews.map((interview) => (
          <InterviewCard key={interview.id} {...interview} />
        ))}
      </div>
    </section>
  )
}

export default interviews