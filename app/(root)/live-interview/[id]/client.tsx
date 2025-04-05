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
  userId?: string;
}) {
  return (
    <div className="h-[800px] flex items-center justify-center">
      <GeminiVoiceChat username={username} userId={userId} interviewId={id} />
    </div>
  );
}

export default ClientLiveInterview;