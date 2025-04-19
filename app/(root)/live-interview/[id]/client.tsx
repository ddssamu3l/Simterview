'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Only import the component client-side
const GeminiVoiceChat = dynamic(
  () => import('@/components/GeminiVoiceChat'),
  { ssr: false }
);

function ClientLiveInterview({ 
  id, 
  username, 
  userId 
}: { 
  id: string;
  username: string;
  userId: string;
}) {
  return (
    <div className="h-[600px] sm:h-[880px] w-full flex items-center justify-center mt-[-48]">
      <GeminiVoiceChat username={username} userId={userId} interviewId={id} />
    </div>
  );
}

export default ClientLiveInterview;