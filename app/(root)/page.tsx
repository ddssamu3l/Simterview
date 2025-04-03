import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

const page = () => {
  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 w-full items-center text-center">
          <h1 className="sm:text-5xl">Become FAANG-Ready With AI Mock Software Engineering Interviews</h1>
          <p className="sm:text-lg">Test your technical & behavioral skills against live AI recruiters & get instant quality feedback!</p>
          <Button asChild className="btn-primary w-full max-w-lg">
            <Link href="/interview-list">Start your interview now</Link>
          </Button>
        </div>
      </section>

      {/* <section className="flex flex-col gap-6 mt-8">
        <h2> Your Interviews</h2>
        <div className="interviews-section">
          <p>You haven&apos;t taken any interviews</p>
        </div>
      </section> */}
    </>
  )
}

export default page