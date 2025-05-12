"use client";

import React from "react";
import DemoDeepgramInterview from "@/components/DemoDeepgramInterview";
import { VoiceBotProvider } from "@/context/VoiceBotContextProvider";
import { MicrophoneContextProvider } from "@/context/MicrophoneContextProvider";
import { DeepgramContextProvider } from "@/context/DeepgramContextProvider";

const DemoPage = () => {
  return (
    <div className="flex flex-col items-center  min-h-screen py-12 px-4">
      <section
        className="w-full max-w-4xl h-[600px] sm:h-[700px] flex items-center justify-center rounded-lg shadow-xl"
        aria-label="Live Interview Demo"
      >
        <VoiceBotProvider>
          <MicrophoneContextProvider>
            <DeepgramContextProvider>
              <DemoDeepgramInterview />
            </DeepgramContextProvider>
          </MicrophoneContextProvider>
        </VoiceBotProvider>
      </section>
    </div>
  );
};

export default DemoPage;
