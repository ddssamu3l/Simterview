import InterviewCard from '@/components/InterviewCard'
import { Button } from '@/components/ui/button';
import { dummyInterviews } from '@/public'
import Link from 'next/link';
import React from 'react'

const interviewList = async () => {

  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl text-3xl">Interviews List</h1>
      <p>Pick an interview to start your session</p>
      <p>or</p>
      <Button className="btn-custom-interview font-bold mx-4">
        <Link href="/custom-interview">
          Custom interview from job description
        </Link>
      </Button>
      <div className="interviews-section flex justify-center">
        {dummyInterviews.map((interview) => (
          <InterviewCard key={interview.id} {...interview} />
        ))}
      </div>
    </section>
  )
}

export default interviewList