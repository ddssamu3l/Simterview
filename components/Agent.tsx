"use client"
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getInterview } from '@/app/api/interview/get/route';

enum CallStatus{
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

interface SavedMessage{
  role: 'user' | 'system' | 'assistant',
  content: string
}

interface InterviewData {
  length: number;
  questions: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Agent =  ({username, userId, interviewId, type}: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setisSpeaking] = useState(false);
  const [callStatus, setcallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setmessage] = useState<SavedMessage[]>([]);
  const lastMessage = messages[messages.length-1];
  const [interview, setInterview] = useState<InterviewData | null>(null);

  useEffect(() => {
    async function fetchInterview() {
      try {
        const response = await getInterview(interviewId);
        if (response.success && response.data) {
          const { length, questions } = response.data;
          console.log(questions);
          const currentInterview = { length, questions };
          setInterview(currentInterview);
        }
      } catch (error) {
        console.error("Error fetching interview details:", error);
      }
    }

    fetchInterview();
    // const onCallStart = () => setcallStatus(CallStatus.ACTIVE);
    // const onCallEnd = () => setcallStatus(CallStatus.FINISHED);

    // const onMessage = (message: Message) => {
    //   if(message.type === 'transcript' && message.transcriptType === 'final'){
    //     const newMessage = { role: message.role, content: message.transcript }

    //     setMessages((prev) => [...prev, newMessage]);
    //   }
    // }

    // const onSpeechStart = () => setisSpeaking(true);
    // const onSpeechEnd = () => setisSpeaking(false);

    // const onError = (error: Error) => console.log("Error: " + error);


  }, [interviewId]);

  // useEffect(() => {
  //   if(callStatus === CallStatus.FINISHED){
  //     router.push(`/u/${userId}`);
  //   }

  //   const handleCall = async() => {
  //     setcallStatus(CallStatus.CONNECTING);

      
  //   }

  //   const handleDisconnect = async() => {
  //     setcallStatus(CallStatus.FINISHED);

  //   }
  // }, [messages, callStatus, type, userId])
  
  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image src="/icon.png" alt="vapi" width={65} height={54} className="object-cover" />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>AI Recruiter</h3>
        </div>

        <div className="card-border border-primary-200/50">
          <div className="card-content ">
            <Image src="/icon.png" alt="user avatar" width={540} height={540} className="rounded-full object-cover size-[120px]" />
            {isSpeaking && <span className="animate-speak"></span>}
            <h3>{username}</h3>
          </div>
          
        </div>
      </div>
      
      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p key={lastMessage.content} className={cn('transition-opacity duration-500 opacity-0', 'animate-fade-In opacity-100')}>
              {lastMessage.content}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== 'ACTIVE' ? (
          <button className="relative btn-call">
            <span className={cn("absolute animate-ping rounded-full opacity-75", callStatus !== 'CONNECTING' && 'hidden')} />
            <span>
              {callStatus === 'INACTIVE' || callStatus === 'FINISHED' ? "Call" : "..."}
            </span>
          </button>
        ):(
            <button className="btn-disconnect">End Call</button>
        )}
      </div>
    </>
  )
}

export default Agent