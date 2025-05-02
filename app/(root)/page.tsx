/* eslint-disable react/no-unescaped-entities */
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

const Page = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="card-cta w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="flex flex-col gap-8 w-full items-center text-center sm:px-16">
          <h1 className="font-bold tracking-tight">
            Become FAANG-Ready With AI Mock Software Engineering Interviews
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
            Test your technical & behavioral skills against live AI recruiters!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild className="btn-primary w-[250px] max-w-lg text-black">
              <Link href="/custom-interview">Generate A Custom AI Interview</Link>
            </Button>
            <Button asChild className="btn-primary w-[250px] max-w-lg text-black">
              <Link href="/interview-list">Try A Mock Interview Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full border-t border-b py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Why Choose Simterview?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image src="/computer.png" alt="AI Icon" width={48} height={48} unoptimized />
              </div>
              <h3 className="font-bold mb-2">AI-Powered Interviews</h3>
              <p className="text-slate-400">Practice with intelligent AI interviewers that adapt to your responses in real-time</p>
            </div>

            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image src="/feedback.png" alt="Feedback Icon" width={48} height={48} unoptimized />
              </div>
              <h3 className="font-bold mb-2">Instant Feedback</h3>
              <p className="text-slate-400">Receive detailed assessments on your technical and behavioral performance</p>
            </div>

            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image src="/target.png" alt="Practice Icon" width={48} height={48} unoptimized />
              </div>
              <h3 className="font-bold mb-2">Targeted Practice</h3>
              <p className="text-slate-400">Customize interviews for specific roles, companies, and skill levels</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Success Stories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border p-6">
              <p className="text-slate-300 mb-4">"After practicing with Simterview for just two weeks, I landed my dream job at Google. The AI interviews were surprisingly realistic and the feedback helped me identify weak areas."</p>
              <p className="font-bold">- Sarah J., Software Engineer at Google</p>
            </div>

            <div className="border p-6">
              <p className="text-slate-300 mb-4">"The technical questions were challenging and relevant. I felt much more confident going into real interviews after practicing with this tool."</p>
              <p className="font-bold">- Michael T., Frontend Developer at Meta</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full border-t py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Ready to ace your next interview?</h2>
          <p className="text-slate-300 mb-8">Join thousands of developers who&apos;ve improved their interview skills with Simterview</p>
          <Button asChild className="btn-primary text-black">
            <Link href="/interview-list">Start practicing now</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

export default Page