/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { formatTime } from '@/lib/utils';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getInterview } from '@/lib/interview';
import { saveInterviewFeedback } from '@/app/api/interview/post/route';
import { deductCoins } from '@/app/api/user/post/route';
import { initializeFeedback } from '@/lib/feedback';
import Transcript from "./Transcript";
import { useDeepgram } from "../context/DeepgramContextProvider";
import { useMicrophone } from "../context/MicrophoneContextProvider";
import { EventType, useVoiceBot, VoiceBotStatus } from "../context/VoiceBotContextProvider";
import { createAudioBuffer, playAudioBuffer } from "../utils/audioUtils";
import { sendSocketMessage, sendMicToSocket } from "@/utils/deepgramUtils";
import { useStsQueryParams } from "@/hooks/UseStsQueryParams";
import { stsConfig } from "@/lib/deepgramConstants";
import CodeEditor from './CodeEditor';

interface DeepgramInterviewProps {
  username: string;
  userId: string;
  interviewId: string;
  coinCount: number;
}

function DeepgramInterview({ username, userId, interviewId, coinCount }: DeepgramInterviewProps) {
  // VoiceBot context
  const {
    status,
    messages,
    addVoicebotMessage,
    addBehindTheScenesEvent,
    isWaitingForUserVoiceAfterSleep,
    toggleSleep,
    startListening,
    startSpeaking,
  } = useVoiceBot();

  // Microphone context
  const {
    setupMicrophone,
    microphone,
    microphoneState,
    processor,
    microphoneAudioContext,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone();

  // Deepgram context
  const { 
    socket, 
    connectToDeepgram, 
    disconnectFromDeepgram, 
    socketState,
    manuallyDisconnected 
  } = useDeepgram();

  // Query params for voice/instructions
  const { voice, instructions, applyParamsToConfig } = useStsQueryParams();

  // Router for navigation
  const router = useRouter();

  // State
  const [data, setData] = useState();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [time, setTime] = useState(0);
  const [interviewReady, setInterviewReady] = useState(false);
  const [interviewDifficulty, setInterviewDifficulty] = useState("Intern");
  const [interviewType, setInterviewType] = useState("");
  const [isBehavioral, setIsBehavioral] = useState(false);
  const [interviewLength, setInterviewLength] = useState(0);
  const [interviewQuestions, setInterviewQuestions] = useState([""]);
  const [lastCodeOutput, setLastCodeOutput] = useState<string>('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Refs
  const audioContext = useRef<AudioContext | null>(null);
  const agentVoiceAnalyser = useRef<AnalyserNode | null>(null);
  const userVoiceAnalyser = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(-1);
  const scheduledAudioSources = useRef<AudioBufferSourceNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousVoiceRef = useRef<string | null>(null);
  const previousInstructionsRef = useRef<string | null>(null);

  // Initialize the audio context
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      agentVoiceAnalyser.current = audioContext.current.createAnalyser();
      agentVoiceAnalyser.current.fftSize = 2048;
      agentVoiceAnalyser.current.smoothingTimeConstant = 0.96;
    }
  }, []);

  // Fetch interview details
  useEffect(() => {
    async function getInterviewDetails() {
      try {
        const interviewDetails = await getInterview(interviewId);
        if (interviewDetails.data && (interviewDetails.data.createdBy === userId || interviewDetails.data.createdBy === "Simterview")) {
          setInterviewDifficulty(interviewDetails.data.difficulty);
          setInterviewType(interviewDetails.data.type);
          setInterviewLength(interviewDetails.data.length);
          setInterviewQuestions(interviewDetails.data.questions);
          setInterviewReady(true);

          setTime(interviewDetails.data.length * 60);
          setIsBehavioral(interviewDetails.data.type === "behavioral");
        } else {
          throw new Error();
        }
      } catch (error) {
        console.log("Error fetching interview details: " + error);
        toast.error("Error fetching interview details. Please refresh the page.");
      }
    }
    getInterviewDetails();
  }, [interviewId, userId]);

  // Timer mechanic
  useEffect(() => {
    if (!isInitialized || isDisconnected) return;

    if (time <= 0) {
      handleQuit();
      return;
    }

    const intervalId = setInterval(() => {
      setTime(prev => prev - 1);
    }, 1000);

    // Only announce time remaining on specific intervals
    if (time % 300 === 0 && time > 0) {
      const minutesLeft = time / 60;
      sendSystemMessage(minutesLeft + " minutes left.");
      console.log(minutesLeft + " minutes left");
    }

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, isInitialized, isDisconnected]);

  // Initialize microphone once on mount
  useEffect(() => {
    if (microphoneState === null) {
      setupMicrophone().catch(error => {
        console.error('Microphone setup failed:', error);
        if (error.name === 'NotAllowedError') {
          setMicPermissionDenied(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Update mic permission state when microphone state changes
  useEffect(() => {
    if (microphoneState === 1) {
      // Microphone is ready, so permission is granted
      setMicPermissionDenied(false);
    } else if (microphoneState === null) {
      // Check if permissions are already granted but not yet set up
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permissions already granted, but microphone not yet initialized
          setMicPermissionDenied(false);
          // Don't initialize here as that will happen in setupMicrophone
        })
        .catch(err => {
          if (err.name === 'NotAllowedError') {
            setMicPermissionDenied(true);
          }
        });
    }
  }, [microphoneState]);

  // Wake lock for preventing device sleep
  useEffect(() => {
    let wakeLock;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (isInitialized) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [isInitialized]);

  // Initialize Deepgram connection when microphone is ready
  useEffect(() => {
    if (microphoneState === 1 && socket && !isDisconnected && !manuallyDisconnected) {
      const onOpen = () => {
        // Create custom system prompt based on interview details
        const interviewDetailsSystemPrompt = `\n\nInterview level = ${interviewDifficulty} Interview type = ${interviewType}, Interview length = ${time}, Interview question: ${interviewQuestions}`;
        
        // Modify the default STS config to include interview details
        const interviewStsConfig = {
          ...stsConfig,
          agent: {
            ...stsConfig.agent,
            think: {
              ...stsConfig.agent.think,
              instructions: stsConfig.agent.think.instructions + interviewDetailsSystemPrompt
            }
          }
        };
        
        const combinedStsConfig = applyParamsToConfig(interviewStsConfig);
        sendSocketMessage(socket, combinedStsConfig);
        startMicrophone();
        startListening(true);
      };

      // Add event listener for WebSocket open event
      socket.addEventListener("open", onOpen);

      return () => {
        if (socket) {
          socket.removeEventListener("open", onOpen);
        }
        if (microphone && (microphone as any).ondataavailable) {
          (microphone as any).ondataavailable = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, socket, isDisconnected, manuallyDisconnected]);

  // Connect processor to send audio data to Deepgram
  useEffect(() => {
    if (!microphone) return;
    if (!socket) return;
    if (!processor) return;
    if (microphoneState !== 2) return;
    if (socketState !== 1) return;
    processor.onaudioprocess = sendMicToSocket(socket);
  }, [microphone, socket, microphoneState, socketState, processor]);

  // Handle sleep state - disable audio processing when sleeping
  useEffect(() => {
    if (!processor || socket?.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
    } else {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket]);

  // Create analyzer for user voice
  useEffect(() => {
    if (microphoneAudioContext && microphone) {
      userVoiceAnalyser.current = microphoneAudioContext.createAnalyser();
      userVoiceAnalyser.current.fftSize = 2048;
      userVoiceAnalyser.current.smoothingTimeConstant = 0.96;
      microphone.connect(userVoiceAnalyser.current);
    }
  }, [microphoneAudioContext, microphone]);

  // Connect to Deepgram when microphone is ready
  useEffect(() => {
    if (
      !isDisconnected && 
      !manuallyDisconnected && 
      microphoneState === 1 &&
      socketState === -1 &&
      isInitialized &&
      interviewReady
    ) {
      connectToDeepgram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    microphoneState,
    socketState,
    isInitialized,
    isDisconnected,
    manuallyDisconnected,
    interviewReady
  ]);

  // Audio buffering and playback
  const bufferAudio = useCallback((data) => {    
    if (!audioContext.current) {
      console.error("No audio context available for buffering");
      return;
    }
    
    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
    }
    
    const audioBuffer = createAudioBuffer(audioContext.current, data);
    
    if (!audioBuffer) {
      console.error("Failed to create audio buffer from data");
      return;
    }
    
    try {
      const source = playAudioBuffer(audioContext.current, audioBuffer, startTimeRef, agentVoiceAnalyser.current);
      scheduledAudioSources.current.push(source);
    } catch (error) {
      console.error("Error playing audio buffer:", error);
    }
  }, []);

  // Clear audio buffer
  const clearAudioBuffer = () => {
    scheduledAudioSources.current.forEach((source) => {
      if (source) {
        try {
          source.stop();
        } catch (err) {
          console.error("Error stopping audio source:", err);
        }
      }
    });
    scheduledAudioSources.current = [];
  };

  // Handle WebSocket message events
  const onMessage = useCallback(
    async (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (status !== VoiceBotStatus.SLEEPING && !isWaitingForUserVoiceAfterSleep.current) {
          bufferAudio(event.data); // Process the ArrayBuffer data to play the audio
        }
      } else {
        console.log(event?.data);
        // Handle other types of messages such as strings
        setData(event.data);
      }
    },
    [bufferAudio, status, isWaitingForUserVoiceAfterSleep]
  );

  // Add listener for WebSocket messages
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  // Handle updates to voice model
  useEffect(() => {
    if (previousVoiceRef.current && previousVoiceRef.current !== voice && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        model: voice,
      });
    }
    previousVoiceRef.current = voice;
  }, [voice, socket, socketState]);

  // Handle updates to instructions
  useEffect(() => {
    if (previousInstructionsRef.current !== instructions && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateInstructions",
        instructions: `${stsConfig.agent.think.instructions}\n${instructions}`,
      });
    }
    previousInstructionsRef.current = instructions;
  }, [instructions, socket, socketState, stsConfig.agent.think.instructions]);

  // Process incoming data from WebSocket
  useEffect(() => {
    if (typeof data === "string") {
      const userRole = (data) => {
        const userTranscript = data.content;

        /**
         * When the user says something, add it to the conversation queue.
         */
        if (status !== VoiceBotStatus.SLEEPING) {
          addVoicebotMessage({ user: userTranscript });
        }
      };

      /**
       * When the assistant/agent says something, add it to the conversation queue.
       */
      const assistantRole = (data) => {
        if (status !== VoiceBotStatus.SLEEPING && !isWaitingForUserVoiceAfterSleep.current) {
          startSpeaking();
          const assistantTranscript = data.content;
          addVoicebotMessage({ assistant: assistantTranscript });
        }
      };

      try {
        const parsedData = JSON.parse(data);

        /**
         * Nothing was parsed so return an error.
         */
        if (!parsedData) {
          throw new Error("No data returned in JSON.");
        }

        maybeRecordBehindTheScenesEvent(parsedData);

        /**
         * If it's a user message.
         */
        if (parsedData.role === "user") {
          startListening();
          userRole(parsedData);

          // Check for interview feedback request
          if (
            parsedData.content.toLowerCase().includes("feedback") && 
            parsedData.content.toLowerCase().includes("interview")
          ) {
            processFeedbackRequest();
          }
        }

        /**
         * If it's an agent message.
         */
        if (parsedData.role === "assistant") {
          if (status !== VoiceBotStatus.SLEEPING) {
            startSpeaking();
          }
          assistantRole(parsedData);
        }

        /**
         * The agent has finished speaking so we reset the sleep timer.
         */
        if (parsedData.type === EventType.AGENT_AUDIO_DONE) {
          startListening();
        }
        if (parsedData.type === EventType.USER_STARTED_SPEAKING) {
          isWaitingForUserVoiceAfterSleep.current = false;
          startListening();
          clearAudioBuffer();
        }
        if (parsedData.type === EventType.AGENT_STARTED_SPEAKING) {
          const { tts_latency, ttt_latency, total_latency } = parsedData;
          if (!tts_latency || !ttt_latency) return;
          const latencyMessage = { tts_latency, ttt_latency, total_latency };
          addVoicebotMessage(latencyMessage);
        }
      } catch (error) {
        console.error(data, error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status]);

  // Process feedback request
  const processFeedbackRequest = async () => {
    try {
      // Generate feedback at the end of interview - similar to storeFeedback in GeminiVoiceChat
      sendSystemMessage("Please provide comprehensive feedback on the candidate's performance in this interview. Include strengths, areas for improvement, and a final assessment. Also indicate whether the candidate passed or failed the interview.");
      
      // We'll simulate the function call instead of using Gemini's function calling
      // The real implementation would extract this data from the agent's response
      // But for prototype purposes, we'll create a simple placeholder
      
      // After getting all feedback, save it
      setTimeout(async () => {
        try {
          const dummyFeedback = {
            passed: true,  // This would be determined by the agent 
            strengths: "Strong communication skills and technical knowledge",
            areasForImprovement: "Could improve problem-solving approach",
            finalAssessment: "The candidate demonstrated good understanding of core concepts. They communicated clearly and were able to solve the problem with minimal assistance.",
          };
          
          await saveInterviewFeedback({
            interviewId,
            userId,
            ...dummyFeedback
          });
          
          await deductCoins({
            userId,
            coinCount,
            coinCost: interviewLength,
          });
          
          sendSystemMessage("The feedback has been saved. An internal record of the candidate's performance for this interview is saved.");
        } catch (error) {
          console.error("Error saving feedback:", error);
        }
      }, 5000);
    } catch (error) {
      console.error("Error processing feedback request:", error);
    }
  };

  // Handle behind the scenes events
  const maybeRecordBehindTheScenesEvent = (serverMsg) => {
    switch (serverMsg.type) {
      case EventType.SETTINGS_APPLIED:
        addBehindTheScenesEvent({
          type: EventType.SETTINGS_APPLIED,
        });
        break;
      case EventType.USER_STARTED_SPEAKING:
        if (status === VoiceBotStatus.SPEAKING) {
          addBehindTheScenesEvent({
            type: "Interruption",
          });
        }
        addBehindTheScenesEvent({
          type: EventType.USER_STARTED_SPEAKING,
        });
        break;
      case EventType.AGENT_STARTED_SPEAKING:
        addBehindTheScenesEvent({
          type: EventType.AGENT_STARTED_SPEAKING,
        });
        break;
      case EventType.CONVERSATION_TEXT: {
        const role = serverMsg.role;
        const content = serverMsg.content;
        addBehindTheScenesEvent({
          type: EventType.CONVERSATION_TEXT,
          role: role,
          content: content,
        });
        break;
      }
      case EventType.END_OF_THOUGHT:
        addBehindTheScenesEvent({
          type: EventType.END_OF_THOUGHT,
        });
        break;
    }
  };

  // Request microphone permissions
  const requestMicrophonePermission = async () => {
    try {
      // This will trigger the browser's permission dialog
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If we got here, permission was granted
      setMicPermissionDenied(false);
      
      // Only call setupMicrophone if it's not already initialized
      if (microphoneState === null || microphoneState === 0) {
        await setupMicrophone();
      }
      
      toast.success('Microphone access granted!');
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      setMicPermissionDenied(true);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Could not access microphone. Please check your device settings.');
      }
    }
  };

  // Initialize the interview
  const handleConnect = async () => {
    try {
      if (coinCount < interviewLength) {
        toast.error(`Error: Insufficient coins. You need ${interviewLength} coins to conduct this interview.`);
        return;
      }
      
      if (!microphone) {
        toast.error('Microphone access is required for the interview. Please grant permission.');
        requestMicrophonePermission();
        return;
      }
      
      // Initialize the audio context
      if (audioContext.current && audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      setIsInitialized(true);
      await initializeFeedback(userId, interviewId);
      
      // Greet message will be sent once the WebSocket is open
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to start interview. Please try again.');
    }
  };

  // Send a system message
  const sendSystemMessage = (text: string) => {
    if (isInitialized && text.trim() && socket && socket.readyState === WebSocket.OPEN) {
      try {
        sendSocketMessage(socket, {
          type: "UpdateInstructions",
          instructions: `${stsConfig.agent.think.instructions}\n${text}`
        });
      } catch (error) {
        console.error("Failed to send system message:", error);
      }
    }
  };

  // Start over the interview
  const handleDisconnect = () => {
    console.log("Disconnecting and reloading page...");
    
    // The most reliable way to ensure all resources are properly released
    // and the microphone is usable again is to simply reload the page
    window.location.reload();
  };

  // Toggle microphone (mute/unmute)
  const toggleMicrophone = () => {
    if (processor && processor.onaudioprocess) {
      processor.onaudioprocess = null;
    } else if (processor && socket) {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  };

  // Quit interview and navigate back to user profile
  const handleQuit = async () => {
    try {
      handleDisconnect();
      console.log("Quitting interview...");
      router.push(`/u/${userId}`);
    } catch (error) {
      console.log("Error: " + error);
      toast.error("Error quitting interview");
    }
  };

  // Handle code editor outputs
  const updateCodeOutput = (output: string, code: string) => {
    console.log("Code output: " + output);
    sendSystemMessage(`Candidate ran the code. \nOutput: ${output}\n\nCandidate's code: ${code}`);
  };

  const updateCode = (code: string) => {
    console.log("Code: " + code);
    sendSystemMessage(`Current candidate code: ${code}`);
  };

  // Handle voice interaction
  const handleVoiceBotAction = () => {
    console.log("Starting voice interaction");
    
    if (audioContext.current && audioContext.current.state === 'suspended') {
      audioContext.current.resume().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
    }
    
    if (!isInitialized) {
      return;
    }

    if (status !== VoiceBotStatus.NONE) {
      toggleSleep();
    }
  };

  // Determine if agent is speaking
  const isSpeaking = status === VoiceBotStatus.SPEAKING;

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
                <Image src="/icon.png" alt="deepgram" width={65} height={54} className="object-cover" />
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
            {!isInitialized ? (
              <>
                <Button
                  disabled={!interviewReady || !microphone}
                  onClick={handleConnect}
                  className="w-[150px] bg-white text-black font-bold px-4 py-2 hover:cursor-pointer"
                >
                  Start Interview
                </Button>
                {micPermissionDenied && (
                  <Button
                    onClick={requestMicrophonePermission}
                    className="w-[200px] bg-blue-500 text-white font-semibold hover:cursor-pointer"
                  >
                    Grant Microphone Access
                  </Button>
                )}
                {(!microphone || micPermissionDenied) && (
                  <div className="text-red-500 text-sm font-normal ml-2 flex items-center">
                    Microphone access is required
                  </div>
                )}
              </>
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
                  className={`${processor?.onaudioprocess ? 'bg-red-400' : 'bg-green-500'} w-[150px] text-white font-semibold hover:cursor-pointer`}
                >
                  {processor?.onaudioprocess ? 'Mute Microphone' : 'Enable Microphone'}
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
          
          {/* Transcript Section */}
          <div className="h-20 md:h-12 text-sm md:text-base mt-2 flex flex-col items-center text-gray-200 overflow-y-auto">
            {messages.length > 0 ? <Transcript /> : null}
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
            {isInitialized
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
              <div>
                  Press: Start Interview
              </div>
            }
          </div>

          {/* Transcript Section */}
          <div className="h-20 md:h-12 text-sm md:text-base mt-2 flex flex-col items-center text-gray-200 overflow-y-auto">
            {messages.length > 0 ? <Transcript /> : null}
          </div>
          
          {/* Controls at the bottom */}
          <div className="py-4">
            <div className="w-full flex flex-wrap items-center justify-center gap-6 font-bold">
              {!isInitialized ? (
                <>
                  <Button
                    disabled={!interviewReady || !microphone}
                    onClick={handleConnect}
                    className="w-[150px] bg-white text-black font-bold px-4 py-2 hover:cursor-pointer"
                  >
                    Start Interview
                  </Button>
                  {micPermissionDenied && (
                    <Button
                      onClick={requestMicrophonePermission}
                      className="w-[200px] bg-blue-500 text-white font-semibold hover:cursor-pointer"
                    >
                      Grant Microphone Access
                    </Button>
                  )}
                  {(!microphone || micPermissionDenied) && (
                    <div className="text-red-500 text-sm font-normal w-full text-center mt-2">
                      Microphone access is required
                    </div>
                  )}
                </>
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
                    className={`${processor?.onaudioprocess ? 'bg-red-400' : 'bg-green-500'} w-[150px] text-white font-semibold hover:cursor-pointer`}
                  >
                    {processor?.onaudioprocess ? 'Mute Microphone' : 'Enable Microphone'}
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
    </div>
  );
}

export default DeepgramInterview;