/* eslint-disable @typescript-eslint/no-unused-vars */
import { getCurrentUser } from '@/lib/actions/auth.action';
import React from 'react';
import ClientLiveDeepgramInterview from './client';
import { Metadata } from 'next';

export const generateMetadata = async ({ params }: { params: { id: string } }): Promise<Metadata> => {
  return {
    title: "Live Software Engineering Interview | Real-time Practice with AI Interviewer",
    description: "Experience a real-time technical or behavioral interview with our AI interviewer. Perfect your coding skills, answer algorithm questions, and receive instant feedback.",
    keywords: "live coding interview, real-time technical interview, software engineer interview practice, AI interviewer simulation, coding challenge practice, algorithm interview preparation, live interview feedback, software development skills assessment, programming interview questions, mock interview with feedback",
    alternates: {
      canonical: 'https://simterview.com/live-interview',
    },
  };
};

type PageProps = {
  params: {
    id: string;
  }
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  const user = await getCurrentUser();

  return <ClientLiveDeepgramInterview id={id} username={user?.name || "You"} userId={user!.id} coinCount={user!.coinCount} />;
};

export default Page;