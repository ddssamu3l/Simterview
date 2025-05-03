/* eslint-disable react/no-unescaped-entities */
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Simterview | AI Mock Interviews for Software Engineers",
  description: "Practice technical coding interviews and behavioral questions with AI interviewers. Get FAANG-ready with realistic mock interviews for software engineers at all experience levels.",
  keywords: "software engineer interview practice, coding interview simulator, tech interview preparation, FAANG interview prep, software developer mock interviews, programming interview questions, technical interview training, AI interview coach, algorithm practice for interviews, system design interview prep",
}

const Page = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="card-cta w-full max-w-6xl px-4 py-16 sm:py-24" aria-label="Software Engineering Interview Preparation">
        <div className="flex flex-col gap-8 w-full items-center text-center sm:px-16">
          <h1 className="font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl">
            Ace Your Software Engineering Interviews with AI-Powered Mock Interviews
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
            Master technical coding challenges, data structures, algorithms, and behavioral questions with our intelligent AI interviewers. Get FAANG-ready and land your dream tech job!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild className="btn-primary w-[250px] max-w-lg text-black">
              <Link href="/custom-interview">Create Custom Interview</Link>
            </Button>
            <Button asChild className="btn-primary w-[250px] max-w-lg text-black">
              <Link href="/interview-list">Practice Mock Interviews</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full border-t border-b py-16" aria-label="Interview Practice Features">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Why Would You Interview On Simterview</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/computer.png" 
                  alt="AI-powered technical coding interview simulation for software engineers" 
                  width={48} 
                  height={48} 
                  unoptimized 
                />
              </div>
              <h3 className="font-bold mb-2">AI-Powered Technical Interviews</h3>
              <p className="text-slate-400">Practice coding challenges, algorithms, and system design with intelligent AI interviewers that simulate real technical interviews at top tech companies</p>
            </div>

            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/feedback.png" 
                  alt="Detailed software engineering interview feedback and performance assessment" 
                  width={48} 
                  height={48} 
                  unoptimized 
                />
              </div>
              <h3 className="font-bold mb-2">Comprehensive Feedback</h3>
              <p className="text-slate-400">Receive detailed assessments on your coding skills, problem-solving approach, and communication abilities to identify improvement areas and track progress</p>
            </div>

            <div className="border hover:bg-dark-300 p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/target.png" 
                  alt="Customized role-specific software engineering interview preparation" 
                  width={48} 
                  height={48} 
                  unoptimized 
                />
              </div>
              <h3 className="font-bold mb-2">Role-Specific Interview Prep</h3>
              <p className="text-slate-400">Tailor practice sessions for frontend, backend, full-stack, machine learning, or other specialized software engineering roles at top tech companies</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interview Types Section */}
      <section className="w-full py-16" aria-label="Interview Types">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Comprehensive Interview Preparation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="border p-6 hover:bg-dark-300">
              <h3 className="font-bold text-xl mb-4">Technical Coding Interviews</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li>Data structures & algorithms practice</li>
                <li>System design challenges</li>
                <li>Live coding with real-time feedback</li>
                <li>Language-specific questions (Python, JavaScript, Java, C++)</li>
                <li>Problem-solving approach evaluation</li>
              </ul>
            </div>
            
            <div className="border p-6 hover:bg-dark-300">
              <h3 className="font-bold text-xl mb-4">Behavioral Interviews</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li>STAR method response practice</li>
                <li>Leadership & teamwork scenarios</li>
                <li>Conflict resolution questions</li>
                <li>Company culture fit assessment</li>
                <li>Communication skills evaluation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section
      <section className="w-full py-16" aria-label="Success Stories">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Success Stories from Software Engineers</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border p-6">
              <p className="text-slate-300 mb-4">"After practicing with Simterview for just two weeks, I landed my dream job at Google. The AI-powered technical interviews were surprisingly realistic, covering data structures, algorithms and system design exactly like my actual interviews. The detailed feedback helped me identify and improve my weak areas."</p>
              <p className="font-bold">- Sarah J., Software Engineer at Google</p>
            </div>

            <div className="border p-6">
              <p className="text-slate-300 mb-4">"The technical coding questions were challenging and relevant to current industry standards. I felt much more confident going into real interviews after practicing algorithms and problem-solving with this tool. The behavioral question practice was equally valuable for my Meta interviews."</p>
              <p className="font-bold">- Michael T., Frontend Developer at Meta</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* Final CTA */}
      <section className="w-full border-t py-16" aria-label="Get Started">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Ready to ace your software engineering interview?</h2>
          <p className="text-slate-300 mb-8">Join thousands of developers who've improved their coding skills, technical knowledge, and behavioral interview responses with Simterview's AI-powered mock interviews</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild className="btn-primary text-black">
              <Link href="/interview-list">Start your interview preparation</Link>
            </Button>
            <Button asChild variant="outline" className="w-fit !bg-transparent !text-white hover:!bg-dark-300/90 !rounded-md !font-bold px-5 cursor-pointer min-h-10 border-2">
              <Link href="/blog">Read Interview Tips on Our Blog</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full border-t py-16" aria-label="Interview FAQ">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="border p-6">
              <h3 className="font-bold text-xl mb-2">How do Simterview's mock interviews work?</h3>
              <p className="text-slate-300">Our AI-powered platform simulates real technical and behavioral interviews for software engineers. You'll interact with an intelligent interviewer that asks relevant coding challenges, algorithm questions, and behavioral scenarios, providing feedback on your performance.</p>
            </div>
            
            <div className="border p-6">
              <h3 className="font-bold text-xl mb-2">What types of coding questions can I practice?</h3>
              <p className="text-slate-300">Simterview covers a comprehensive range of technical questions including data structures, algorithms, system design, database concepts, and language-specific challenges in Python, JavaScript, Java, C++, and more.</p>
            </div>
            
            <div className="border p-6">
              <h3 className="font-bold text-xl mb-2">How does Simterview prepare me for FAANG interviews?</h3>
              <p className="text-slate-300">Our platform models interview questions and formats used by top tech companies like Facebook, Amazon, Apple, Netflix, and Google. The difficulty levels and question styles are designed to match what you'll encounter in actual FAANG interviews.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Page