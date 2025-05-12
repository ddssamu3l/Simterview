"use client";

import React from "react";
import DemoDeepgramInterview from "@/components/DemoDeepgramInterview";
import { VoiceBotProvider } from "@/context/VoiceBotContextProvider";
import { MicrophoneContextProvider } from "@/context/MicrophoneContextProvider";
import { DeepgramContextProvider } from "@/context/DeepgramContextProvider";

const DemoPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8">
        Simterview Live Demo
      </h1>
      <section
        className="w-full max-w-4xl h-[600px] sm:h-[700px] flex items-center justify-center border rounded-lg shadow-xl"
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
