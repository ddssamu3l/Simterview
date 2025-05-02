import CustomInterviewForm from '@/components/CustomInterviewForm'
import React from 'react'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Create Custom Software Engineering Interview | Tailored Practice for Your Career Goals",
  description: "Design your own personalized technical or behavioral interview simulation. Customize difficulty, role, and topics to target your specific software engineering career path.",
  keywords: "custom coding interview, personalized technical interview, software engineer interview preparation, tailored mock interview, practice for specific tech companies, role-specific interview questions, job-focused interview simulation, technical interview generator, behavioral interview creator, software developer skills assessment",
  alternates: {
    canonical: 'https://simterview.com/custom-interview',
  },
};

import Breadcrumbs from '@/components/Breadcrumbs';

const customInterview = () => {
  return (
    <>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs />
      </div>
      <CustomInterviewForm />
    </>
  )
}

export default customInterview