'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { VoiceBotProvider } from '@/context/VoiceBotContextProvider';
import { MicrophoneContextProvider } from '@/context/MicrophoneContextProvider';
import { DeepgramContextProvider } from '@/context/DeepgramContextProvider';

// Only import the component client-side to avoid SSR issues
const DeepgramInterview = dynamic(
  () => import('@/components/DeepgramInterview'),
  { ssr: false }
);

function ClientLiveDeepgramInterview({ 
  id, 
  username, 
  userId,
  coinCount
}: { 
  id: string;
  username: string;
  userId: string;
  coinCount: number;
}) {
  return (
    <VoiceBotProvider>
      <MicrophoneContextProvider>
        <DeepgramContextProvider>
          <div className="h-[600px] sm:h-[880px] w-full flex items-center justify-center mt-[-48]">
            <DeepgramInterview username={username} userId={userId} interviewId={id} coinCount={coinCount} />
          </div>
        </DeepgramContextProvider>
      </MicrophoneContextProvider>
    </VoiceBotProvider>
  );
}

export default ClientLiveDeepgramInterview;