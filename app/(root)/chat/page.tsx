'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Import the component dynamically with SSR disabled
const GeminiVoiceChat = dynamic(
  () => import('@/components/GeminiVoiceChat'),
  { ssr: false } // This ensures the component only loads in the browser, not during server-side rendering
);

const ChatPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <GeminiVoiceChat />
    </div>
  );
};

export default ChatPage;