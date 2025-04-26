/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Suspense, useState } from "react";
import { App } from "@/components/App";
import { stsConfig } from "@/lib/deepgramConstants";
import {
  isConversationMessage,
  useVoiceBot,
  VoiceBotProvider,
  VoiceBotStatus,
} from "@/context/VoiceBotContextProvider";
import { withBasePath } from "@/utils/deepgramUtils";
import { useStsQueryParams } from "@/hooks/UseStsQueryParams";
import { DeepgramContextProvider, useDeepgram } from "@/context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "@/context/MicrophoneContextProvider";
import Conversation from "@/components/Conversation";

function ChatContent() {
  const { messages, status } = useVoiceBot();
  const [conversationOpen, setConversationOpen] = useState(false);

  const toggleConversation = () => setConversationOpen(!conversationOpen);

  const has4ConversationMessages = messages.filter(isConversationMessage).length > 3;

  return (
    <main className="h-dvh min-w-[300px] flex flex-col justify-between pb-12 md:pb-0 border">
      <div className="flex flex-col flex-grow">
        <div className="flex flex-grow relative">
          {/* Main Content */}
          <div className="flex-1 flex justify-center items-start md:items-center">
            <div className="md:h-full flex flex-col min-w-[80vw] md:min-w-[30vw] max-w-[80vw] justify-center">
              <Suspense>
                <App
                  defaultStsConfig={stsConfig}
                  className="flex-shrink-0 h-auto items-end border-2"
                  requiresUserActionToInitialize={false}
                />
              </Suspense>
              {/* Desktop Conversation Toggle */}
              {has4ConversationMessages ? (
                <div className="hidden md:flex justify-center mt-auto mb-4 md:mt-4 text-gray-350">
                  <button className="text-[14px] text-gray-350 py-4" onClick={toggleConversation}>
                    See full conversation
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation */}
      {conversationOpen && <Conversation toggleConversation={toggleConversation} />}
    </main>
  );
}

export default function Home() {
  return (
    <VoiceBotProvider>
      <MicrophoneContextProvider>
        <DeepgramContextProvider>
          <ChatContent />
        </DeepgramContextProvider>
      </MicrophoneContextProvider>
    </VoiceBotProvider>
  );
}
