import InterviewCard from '@/components/InterviewCard'
import { Button } from '@/components/ui/button';
import { isAuthenticated } from '@/lib/actions/auth.action';
import { dummyInterviews } from '@/public'
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react'

const interviews = async () => {
  const userIsAuthenticated = await isAuthenticated();
  if (!userIsAuthenticated) redirect("/sign-in");

  return (
    <section className="flex flex-col gap-6 mt-8 text-center">
      <h1 className="sm:text-5xl text-3xl">Interviews List</h1>
      <p>Pick an interview to start your session</p>
      <p>or</p>
      <Button className="btn-custom-interview font-semibold mx-4">
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

export default interviews