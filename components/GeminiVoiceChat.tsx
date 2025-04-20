/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from 'react';
import { MultimodalLiveClient } from '@/lib/multimodal-live-client';
import { AudioRecorder } from '@/lib/audio-recorder';
import { AudioStreamer } from '@/lib/audio-streamer';
import Image from 'next/image'
import { formatTime } from '@/lib/utils';
import { Button } from './ui/button';
import { technicalSystemPrompt, behavioralSystemPrompt, geminiVoices } from '@/public';
import { getInterview } from '@/lib/interview';
import { toast } from 'sonner';
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ModelTurn, ServerContent, ToolCall } from '@/multimodal-live-types';
import { saveInterviewFeedback } from '@/app/api/interview/post/route';
import { useRouter } from 'next/navigation';

import { createClient, SpeakRestClient } from '@deepgram/sdk'
import { getDeepGramResponse } from '@/app/api/deepgram/post/route';
import CodeEditor from './CodeEditor';
import { initializeFeedback } from '@/lib/feedback';

function GeminiVoiceChat({ username, userId, interviewId }: AgentProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isSpeaking, setisSpeaking] = useState(false);
  const [interviewReady, setInterviewReady] = useState(false);
  const [interviewDifficulty, setInterviewDifficulty] = useState("Intern");
  const [interviewType, setInterviewType] = useState("");
  const [isBehavioral, setIsBehavioral] = useState(false);
  const [interviewLength, setInterviewLength] = useState(0);
  const [time, setTime] = useState(0);
  const [interviewQuestions, setInterviewQuestions] = useState([""]);
  const [lastCodeOutput, setLastCodeOutput] = useState<string>('');

  // Type your refs with the appropriate classes or null
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientRef = useRef<MultimodalLiveClient | null>(null);
  const router = useRouter();

  // Properly typed refs for screen sharing
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);

  const storeFeedbackDeclaration: FunctionDeclaration = {
    name: "storeFeedback",
    description: "Stores an internal feedback record of the candidate's interview performance in the database",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        passed: {
          type: SchemaType.BOOLEAN,
          description: "Whether the candidate passed the interview. Set to true if you would pass the candidate in an interview, false otherwise.",
        },
        strengths: {
          type: SchemaType.STRING,
          description: "Key strengths demonstrated by the candidate during the interview, such as technical knowledge, communication, or leadership.",
        },
        areasForImprovement: {
          type: SchemaType.STRING,
          description: "Specific areas where the candidate can improve, such as problem-solving, code optimization, or communication clarity.",
        },
        finalAssessment: {
          type: SchemaType.STRING,
          description: "A 2-paragraph written report for the hiring manager describing the candidate's overall performance, including strengths and areas for improvement. Provide specific examples.').",
        },
      },
      required: [
        "passed",
        "strengths",
        "areasForImprovement",
        "finalAssessment",
      ],
    },
  };

  // Initial setup
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new MultimodalLiveClient({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
      });

      // fetch interview details
      async function getInterviewDetails(){
        try{
          const interviewDetails = await getInterview(interviewId);
          if(interviewDetails.data && (interviewDetails.data.createdBy === userId || interviewDetails.data.createdBy === "Simterview")){
            setInterviewDifficulty(interviewDetails.data.difficulty);
            setInterviewType(interviewDetails.data.type);
            setInterviewLength(interviewDetails.data.length);
            setInterviewQuestions(interviewDetails.data.questions);
            setInterviewReady(true);

            setTime(interviewDetails.data.length * 60);
            setIsBehavioral(interviewDetails.data.type === "behavioral");
          }else{
            throw new Error();
          }
        }catch(error){
          console.log("Error fetching interview details: " + error);
          toast.error("Error fetching interview details. Please refresh the page.");
        }
      }
      getInterviewDetails();

      // Setup listeners for connection and errors
      clientRef.current.on('open', () => {
        console.log("WebSocket connection opened");
      });

      clientRef.current.on('close', (event) => {
        console.log("WebSocket connection closed", event);
        handleDisconnect();
      });

      const lastAssistantMessage = { current: '' };

      clientRef.current.on('content', (data: any) => {
        if (data?.modelTurn?.parts?.[0]?.text) {
          const transcriptText = data.modelTurn.parts[0].text;
          lastAssistantMessage.current += transcriptText;
        }
      });

      // clientRef.current.on('turncomplete', () => {
      //   console.log("Turn complete. Complete message: " + lastAssistantMessage.current);

      //   // Add message to conversation history even if empty to debug
      //   setMessages(prev => [...prev, {
      //     role: 'assistant',
      //     content: {
      //       text: lastAssistantMessage.current,
      //     }
      //   }]);

      //   const getAudio = async () => {
      //     let base64Audio: string | undefined;

      //     try {
      //       const res = await getDeepGramResponse(lastAssistantMessage.current);
      //       if (res.data) base64Audio = res.data;
      //     } catch (error) {
      //       console.error("Error with DeepGram during audio processing:", error);
      //       toast.error("Error with DeepGram during audio processing");
      //       return;
      //     }

      //     if (!base64Audio) {
      //       console.error("Failed to get audio data.");
      //       return;
      //     }

      //     // Convert base64 to Uint8Array buffer
      //     const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));

      //     // Send to streamer
      //     if (audioStreamerRef.current) {
      //       audioStreamerRef.current.addPCM16(audioBuffer);
      //       setisSpeaking(true);

      //       const dataLength = audioBuffer.byteLength;
      //       if (dataLength === 0 || dataLength < 100) {
      //         setTimeout(() => setisSpeaking(false), 500);
      //       }
      //     }
      //   };
      //   getAudio();
      // });

      // clientRef.current.on('interrupted', () => {
      //   console.log("Interrupted. Complete message: " + lastAssistantMessage);

      //   // Add message to conversation history even if empty to debug
      //   setMessages(prev => [...prev, {
      //     role: 'assistant',
      //     content: {
      //       text: lastAssistantMessage.current || "[No text transcript]",
      //     }
      //   }]);
      // });

      clientRef.current.on('toolcall', (toolCall: ToolCall) => {
        if (toolCall.functionCalls[0].name === "storeFeedback"){
          console.log("saving feedback...");
          async function saveFeedback(){
            try{
              // Type assertion to tell TypeScript about the expected structure
              const args = toolCall.functionCalls[0].args as {
                passed: boolean;
                strengths: string;
                areasForImprovement: string;
                finalAssessment: string;
              };

              const { passed, strengths, areasForImprovement, finalAssessment } = args;

              console.log("Written feedback:", finalAssessment);
              console.log("Strengths:", strengths);
              console.log("Areas for Improvement:", areasForImprovement);

              await saveInterviewFeedback({
                interviewId,
                userId,
                passed,
                strengths,
                areasForImprovement,
                finalAssessment,
              });
            }catch(error){
              console.error("Error: " + error);
            }
          }
          saveFeedback();
          sendSystemMessage("The storeFeedback tool is completed. An internal record of the candidate's performance for this interview is saved.");
        }
      });

      // Keep track of last audio packet time
      let lastAudioTime = 0;

      clientRef.current.on('audio', (audioData: any) => {        
        if (audioStreamerRef.current) {
          audioStreamerRef.current.addPCM16(new Uint8Array(audioData));
          setisSpeaking(true);
          
          // Clear any existing timeout
          if (isSpeakingTimeoutRef.current) {
            clearTimeout(isSpeakingTimeoutRef.current);
          }
          
          // Update last audio packet time
          lastAudioTime = Date.now();
          
          // Create a new timeout to detect end of speech
          isSpeakingTimeoutRef.current = setTimeout(() => {
            const timeSinceLastAudio = Date.now() - lastAudioTime;
            // If it's been more than 700ms since the last audio packet, consider speech ended
            if (timeSinceLastAudio > 700) {
              if (audioStreamerRef.current) {
                // Explicitly call complete to process any remaining audio
                audioStreamerRef.current.complete();
              }
              setisSpeaking(false);
            }
          }, 700);
        }
      });

      // Listen for setup completion
      clientRef.current.on('setupcomplete', () => {
        console.log("Setup complete");
      });
    }

    // Initialize audio streamer for playback if not already initialized
    if (!audioStreamerRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioStreamerRef.current = new AudioStreamer(audioCtx);
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (isSpeakingTimeoutRef.current) clearTimeout(isSpeakingTimeoutRef.current);
    };
  }, [interviewId]);

  // timer mechanic
  useEffect(() => {
    if(!connected) return 

    if (time <= 0) handleQuit();

    const intervalId = setInterval(() => {
      setTime(prev => prev - 1);
    }, 1000);

    if(time % 300 == 0){
      const minutesLeft = time/60;
      sendSystemMessage( minutesLeft + " minutes left.");
      console.log(minutesLeft + " minutes left");
    }

    return () => clearInterval(intervalId);
  }, [time, connected]);

  // Connect to the API
  const handleConnect = async () => {
    try {
      const interviewDetailsSystemPrompt = `\n\n Interview level = ${interviewDifficulty} Interview type = ${interviewType}, Interview length = ${time}, Interview question: ${interviewQuestions}`;
      const systemPrompt =
        (isBehavioral
          ? behavioralSystemPrompt
          : technicalSystemPrompt
        ) + interviewDetailsSystemPrompt;
      const random = Math.floor(Math.random() * 5);

      await clientRef.current?.connect({
        model: "models/gemini-2.0-flash-exp",
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        tools: [
          {
            functionDeclarations: [storeFeedbackDeclaration],
          },
        ],
        generationConfig: {
          responseModalities: "audio",
          temperature: 0.5,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: geminiVoices[random],
              },
            },
          },
        },
      });

      setConnected(true);
      sendSystemMessage("The candidate has joined. Please greet the candidate!");  
      
      await initializeFeedback(userId, interviewId);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  // Disconnect from the API and stop audio recording and screen sharing if active
  const handleDisconnect = () => {
    console.log("Disconnecting...");
    clientRef.current?.disconnect();
    setConnected(false);
    setisSpeaking(false);
    
    // Stop audio recording if active
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setAudioEnabled(false);
    }

    setConnected(false);
    // Reset messages
    setMessages([]);
    // reset timer
    setTime(interviewLength * 60);
  };

  // Toggle microphone for audio recording
  const toggleMicrophone = async () => {
    if (audioEnabled) {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
    } else {
      audioRecorderRef.current = new AudioRecorder();

      // Setup the handler for audio data
      audioRecorderRef.current.on('data', (base64Data: string) => {
        if (connected && clientRef.current) {
          clientRef.current.sendRealtimeInput([
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64Data,
            },
          ]);
        }
      });

      await audioRecorderRef.current.start();
    }
    setAudioEnabled(!audioEnabled);
  };

  const handleQuit = async() => {
    try{
      handleDisconnect();
      console.log("Quitting interview...");
      router.push(`/u/${userId}`);
    }catch(error){
      if (error instanceof Error && error.message !== "NEXT_REDIRECT") {
        console.log("Error: " + error);
        toast.error("Error quitting interview: " + error);
      }
    }
  }

  const sendSystemMessage = (text: string) => {
    if (connected && text.trim() && clientRef.current) {
      try {
        clientRef.current.send({ text });
        setMessages(prev => [...prev, { role: 'system', content: { text } }]);
      } catch (error) {
        console.error("Failed to send message:", error);
        // If the WebSocket isn't connected, reconnect
        if (error instanceof Error && error.message === "WebSocket is not connected") {
          handleConnect(); // Attempt to reconnect
        }
      }
    }
  };

  const updateCodeOutput = (output: string, code: string) => {
    console.log("Code output: " + output);
    sendSystemMessage(`Candidate ran the code. \nOutput: ${output}\n\nCandidate's code: ${code}`);
  }
  const updateCode = (code: string) => {
    console.log("Code: " + code);
    sendSystemMessage(`Current candidate code: ${code}`);
  }

  return (
    <div className="flex flex-col call-view h-full">
      {isBehavioral ? (
        // Original UI for Behavioral interviews
        <>
          <div>
            <div className="text-xl font-semibold text-center">
              Time:{formatTime(time)}
            </div>
          </div>
         
          <div className="flex flex-row gap-4 w-6xl max-w-[90vw]">
            <div className="card-interviewer">
              <div className="avatar">
                <Image src="/icon.png" alt="vapi" width={65} height={54} className="object-cover" />
                {isSpeaking && <span className="animate-speak"></span>}
              </div>
              <h3>AI Recruiter</h3>
            </div>

            <div className="card-border border-primary-200/50 ">
              <div className="card-content">
                <Image src="/icon.png" alt="user avatar" width={540} height={540} className="rounded-full object-cover size-[120px]" />
                <h3>{username}</h3>
              </div>
            </div>
          </div>
            
          <div className="w-full flex max-sm:flex-col max-sm items-center justify-center gap-6 mb-4 font-bold rounded-sm">
            {!connected ? (
              <Button
                disabled={!interviewReady}
                onClick={handleConnect}
                className="w-[150px] bg-white text-black font-bold px-4 py-2 hover:cursor-pointer"
              >
                Start Interview
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleDisconnect}
                  className="w-[150px] bg-red-500 text-white font-semibold hover:cursor-pointer"
                >
                  Start Over
                </Button>
                <Button
                  onClick={toggleMicrophone}
                  className={`${audioEnabled ? 'bg-red-400' : 'bg-green-500'} w-[150px] text-white font-semibold hover:cursor-pointer`}
                >
                  {audioEnabled ? 'Mute Microphone' : 'Enable Microphone'}
                </Button>
                <Button
                  onClick={handleQuit}
                  className="w-[150px] bg-red-500 text-white font-semibold hover:cursor-pointer"
                >
                  Quit Interview
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        // New UI for Technical interviews
        <div className="flex flex-col h-full w-full border-b">
          {/* Timer at the top */}
          <div className="py-4">
            <div className="text-2xl font-semibold text-center">
              Time: {formatTime(time)}
            </div>
          </div>
          
          {/* Question and editor box in the middle */}
          <div className="border rounded-lg flex-grow flex flex-row items-center justify-center overflow-hidden">
            {connected
            ?
              <>
                <div
                    className="max-w-lg h-full px-4 py-3 border-r overflow-y-scroll"
                >
                  <div
                    className="text-base whitespace-normal break-words"
                    dangerouslySetInnerHTML={{ __html: interviewQuestions[0] }}
                  />
                </div>

                <div className="w-full h-full">
                  <CodeEditor 
                    onRun={(output, code) => updateCodeOutput(output, code)}
                    onCodeChange={(code) => updateCode(code)}
                  />
                </div>
              </>
            :
              <div >
                  Press: Start Interview
              </div>
            }
          </div>
          
          {/* Controls at the bottom */}
          <div className="py-4">
            <div className="w-full flex items-center justify-center gap-6 font-bold">
              {!connected ? (
                <Button
                  disabled={!interviewReady}
                  onClick={handleConnect}
                  className="w-[150px] bg-white text-black font-bold px-4 py-2 hover:cursor-pointer"
                >
                  Start Interview
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleDisconnect}
                    className="w-[150px] bg-red-500 text-white font-semibold hover:cursor-pointer"
                  >
                    Start Over
                  </Button>
                  <Button
                    onClick={toggleMicrophone}
                    className={`${audioEnabled ? 'bg-red-400' : 'bg-green-500'} w-[150px] text-white font-semibold hover:cursor-pointer`}
                  >
                    {audioEnabled ? 'Mute Microphone' : 'Enable Microphone'}
                  </Button>
                  <Button
                    onClick={handleQuit}
                    className="w-[150px] bg-red-500 text-white font-semibold hover:cursor-pointer"
                  >
                    Quit Interview
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <video
          ref={hiddenVideoRef}
          className="hidden"
          autoPlay
          muted
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  )
}

export default GeminiVoiceChat;
