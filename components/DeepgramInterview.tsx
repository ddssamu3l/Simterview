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
  const [data, setData] = useState<any>();
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
  const [currentAgentThinkProvider, setCurrentAgentThinkProvider] = useState(stsConfig.agent?.think?.provider);

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
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/user/post', false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ userId, coinCount, coinCost }));
      
      if (userInactivityTimer.current) {
        clearInterval(userInactivityTimer.current);
        userInactivityTimer.current = null;
      }
      
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;
      }
      
      if (stopMicrophone) {
        stopMicrophone();
      }
      
      if (disconnectFromDeepgram) {
        disconnectFromDeepgram();
      }
      
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
      scheduledAudioSources.current = [];
      
      if (audioContext.current && audioContext.current.state !== 'closed') {
        try {
          audioContext.current.suspend();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
      
      if (!skipNavigation) {
        window.location.href = destinationUrl;
      } else {
        console.log("Cleanup executed, navigation skipped.");
      }
    } catch (error) {
      console.error("Error during navigation cleanup:", error);
      if (!skipNavigation) {
        window.location.href = destinationUrl;
      }
    }
  }, [time, interviewLength, userId, coinCount, stopMicrophone, disconnectFromDeepgram, audioContext]);

  interface SaveInterviewFeedbackInput {
    passed: number;
    strengths: string;
    areasForImprovement: string;
    finalAssessment: string;
  }

  type FuncType = (
    input: SaveInterviewFeedbackInput | any // Adjusted for parsedArgs
  ) => Promise<{ toolResponse: string }>;

  const handleSaveInterviewFeedback = useCallback(async (
    { passed, strengths, areasForImprovement, finalAssessment }: SaveInterviewFeedbackInput
  ): Promise<string> => {
    try {
      console.log("Saving interview feedback: " + finalAssessment);
      const pass = passed > 0;
      await saveInterviewFeedback({
        interviewId,
        userId,
        passed: pass,
        strengths,
        areasForImprovement,
        finalAssessment,
      });
      return 'Feedback saved successfully';
    } catch (error: any) {
      console.error('Error saving interview feedback:', error);
      toast.error('Error saving interview feedback: ' + error.message || error);
      return 'An error occured while saving feedback. Please try again.';
    }
  }, [interviewId, userId]);

  const functionsMap: Record<string, FuncType> = useMemo(() => ({
    saveInterviewFeedback: async (input) => ({
      toolResponse: await handleSaveInterviewFeedback(input),
    }),
  }), [handleSaveInterviewFeedback]);

  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      agentVoiceAnalyser.current = audioContext.current.createAnalyser();
      if (agentVoiceAnalyser.current) {
        agentVoiceAnalyser.current.fftSize = 2048;
        agentVoiceAnalyser.current.smoothingTimeConstant = 0.96;
      }
    }
  }, []);

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
          const behavioral = interviewDetails.data.type === "behavioral";
          setIsBehavioral(behavioral);

          const basePrompt = behavioral ? behavioralSystemPrompt : technicalSystemPrompt;
          const interviewDetailsSystemPrompt = `\\n\\n\\nINTERVIEW CONTENTS: \\n\\nInterview level = ${interviewDetails.data.difficulty} Interview type = ${interviewDetails.data.type}, Interview length = ${interviewDetails.data.length} minutes, Interview questions:\\n ${interviewDetails.data.questions.join('\\n')} \\n${interviewDetails.data.editorial === "" || !interviewDetails.data.editorial ? "" : "editorial solution:\\n" + interviewDetails.data.editorial}`;
          setFullSystemPrompt(basePrompt + interviewDetailsSystemPrompt);
          
          setCurrentAgentThinkProvider(stsConfig.agent?.think?.provider);
        } else {
          throw new Error("Error: interview data missing or belongs to another user.");
        }
      } catch (error: any) {
        console.log("Error fetching interview details: " + error);
        toast.error("Error fetching interview details. Please refresh the page.");
      }
    }
    getInterviewDetails();
  }, [interviewId, userId]);

  const handleQuit = useCallback(() => {
    cleanupAndNavigate(`/u/${userId}`);
  }, [cleanupAndNavigate, userId]);

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
  }, [time, isInitialized, isDisconnected, handleQuit]);

  useEffect(() => {
    if (microphoneState === null) {
      setupMicrophone().catch((error: any) => {
        console.error('Microphone setup failed:', error);
        if (error.name === 'NotAllowedError') {
          setMicPermissionDenied(true);
        }
      });
    }
  }, [setupMicrophone, microphoneState]);
  
  useEffect(() => {
    if (microphoneState === 1) {
      setMicPermissionDenied(false);
    } else if (microphoneState === null) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setMicPermissionDenied(false);
        })
        .catch(err => {
          if (err.name === 'NotAllowedError') {
            setMicPermissionDenied(true);
          }
        });
    }
  }, [microphoneState]);

  useEffect(() => {
    let wakeLock: any;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
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
        // Base V1 settings structure from deepgramConstants.ts
        // Override prompt and model based on interview type
        const initialSettings = JSON.parse(JSON.stringify(stsConfig)); // Deep clone

        if (initialSettings.agent && initialSettings.agent.think) {
          initialSettings.agent.think.prompt = fullSystemPrompt;
          // Model selection based on interview type
          initialSettings.agent.think.provider.model = isBehavioral ? "gpt-4.1-mini" : "gpt-4.1"; 
           // Store the potentially modified provider for later use in prompt updates
           setCurrentAgentThinkProvider(initialSettings.agent.think.provider);
        }
        
        // applyParamsToConfig MIGHT modify voice (speak.provider.model) or initial prompt (think.prompt)
        // Ensure applyParamsToConfig is V1 aware if it modifies these directly.
        // For now, we assume it returns params that are handled elsewhere or it modifies a V1 config.
        // If applyParamsToConfig is meant to set the *initial* voice/prompt from query params:
        let combinedStsConfig = initialSettings;
        if (applyParamsToConfig) { // Check if hook and function exist
            // This function needs to be V1 compatible if it directly mutates the config
            // e.g., changing combinedStsConfig.agent.think.prompt or combinedStsConfig.agent.speak.provider.model
             combinedStsConfig = applyParamsToConfig(initialSettings);
        }
        sendSocketMessage(socket, combinedStsConfig);
        
        setTimeout(() => {
          console.log("Starting microphone after configuration sent");
          if (startMicrophone) startMicrophone();
          if (startListening) startListening(true);
        }, 300);
      };

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
  }, [microphoneState, socket, isDisconnected, manuallyDisconnected, fullSystemPrompt, isBehavioral, stsConfig, applyParamsToConfig, startMicrophone, startListening, microphone]);

  const [settingsApplied, setSettingsApplied] = useState(false);

  useEffect(() => {
    if (!microphone) return;
    if (!socket) return;
    if (!processor) return;
    if (microphoneState !== 2) return;
    if (socketState !== 1) return;
    
    if (settingsApplied) {
      console.log("Connecting audio processor after settings were applied");
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [microphone, socket, microphoneState, socketState, processor, settingsApplied]);

  useEffect(() => {
    if (!processor || !socket || socket.readyState !== 1) return; // Added !socket null check
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
      toast.message("Your interviewer fell asleep from your inactivity. Please re-connect your mic!");
    } else if (!isMicManuallyMuted) {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket, isMicManuallyMuted]);

  useEffect(() => {
    if (microphoneAudioContext && microphone && userVoiceAnalyser.current === null) { // Check if already created
        const newAnalyser = microphoneAudioContext.createAnalyser();
        newAnalyser.fftSize = 2048;
        newAnalyser.smoothingTimeConstant = 0.96;
        microphone.connect(newAnalyser);
        userVoiceAnalyser.current = newAnalyser;
    }
  }, [microphoneAudioContext, microphone]);
  
  useEffect(() => {
    if (
      !isDisconnected && 
      !manuallyDisconnected && 
      microphoneState === 1 &&
      socketState === -1 &&
      isInitialized &&
      interviewReady &&
      fullSystemPrompt // Ensure fullSystemPrompt is ready before connecting
    ) {
      if (connectToDeepgram) connectToDeepgram();
    }
  }, [
    microphoneState,
    socketState,
    isInitialized,
    isDisconnected,
    manuallyDisconnected,
    interviewReady,
    connectToDeepgram, // Added connectToDeepgram to dependencies
    fullSystemPrompt
  ]);

  const bufferAudio = useCallback((audioData: ArrayBuffer) => {    // Added type for audioData
    if (!audioContext.current) {
      console.error("No audio context available for buffering");
      return;
    }
    
    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
    }
    
    const audioBuffer = createAudioBuffer(audioContext.current, audioData);
    
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

  const onMessage = useCallback(
    async (event: MessageEvent) => { // Typed event
      if (event.data instanceof ArrayBuffer) {
        if (settingsApplied) {
          bufferAudio(event.data);
          if (isWaitingForUserVoiceAfterSleep && isWaitingForUserVoiceAfterSleep.current) {
            console.log("Audio received from agent - resetting wait state");
            isWaitingForUserVoiceAfterSleep.current = false;
          }
        }
      } else {
        console.log("Raw message:", event?.data);
        setData(event.data); // Continue to set data for useEffect [data] to process
      }
    },
    [bufferAudio, settingsApplied, isWaitingForUserVoiceAfterSleep]
  );

  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  // Handle updates to voice model - only after settings have been applied
  useEffect(() => {
    // 'voice' comes from useStsQueryParams()
    if (previousVoiceRef.current !== voice && voice && socket && socketState === 1 && settingsApplied) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        speak: { // V1 structure
          provider: {
            type: "deepgram", // Assuming deepgram provider for voice
            model: voice,
          }
        }
      });
    }
    previousVoiceRef.current = voice;
  }, [voice, socket, socketState, settingsApplied]);
  
  useEffect(() => {
    if (status === VoiceBotStatus.LISTENING && socket && socketState === 1 && processor) {
      if (audioContext.current && audioContext.current.state !== 'running') {
        audioContext.current.resume().catch(err => {
          console.error("Failed to resume audio context after wake:", err);
        });
      }
      
      if (!processor.onaudioprocess && !isMicManuallyMuted) {
        console.log("Reconnecting audio processor after state change (not manually muted)");
        processor.onaudioprocess = sendMicToSocket(socket);
      }
    }
  }, [status, socket, socketState, processor, isMicManuallyMuted]);

  // Dynamically update prompt using Settings message (replaces UpdatePrompt)
  // 'instructions' from useStsQueryParams() is assumed to be for dynamic updates via query params.
  // If 'instructions' is only for initial setup, this useEffect might not be needed or behave differently.
  useEffect(() => {
    if (previousInstructionsRef.current !== instructions && instructions && socket && socketState === 1 && settingsApplied && fullSystemPrompt && currentAgentThinkProvider) {
      console.log("Updating prompt due to instructions change (from query params).");
      const newPromptContent = `${fullSystemPrompt}\\n${instructions}`; // Combine base prompt with new dynamic instructions
      sendSocketMessage(socket, {
        type: "Settings",
        audio: stsConfig.audio,
        agent: {
          think: {
            provider: currentAgentThinkProvider, // Use the stored/current provider settings
            prompt: newPromptContent,
          }
        }
      });
    }
    previousInstructionsRef.current = instructions;
  }, [instructions, socket, socketState, settingsApplied, fullSystemPrompt, currentAgentThinkProvider]);


  // Process incoming data from WebSocket
  useEffect(() => {
    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data);

        if (!parsedData || !parsedData.type) { 
          if (data.trim() !== "") {
             console.log("Received non-JSON or typeless message:", data);
          }
          return;
        }
        
        console.log("Processing message type:", parsedData.type, parsedData);

        switch (parsedData.type) {
          case "Welcome": 
            console.log("Welcome message received, request_id:", parsedData.request_id);
            break;
          case EventType.SETTINGS_APPLIED:
            console.log("Settings applied successfully by Deepgram");
            setSettingsApplied(true);
            break;
          case EventType.PROMPT_UPDATED:
            console.log("Prompt updated successfully by Deepgram.");
            break;
          case EventType.SPEAK_UPDATED:
            console.log("Speak settings updated successfully by Deepgram.");
            break;
          case EventType.WARNING:
            console.warn("Agent Warning:", parsedData.description);
            toast.warning(`Agent warning: ${parsedData.description}`);
            break;
          case EventType.AGENT_THINKING:
            console.log("Agent is thinking...");
            break;
          case "Error": 
            console.error("Deepgram Agent Error:", parsedData.description, "Code:", parsedData.code);
            toast.error(`Agent Error: ${parsedData.description} (Code: ${parsedData.code})`);
            break;
          default:
            if (parsedData.role === "user") {
              lastUserSpeakingTime.current = Date.now();
              if (startListening) startListening();
              addVoicebotMessage({ user: parsedData.content });
            } else if (parsedData.role === "assistant") {
              if (startSpeaking) startSpeaking();
              addVoicebotMessage({ assistant: parsedData.content });
              if (isWaitingForUserVoiceAfterSleep && isWaitingForUserVoiceAfterSleep.current) {
                isWaitingForUserVoiceAfterSleep.current = false;
              }
            } else if (parsedData.type === EventType.AGENT_AUDIO_DONE) {
              if (startListening) startListening();
            } else if (parsedData.type === EventType.USER_STARTED_SPEAKING) {
              lastUserSpeakingTime.current = Date.now();
              isWaitingForUserVoiceAfterSleep.current = false;
              if (startListening) startListening();
              clearAudioBuffer();
            } else if (parsedData.type === EventType.AGENT_STARTED_SPEAKING) {
              const { tts_latency, ttt_latency, total_latency } = parsedData;
              if (tts_latency && ttt_latency) { 
                addVoicebotMessage({ tts_latency, ttt_latency, total_latency });
              }
            } else if (parsedData.type === EventType.FUNCTION_CALL_REQUEST) {
              const functionsToCall = parsedData.functions;
              if (functionsToCall && Array.isArray(functionsToCall)) {
                functionsToCall.forEach(async (func: any) => {
                  if (func.client_side) {
                    console.log("FunctionCallRequest (client_side):", func.name, "Args:", func.arguments);
                    try {
                      const parsedArgs = JSON.parse(func.arguments);
                      const toolResult = await functionsMap[func.name](parsedArgs);
                      if (socket) { 
                        sendSocketMessage(socket, {
                          type: "FunctionCallResponse",
                          id: func.id, 
                          name: func.name, 
                          content: toolResult.toolResponse, 
                        });
                      }
                    } catch (err: any) {
                      console.error("Error processing function call or parsing arguments:", func.name, err);
                      if (socket) { 
                        sendSocketMessage(socket, {
                          type: "FunctionCallResponse",
                          id: func.id,
                          name: func.name,
                          content: JSON.stringify({ error: `Failed to execute function ${func.name}: ${err.message}` }),
                        });
                      }
                    }
                  } else {
                    console.log("FunctionCallRequest (server_side, no action needed):", func.name);
                  }
                });
              }
            }
            break;
        }
      } catch (error) {
        if (typeof data === "string" && data.trim() !== "") {
            console.error("Failed to parse WebSocket message or process data:", data, error);
        }
      }
    }
  }, [data, functionsMap, socket, addVoicebotMessage, startListening, startSpeaking, isWaitingForUserVoiceAfterSleep]);

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionDenied(false);
      if (microphoneState === null || microphoneState === 0) {
        if (setupMicrophone) await setupMicrophone();
      }
      toast.success('Microphone access granted!');
    } catch (error: any) {
      console.error('Failed to get microphone permission:', error);
      setMicPermissionDenied(true);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Could not access microphone. Please check your device settings.');
      }
    }
  };

  // Moved handleDisconnect and sendSystemMessage before the useEffect that uses handleDisconnect
  const handleDisconnect = useCallback((refresh: boolean = true) => {
    console.log("Disconnecting and resetting state...");
    
    if (userInactivityTimer.current) {
      clearInterval(userInactivityTimer.current);
      userInactivityTimer.current = null;
    }
    
    if (keepAliveTimer.current) {
      clearInterval(keepAliveTimer.current);
      keepAliveTimer.current = null;
    }
    
    setIsDisconnected(true); 
    setIsInitialized(false); 
    setSettingsApplied(false); 
    setTime(interviewLength * 60); 
    
    scheduledAudioSources.current.forEach(source => {
      if (source) {
        try { source.stop(); source.disconnect(); } catch (err) { /* ignore */ }
      }
    });
    scheduledAudioSources.current = [];
    
    if (audioContext.current && audioContext.current.state !== 'closed') {
      try { audioContext.current.suspend(); } catch (err) { /* ignore */ }
    }
    
    if (stopMicrophone) stopMicrophone();
    if (disconnectFromDeepgram) disconnectFromDeepgram(); 
    
    if(refresh) {
        window.location.reload();
    } 
  }, [interviewLength, stopMicrophone, disconnectFromDeepgram, setIsDisconnected, setIsInitialized, setSettingsApplied, setTime]);

  const sendSystemMessage = (text: string) => {
    if (isInitialized && text.trim() && socket && socket.readyState === WebSocket.OPEN && fullSystemPrompt) {
      try {
        const minutesLeft = Math.floor(time / 60);
        console.log(minutesLeft + " minutes left. Sending system message content to agent using UpdatePrompt.");

        // The updatedPrompt should be the *complete* new system prompt the agent should use.
        // It seems fullSystemPrompt already contains the base prompt + interview details.
        // We are appending the new 'text' (e.g., code output or time left) to this existing full prompt.
        const updatedPrompt = `${fullSystemPrompt}\n\nThere are ${minutesLeft} minutes left in the interview. \n\n${text}`;
        
        sendSocketMessage(socket, {
          type: "UpdatePrompt", 
          prompt: updatedPrompt
        });
      } catch (error) {
        console.error("Failed to send UpdatePrompt message:", error);
      }
    }
  };

  useEffect(() => {
    if (!isInitialized || isDisconnected) return;
    
    userInactivityTimer.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - lastUserSpeakingTime.current) / (1000 * 60);
      
      if (elapsedMinutes >= 5) {
        console.log("User inactive for 5 minutes, disconnecting...");
        toast.info("No activity detected for 5 minutes. Restarting interview...");
        handleDisconnect(true); 
      }
    }, 30000);
    
    return () => {
      if (userInactivityTimer.current) {
        clearInterval(userInactivityTimer.current);
      }
    };
  }, [isInitialized, isDisconnected, handleDisconnect]); // handleDisconnect is now defined before this useEffect
  
  useEffect(() => {
    if (!isInitialized || isDisconnected || !socket || socketState !== 1) return;
    
    keepAliveTimer.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // console.log("Sending keep-alive to maintain agent audio connection"); // V1 might not need client-side keep-alive
        // sendSocketMessage(socket, { type: "KeepAlive" }); // KeepAlive might be different or not needed in V1
      }
    }, 28000); 
    
    return () => {
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;
      }
    };
  }, [isInitialized, isDisconnected, socket, socketState]);
  
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
      
      if (audioContext.current && audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      lastUserSpeakingTime.current = Date.now();
      
      setIsInitialized(true);
      // initializeFeedback should be fine if it's just DB work
      if (userId && interviewId) await initializeFeedback(userId, interviewId); 
      
      // Connection to Deepgram (and sending initial settings) is handled by useEffect for connectToDeepgram
      // and the socket 'open' event listener.
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to start interview. Please try again.');
    }
  };

  const toggleMicrophone = () => {
    if (processor && processor.onaudioprocess) {
      processor.onaudioprocess = null;
      setIsMicManuallyMuted(true);
    } else if (processor && socket) {
      processor.onaudioprocess = sendMicToSocket(socket);
      setIsMicManuallyMuted(false);
      
      if (status === VoiceBotStatus.SLEEPING && startListening) {
        startListening(true);
      }
      
      if (isWaitingForUserVoiceAfterSleep && isWaitingForUserVoiceAfterSleep.current) {
        isWaitingForUserVoiceAfterSleep.current = false;
      }
      console.log("Microphone enabled - resetting speech recognition state");
    }
  };

  const updateCodeOutput = (output: string, code: string) => {
    console.log("Code output: " + output);
    // sendSystemMessage will now send a Settings update
    sendSystemMessage(`\\n\\nCandidate ran the code. \\nOutput: ${output}\\n\\nCandidate's code: ${code}`);
  };

  const updateCode = (code: string) => {
    console.log("Code: " + code);
    // sendSystemMessage will now send a Settings update
    sendSystemMessage(`\\n\\nCurrent candidate code: ${code}`);
  };

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

    if (status !== VoiceBotStatus.NONE && toggleSleep) {
      toggleSleep();
    }
  };

  const isSpeaking = status === VoiceBotStatus.SPEAKING;

  const handleRouteChangeStart = useCallback((url: string, currentPath: string) => {
    console.log(`handleRouteChangeStart called. Attempted navigation to: ${url}, current path was: ${currentPath}`);
    if (isInitialized && url !== currentPath) {
      const confirmed = window.confirm("You are leaving the interview. Confirm to save progress and clean up?");
      if (confirmed) {
        console.log("User confirmed cleanup after route change.");
        cleanupAndNavigate(url, true); 
      } else {
        console.log("User cancelled cleanup after route change. Attempting to navigate back.");
        router.push(currentPath);
      }
    }
  }, [isInitialized, cleanupAndNavigate, router]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log("handleBeforeUnload triggered");
      const confirmationMessage = 'Are you sure you want to leave? Your interview progress may be lost, and related actions will be taken.';
      event.preventDefault();
      event.returnValue = confirmationMessage; // Standard for most browsers
      return confirmationMessage; // For older browsers
    };

    const handlePageHide = () => {
      // This is a last resort cleanup attempt if beforeunload didn't stop the navigation.
      // It's particularly for mobile where beforeunload might not be as effective or for bfcache.
      if (isInitialized && !manuallyDisconnected) { // Check manuallyDisconnected to avoid double cleanup if quit was intentional
          console.log("handlePageHide triggered, attempting cleanup via cleanupAndNavigate (skipNavigation=true)");
          cleanupAndNavigate("dummy_url_not_used_for_pagehide", true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide); // For Safari and bfcache scenarios

    if (previousPathnameRef.current !== pathname) {
      console.log(`Pathname changed from ${previousPathnameRef.current} to ${pathname}. Triggering handleRouteChangeStart.`);
      handleRouteChangeStart(pathname, previousPathnameRef.current);
      previousPathnameRef.current = pathname;
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isInitialized, cleanupAndNavigate, router, pathname, handleRouteChangeStart, manuallyDisconnected]);


  // UI Rendering (mostly unchanged, but Start Over button behavior might need review if not a full page reload)
  // ... existing UI code ...
  // The "Start Over" button calls handleDisconnect(true), which does a page reload. This is a safe way to reset.
  // If a "soft" start over without reload was intended, handleDisconnect(false) path would need more work
  // including calling resetConnectionState from Deepgram context.

// ... rest of the UI remains the same as it's mostly visual and button handlers now call updated logic ...
// Make sure all functions from contexts (useMicrophone, useDeepgram, useVoiceBot) are checked for null if they are optional

// ... (Existing JSX starting from return statement)
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
                  disabled={!interviewReady || !microphone} // microphone from context
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
                  onClick={() => {
                     if (window.confirm("Are you sure you want to start over? This will end the current interview and reset its state.")) {
                        handleDisconnect(true); // true for page refresh
                     }
                  }}
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
          
          <div className="h-20 md:h-12 text-sm md:text-base mt-2 flex flex-col items-center text-gray-200 overflow-y-auto">
            {messages.length > 0 ? <Transcript /> : null}
          </div>
        </div>
      ) : (
        // New UI for Technical interviews
        <div className="flex flex-col h-full w-full border-b">
          <div className="py-4">
            <div className="text-2xl font-semibold text-center">
              Time: {formatTime(time)}
            </div>
          </div>
          
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
                    onRun={updateCodeOutput} // Pass the functions directly
                    onCodeChange={updateCode} // Pass the functions directly
                  />
                </div>
              </>
            :
              <div>
                  Press: Start Interview
              </div>
            }
          </div>

          <div className="h-20 md:h-12 text-sm md:text-base mt-2 flex flex-col items-center text-gray-200 overflow-y-auto">
            {messages.length > 0 ? <Transcript /> : null}
          </div>
          
          <div className="py-4">
            <div className="w-full flex flex-wrap items-center justify-center gap-6 font-bold">
              {!isInitialized ? (
                <>
                  <Button
                    disabled={!interviewReady || !microphone} // microphone from context
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
                  {/* Start Over button was commented out here, but exists in behavioral.
                      Adding it back for consistency, assuming handleDisconnect(true) is the desired behavior.
                   */}
                  <Button
                    onClick={() => {
                       if (window.confirm("Are you sure you want to start over? This will end the current interview and reset its state.")) {
                          handleDisconnect(true);
                       }
                    }}
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