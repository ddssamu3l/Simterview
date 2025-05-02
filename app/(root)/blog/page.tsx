import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Software Engineering Interview Tips Blog | Coding Interview Preparation",
  description: "Learn proven strategies and tips for software engineering interviews. Articles on technical coding interviews, behavioral questions, and career advice from industry experts.",
  keywords: "software engineer interview tips, coding interview preparation, technical interview blog, algorithm interview advice, system design interview help, behavioral interview tips, software development career advice, programming interview questions, tech job application guide, software engineer resume tips",
  alternates: {
    canonical: 'https://simterview.com/blog',
  },
};

const blogPosts = [
  {
    id: 'mastering-data-structures',
    title: 'Mastering Data Structures for Technical Interviews',
    excerpt: 'Learn the most important data structures that appear frequently in coding interviews at top tech companies. From arrays and linked lists to trees and graphs, this comprehensive guide covers everything you need to know.',
    date: 'May 1, 2024',
    category: 'Technical Preparation',
    readTime: '12 min read',
  },
  {
    id: 'behavioral-interview-star',
    title: 'Using the STAR Method to Ace Behavioral Interview Questions',
    excerpt: 'Master the Situation-Task-Action-Result framework to structure compelling responses to behavioral questions. This article provides practical examples and templates specific to software engineering scenarios.',
    date: 'April 28, 2024',
    category: 'Behavioral Preparation',
    readTime: '9 min read',
  },
  {
    id: 'system-design-interview',
    title: 'System Design Interview Guide: From Junior to Senior Level',
    excerpt: 'A comprehensive walkthrough of system design interviews with practical examples. Learn how to approach scalability, reliability, and performance considerations when designing complex distributed systems.',
    date: 'April 22, 2024',
    category: 'Technical Preparation',
    readTime: '15 min read',
  },
  {
    id: 'faang-interview-process',
    title: 'What to Expect in a FAANG Technical Interview: The Complete Process',
    excerpt: 'An insider\'s guide to the entire technical interview process at Facebook, Amazon, Apple, Netflix, and Google. Learn about each round, what recruiters are looking for, and how to prepare effectively.',
    date: 'April 15, 2024',
    category: 'Career Advice',
    readTime: '11 min read',
  }
];

import Breadcrumbs from '@/components/Breadcrumbs';

const BlogPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Breadcrumbs />
      <section className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Software Engineering Interview Preparation Blog</h1>
        <p className="text-slate-300 max-w-3xl mx-auto">
          Expert guidance to help you prepare for technical and behavioral interviews at top tech companies. Boost your 
          confidence and increase your chances of landing your dream software engineering job.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.map((post) => (
          <article key={post.id} className="border hover:bg-dark-300 transition-colors duration-200 rounded-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-3 text-xs text-slate-400">
                <span className="bg-slate-800 px-2 py-1 rounded">{post.category}</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-slate-100">{post.title}</h2>
              <p className="text-slate-300 mb-4 line-clamp-3">{post.excerpt}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{post.date}</span>
                <Link href={`/blog/${post.id}`} className="text-primary-100 hover:underline text-sm">
                  Read More →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-16 border rounded-lg p-8 bg-slate-900/30">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-2/3">
            <h2 className="text-2xl font-bold mb-4">Prepare for Interviews with Simterview&apos;s AI Coach</h2>
            <p className="text-slate-300 mb-4">
              Reading articles is a great start, but nothing beats hands-on practice. Try our AI-powered mock interviews to apply what you&apos;ve learned and get instant feedback.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/interview-list" className="bg-primary-100 text-black px-4 py-2 rounded font-medium hover:bg-primary-200 transition-colors">
                Try a Mock Interview
              </Link>
              <Link href="/custom-interview" className="border border-primary-100 text-primary-100 px-4 py-2 rounded font-medium hover:bg-slate-800 transition-colors">
                Create Custom Interview
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <Image
              src="/computer.png"
              alt="AI-powered technical interview practice platform"
              width={150}
              height={150}
              className="opacity-90"
              unoptimized
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;