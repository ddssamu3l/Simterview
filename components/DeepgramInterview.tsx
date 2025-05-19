/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useMemo } from "react";
import Image from 'next/image';
import { formatTime } from '@/lib/utils';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { getInterview } from '@/lib/interview';
import { saveInterviewFeedback } from '@/app/api/interview/post/route';
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
import { behavioralSystemPrompt, technicalSystemPrompt } from "@/public";

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
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

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
  const [interviewEditorial, setInterviewEditorial] = useState("");
  const [fullSystemPrompt, setFullSystemPrompt] = useState("");
  const [lastCodeOutput, setLastCodeOutput] = useState<string>('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [isMicManuallyMuted, setIsMicManuallyMuted] = useState(false);

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
  const lastUserSpeakingTime = useRef<number>(Date.now());
  const userInactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const keepAliveTimer = useRef<NodeJS.Timeout | null>(null);

  // Clean up resources and navigate
  const cleanupAndNavigate = useCallback((destinationUrl: string, skipNavigation: boolean = false) => {
    try {
      // Deduct coins and clean up
      const minutesLeft = Math.floor(time/60);
      const coinCost = Math.max(0, interviewLength - minutesLeft);
      console.log(`Leaving interview... Deducting ${coinCost} coins`);
      
      // Make synchronous XHR request to deduct coins
     
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/user/post', false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ userId, coinCount, coinCost }));
      
      // Manually clean up resources (without the page reload)
      // Clear all timers
      if (userInactivityTimer.current) {
        clearInterval(userInactivityTimer.current);
        userInactivityTimer.current = null;
      }
      
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;
      }
      
      // Stop the microphone completely
      if (stopMicrophone) {
        stopMicrophone();
      }
      
      // Disconnect from Deepgram websocket
      if (disconnectFromDeepgram) {
        disconnectFromDeepgram();
      }
      
      // Clear all scheduled audio playback sources
      scheduledAudioSources.current.forEach(source => {
        if (source) {
          try {
            source.stop();
            source.disconnect();
          } catch (err) {
            // Ignore errors during cleanup
          }
        }
      });
      
      // Suspend audio context if possible
      if (audioContext.current && audioContext.current.state !== 'closed') {
        try {
          audioContext.current.suspend();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
      
      if (!skipNavigation) {
        // Then navigate
        window.location.href = destinationUrl;
      } else {
        console.log("Cleanup executed, navigation skipped.");
      }
    } catch (error) {
      console.error("Error during navigation cleanup:", error);
      // Continue with navigation even if there's an error, but only if not skipping navigation
      if (!skipNavigation) {
        window.location.href = destinationUrl;
      }
    }
  }, [time, interviewLength, userId, coinCount, stopMicrophone, disconnectFromDeepgram, audioContext]);

  // Function calling logic (tools)
  interface SaveInterviewFeedbackInput {
    passed: number;
    strengths: string;
    areasForImprovement: string;
    finalAssessment: string;
  }

  // Function signature for mapping tool calls
  type FuncType = (
    input: SaveInterviewFeedbackInput
  ) => Promise<{ toolResponse: string }>;

  // Actual save handler, returns a string response
  const handleSaveInterviewFeedback = useCallback(async (
    { passed, strengths, areasForImprovement, finalAssessment }: SaveInterviewFeedbackInput
  ): Promise<string> => {
    try {
      console.log("Saving interview feedback: " + finalAssessment);
      // Convert numeric passed to boolean
      const pass = passed > 0;
      // Call your Firestore function (expects object)
      await saveInterviewFeedback({
        interviewId,
        userId,
        passed: pass,
        strengths,
        areasForImprovement,
        finalAssessment,
      });
      return 'Feedback saved successfully';
    } catch (error) {
      console.error('Error saving interview feedback:', error);
      toast.error('Error saving interview feedback: ' + error);
      return 'An error occured while saving feedback. Please try again.';
    }
  }, [interviewId, userId]);

  // Map function names to handlers for AI tool calls
  const functionsMap: Record<string, FuncType> = useMemo(() => ({
    saveInterviewFeedback: async (input) => ({
      toolResponse: await handleSaveInterviewFeedback(input),
    }),
  }), [handleSaveInterviewFeedback]);

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
          if (interviewDetails.data.editorial) { setInterviewEditorial(interviewDetails.data.editorial); }
          setInterviewReady(true);
          setTime(interviewDetails.data.length * 60);
          setIsBehavioral(interviewDetails.data.type === "behavioral");

          // Create custom system prompt based on interview details
          const interviewDetailsSystemPrompt = `\n\n\nINTERVIEW CONTENTS: \n\nInterview level = ${interviewDetails.data.difficulty} Interview type = ${interviewDetails.data.type}, Interview length = ${interviewDetails.data.length} minutes, Interview questions:\n ${interviewDetails.data.questions.join('\n')} \n${interviewDetails.data.editorial === "" || !interviewDetails.data.editorial ? "" : "editorial solution:\n" + interviewDetails.data.editorial}`;
          setFullSystemPrompt((interviewDetails.data.type === "behavioral" ? behavioralSystemPrompt : technicalSystemPrompt) + interviewDetailsSystemPrompt);
        } else {
          throw new Error("Error: interview data missing or belongs to another user.");
        }
      } catch (error) {
        console.log("Error fetching interview details: " + error);
        toast.error("Error fetching interview details. Please refresh the page.");
      }
    }
    getInterviewDetails();
  }, [interviewId, userId]);

  // Quit interview by using our cleanup and navigation function
  const handleQuit = useCallback(() => {
    // Use the same cleanup function that's used by the click handler
    cleanupAndNavigate(`/u/${userId}`);
  }, [cleanupAndNavigate, userId]);

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

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, isInitialized, isDisconnected, handleQuit]);

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
        // Modify the default STS config to include interview details
        const interviewStsConfig = {
          ...stsConfig,
          agent: {
            ...stsConfig.agent,
            think: {
              ...stsConfig.agent.think,
              instructions: (fullSystemPrompt),
            }
          }
        };
        
        const combinedStsConfig = applyParamsToConfig(interviewStsConfig);
        
        // Send the configuration first
        sendSocketMessage(socket, combinedStsConfig);
        
        // Wait for configuration to be received before starting the microphone
        setTimeout(() => {
          console.log("Starting microphone after configuration sent");
          startMicrophone();
          startListening(true);
        }, 300); // 300ms delay to ensure settings are processed
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

  // Track configuration acknowledgment
  const [settingsApplied, setSettingsApplied] = useState(false);

  // Connect processor to send audio data to Deepgram only after settings are applied
  useEffect(() => {
    if (!microphone) return;
    if (!socket) return;
    if (!processor) return;
    if (microphoneState !== 2) return;
    if (socketState !== 1) return;
    
    // Only connect the processor if settings have been applied or after a safety timeout
    if (settingsApplied) {
      console.log("Connecting audio processor after settings were applied");
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [microphone, socket, microphoneState, socketState, processor, settingsApplied]);

  // Handle sleep state - disable audio processing when sleeping
  useEffect(() => {
    if (!processor || socket?.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
      toast.message("Your interviewer fell asleep from your inactivity. Please re-connect your mic!");
    } else if (!isMicManuallyMuted) {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket, isMicManuallyMuted]);

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
  // Explicitly handle initialization sequence
  // 1. First connect to Deepgram
  // 2. Wait for socket to open and send config
  // 3. Only after settings are applied, start the microphone
  useEffect(() => {
    if (
      !isDisconnected && 
      !manuallyDisconnected && 
      microphoneState === 1 &&
      socketState === -1 &&
      isInitialized &&
      interviewReady
    ) {
      // This connects the socket, but microphone is started in the socket.onopen handler
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
    // connectToDeepgram was missing here but is used, it should be stable from context provider
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
        // Process audio data from the agent with less restrictive conditions
        // Remove the isWaitingForUserVoiceAfterSleep check since it's preventing audio after sleep
        if (settingsApplied) {
          // Allow audio output even when waiting for user voice after sleep
          bufferAudio(event.data); // Process the ArrayBuffer data to play the audio
          
          // If we're processing audio, we should also ensure we're not in waiting state
          if (isWaitingForUserVoiceAfterSleep.current) {
            console.log("Audio received from agent - resetting wait state");
            isWaitingForUserVoiceAfterSleep.current = false;
          }
        }
      } else {
        console.log(event?.data);
        // Handle other types of messages such as strings
        setData(event.data);
      }
    },
    [bufferAudio, settingsApplied, isWaitingForUserVoiceAfterSleep]
  );

  // Add listener for WebSocket messages
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  // Handle updates to voice model - only after settings have been applied
  useEffect(() => {
    if (previousVoiceRef.current && previousVoiceRef.current !== voice && socket && socketState === 1 && settingsApplied) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        model: voice,
      });
    }
    previousVoiceRef.current = voice;
  }, [voice, socket, socketState, settingsApplied]);
  
  // Special handler for when agent wakes from sleep
  useEffect(() => {
    if (status === VoiceBotStatus.LISTENING && socket && socketState === 1 && processor) {
      // If we've just transitioned back to listening state (e.g., after sleep)
      if (audioContext.current && audioContext.current.state !== 'running') {
        audioContext.current.resume().catch(err => {
          console.error("Failed to resume audio context after wake:", err);
        });
      }
      
      // Ensure the audio processor is connected, but only if not manually muted
      if (!processor.onaudioprocess && !isMicManuallyMuted) {
        console.log("Reconnecting audio processor after state change (not manually muted)");
        processor.onaudioprocess = sendMicToSocket(socket);
      }
    }
  }, [status, socket, socketState, processor, isMicManuallyMuted]);

  // Handle updates to instructions - only after settings have been applied
  useEffect(() => {
    if (previousInstructionsRef.current !== instructions && socket && socketState === 1 && settingsApplied) {
      sendSocketMessage(socket, {
        type: "UpdatePrompt",
        prompt: `${stsConfig.agent.think.instructions}\n${instructions}`,
      });
    }
    previousInstructionsRef.current = instructions;
  }, [instructions, socket, socketState, stsConfig.agent.think.instructions, settingsApplied]);

  // Process incoming data from WebSocket
  useEffect(() => {
    if (typeof data === "string") {
      const userRole = (parsedData: any) => {
        const userTranscript = parsedData.content;

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
      const assistantRole = (parsedData: any) => {
        // Always allow agent response to be processed regardless of sleep state
        // This ensures the agent's responses are always added to the queue and spoken
        // startSpeaking(); // Removed: will be called conditionally in useEffect
        const assistantTranscript = parsedData.content;
        addVoicebotMessage({ assistant: assistantTranscript });
        
        // Ensure we're not in waiting state when the agent is responding
        if (isWaitingForUserVoiceAfterSleep.current) {
          console.log("Assistant speaking - resetting wait state");
          isWaitingForUserVoiceAfterSleep.current = false;
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

        // Check for settings applied message to enable audio processing
        if (parsedData.type === EventType.SETTINGS_APPLIED) {
          console.log("Settings applied successfully by Deepgram");
          setSettingsApplied(true);
        }

        /**
         * If it's a user message.
         */
        if (parsedData.role === "user") {
          // Update the last time the user spoke
          lastUserSpeakingTime.current = Date.now();
          
          if (status !== VoiceBotStatus.LISTENING) {
            startListening();
          }
          userRole(parsedData);
        }

        /**
         * If it's an agent message.
         */
        if (parsedData.role === "assistant") {
          if (status !== VoiceBotStatus.SPEAKING) {
            startSpeaking();
          }
          assistantRole(parsedData);
        }

        /**
         * The agent has finished speaking so we reset the sleep timer.
         */
        if (parsedData.type === EventType.AGENT_AUDIO_DONE) {
          if (status !== VoiceBotStatus.LISTENING) {
            startListening();
          }
        }
        if (parsedData.type === EventType.USER_STARTED_SPEAKING) {
          // Update the last time the user spoke
          lastUserSpeakingTime.current = Date.now();
          console.log("User speaking detected, resetting inactivity timer");
          
          isWaitingForUserVoiceAfterSleep.current = false;
          if (status !== VoiceBotStatus.LISTENING) {
            startListening();
          }
          clearAudioBuffer();
        }
        if (parsedData.type === EventType.AGENT_STARTED_SPEAKING) {
          const { tts_latency, ttt_latency, total_latency } = parsedData;
          if (!tts_latency || !ttt_latency) return;
          const latencyMessage = { tts_latency, ttt_latency, total_latency };
          addVoicebotMessage(latencyMessage);
        }

        /**
         * If it's a function call
         */
        if(parsedData.type === EventType.FUNCTION_CALL_REQUEST) {
          // get the parameters from the server message
          const { function_name, function_call_id, input} = parsedData;
          // call the function with a functions map, get the result, and send a functionCallResponse message back through the socket
          async function getToolResponse(){
            const toolResult = await functionsMap[function_name](input);
            sendSocketMessage(socket, {
              "type": "FunctionCallResponse",
              "function_call_id": function_call_id,
              "output": toolResult.toolResponse,
            });
          }
          getToolResponse();
        }
      } catch (error) {
        console.error(data, error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status, functionsMap, socket]);

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

  // User inactivity tracking - check if user has been silent for too long
  useEffect(() => {
    if (!isInitialized || isDisconnected) return;
    
    // Setup inactivity timer that checks every 30 seconds
    userInactivityTimer.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - lastUserSpeakingTime.current) / (1000 * 60);
      
      // If user hasn't spoken for 5 minutes
      if (elapsedMinutes >= 5) {
        console.log("User inactive for 5 minutes, disconnecting...");
        toast.info("No activity detected for 5 minutes. Restarting interview...");
        handleDisconnect();
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      if (userInactivityTimer.current) {
        clearInterval(userInactivityTimer.current);
      }
    };
  }, [isInitialized, isDisconnected]);
  
  // Start a keep-alive timer to maintain agent audio capabilities
  useEffect(() => {
    if (!isInitialized || isDisconnected || !socket || socketState !== 1) return;
    
    // Send a keep-alive message every 30 seconds to prevent audio capability loss
    keepAliveTimer.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending keep-alive to maintain agent audio connection");
        sendSocketMessage(socket, { type: "KeepAlive" });
      }
    }, 28000); // Every 30 seconds
    
    return () => {
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;
      }
    };
  }, [isInitialized, isDisconnected, socket, socketState]);
  
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
      
      // Reset user speaking time tracking
      lastUserSpeakingTime.current = Date.now();
      
      setIsInitialized(true);
      await initializeFeedback(userId, interviewId);
      
      // Greet message will be sent once the WebSocket is open
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to start interview. Please try again.');
    }
  };

  // Send a system message TODO find a better way than just updating systems message
  const sendSystemMessage = (text: string) => {
    if (isInitialized && text.trim() && socket && socket.readyState === WebSocket.OPEN) {
      try {
        const minutesLeft = Math.floor(time / 60);
        console.log(minutesLeft + " minutes left");

        sendSocketMessage(socket, {
          type: "UpdatePrompt",
          prompt: `${fullSystemPrompt}\n\nThere are ${minutesLeft} minutes left in the interview. \n\n${text}`
        });
      } catch (error) {
        console.error("Failed to send system message:", error);
      }
    }
  };

  // Start over the interview
  const handleDisconnect = useCallback((refresh: boolean = true) => {
    if (isInitialized) {
      const confirmed = window.confirm("Are you sure you want to start over? This will end the current interview and reset its state.");
      if (!confirmed) {
        return; // User cancelled the action
      }
    }

    console.log("Disconnecting and starting over...");
    
    // Clear all timers
    if (userInactivityTimer.current) {
      clearInterval(userInactivityTimer.current);
      userInactivityTimer.current = null;
    }
    
    if (keepAliveTimer.current) {
      clearInterval(keepAliveTimer.current);
      keepAliveTimer.current = null;
    }
    
    // Set UI state first to prevent any race conditions
    setIsDisconnected(true);
    setIsInitialized(false);
    setTime(interviewLength * 60);
    
    // Clear all scheduled audio playback sources
    scheduledAudioSources.current.forEach(source => {
      if (source) {
        try {
          source.stop();
          source.disconnect();
        } catch (err) {
          console.error("Error stopping audio source:", err);
        }
      }
    });
    scheduledAudioSources.current = [];
    
    // Stop audio contexts if they exist
    if (audioContext.current) {
      try {
        if (audioContext.current.state !== 'closed') {
          audioContext.current.suspend();
        }
      } catch (err) {
        console.error("Error suspending audio context:", err);
      }
    }
    
    // Stop the microphone completely
    if (stopMicrophone) {
      stopMicrophone();
    }
    
    // Disconnect from Deepgram websocket
    if (disconnectFromDeepgram) {
      disconnectFromDeepgram();
    }
    
    // Reload the page to ensure a completely fresh start
    // This is the most reliable way to reset browser audio state
    if(refresh) window.location.reload();
  }, [time, interviewLength, userId, coinCount, stopMicrophone, disconnectFromDeepgram]);

  // Toggle microphone (mute/unmute)
  const toggleMicrophone = () => {
    if (processor && processor.onaudioprocess) {
      // Muting microphone
      processor.onaudioprocess = null;
      setIsMicManuallyMuted(true);
    } else if (processor && socket) {
      // Unmuting microphone
      processor.onaudioprocess = sendMicToSocket(socket);
      setIsMicManuallyMuted(false);
      
      // When re-enabling the microphone, ensure we're not in sleep mode
      // and ensure we're not waiting for user voice
      if (status === VoiceBotStatus.SLEEPING) {
        startListening(true); // Force start listening mode
      }
      
      if (isWaitingForUserVoiceAfterSleep.current) { // Guard against null ref
        isWaitingForUserVoiceAfterSleep.current = false;
      }
      console.log("Microphone enabled - resetting speech recognition state");
    }
  };

  // Handle code editor outputs
  const updateCodeOutput = (output: string, code: string) => {
    console.log("Code output: " + output);
    sendSystemMessage(`\n\nCandidate ran the code. \nOutput: ${output}\n\nCandidate's code: ${code}`);
  };

  const updateCode = (code: string) => {
    console.log("Code: " + code);
    sendSystemMessage(`\n\nCurrent candidate code: ${code}`);
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

  // For Next.js client-side navigations (e.g., NavBar links)
  // This will be called by the effect when pathname changes.
  const handleRouteChangeStart = useCallback((url: string, currentPath: string) => {
    console.log(`handleRouteChangeStart called. Attempted navigation to: ${url}, current path was: ${currentPath}`);
    if (isInitialized && url !== currentPath) {
      // This confirmation happens *after* the navigation has started if triggered by a Link.
      // It serves to confirm cleanup or attempt to revert navigation.
      const confirmed = window.confirm("You are leaving the interview. Confirm to save progress and clean up?");
      if (confirmed) {
        console.log("User confirmed cleanup after route change.");
        cleanupAndNavigate(url, true); 
      } else {
        console.log("User cancelled cleanup after route change. Attempting to navigate back.");
        router.push(currentPath); // Attempt to navigate back to the original path
      }
    }
  }, [isInitialized, cleanupAndNavigate, router]);

  // Handle user attempting to leave the page
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // For browser-level navigations (refresh, close, direct URL change)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log("handleBeforeUnload triggered");
      const confirmationMessage = 'Are you sure you want to leave? Your interview progress may be lost, and related actions will be taken.';
      event.preventDefault();
      event.returnValue = confirmationMessage;
      return confirmationMessage;
    };

    // Fallback cleanup for when the page is actually being hidden
    const handlePageHide = () => {
      if (isInitialized) {
        console.log("handlePageHide triggered, attempting cleanup via cleanupAndNavigate (skipNavigation=true)");
        cleanupAndNavigate("dummy_url_not_used_for_pagehide", true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Store the previous pathname to detect changes
    if (previousPathnameRef.current !== pathname) {
      // Pathname has changed, meaning a client-side navigation likely occurred.
      // Call handleRouteChangeStart with the new pathname (url) and the previous one.
      console.log(`Pathname changed from ${previousPathnameRef.current} to ${pathname}. Triggering handleRouteChangeStart.`);
      handleRouteChangeStart(pathname, previousPathnameRef.current);
      previousPathnameRef.current = pathname; // Update ref for next render
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isInitialized, cleanupAndNavigate, router, pathname, handleRouteChangeStart]); // router is likely stable, pathname is key for client nav detection

  return (
    <div className="flex flex-col call-view h-full">
      {isBehavioral ? (
        // Original UI for Behavioral interviews
        <div className="mt-24 flex flex-col h-full w-full border-b items-center justify-between">
          <div className="">
            <div className="text-2xl font-semibold text-center">
              Time: {formatTime(time)}
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
                  onClick={() => handleDisconnect()}
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
        </div>
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
                  {/* <Button
                    onClick={() => handleDisconnect()}
                    className="w-[150px] bg-red-500 text-white font-semibold hover:cursor-pointer"
                  >
                    Start Over
                  </Button> */}
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