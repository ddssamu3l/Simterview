/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatTime } from "@/lib/utils";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Transcript from "./Transcript";
import { useDeepgram } from "../context/DeepgramContextProvider";
import { useMicrophone } from "../context/MicrophoneContextProvider";
import {
  EventType,
  useVoiceBot,
  VoiceBotStatus,
} from "../context/VoiceBotContextProvider";
import { createAudioBuffer, playAudioBuffer } from "../utils/audioUtils";
import { sendSocketMessage, sendMicToSocket, StsConfig, AgentConfigV1, ProviderBase, CustomProvider } from "@/utils/deepgramUtils";
import { useStsQueryParams } from "@/hooks/UseStsQueryParams";
import { stsConfig } from "@/lib/deepgramConstants";
import { demoSystemPrompt } from "@/public";

function DemoDeepgramInterview() {
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
    manuallyDisconnected,
  } = useDeepgram();

  // Query params for voice/instructions
  const { voice, instructions, applyParamsToConfig } = useStsQueryParams();

  // Router for navigation
  const router = useRouter();

  // State
  const [data, setData] = useState<any>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [time, setTime] = useState(1200);
  const [isBehavioral, setIsBehavioral] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
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

  const cleanupAndNavigate = useCallback(
    (destinationUrl: string) => {
      try {
        if (userInactivityTimer.current) {
          clearInterval(userInactivityTimer.current);
          userInactivityTimer.current = null;
        }

        if (keepAliveTimer.current) {
          clearInterval(keepAliveTimer.current);
          keepAliveTimer.current = null;
        }

        if (stopMicrophone) stopMicrophone();
        if (disconnectFromDeepgram) disconnectFromDeepgram();

        scheduledAudioSources.current.forEach((source) => {
          if (source) {
            try { source.stop(); source.disconnect(); } catch (err) { /* ignore */ }
          }
        });
        scheduledAudioSources.current = [];

        if (audioContext.current && audioContext.current.state !== "closed") {
          try { audioContext.current.suspend(); } catch (err) { /* ignore */ }
        }
        window.location.href = destinationUrl;
      } catch (error) {
        console.error("Error during navigation cleanup:", error);
        window.location.href = destinationUrl;
      }
    },
    [stopMicrophone, disconnectFromDeepgram]
  );

  const handleQuit = useCallback(() => {
    cleanupAndNavigate("/");
  }, [cleanupAndNavigate]);

  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      const newAnalyser = audioContext.current.createAnalyser();
      newAnalyser.fftSize = 2048;
      newAnalyser.smoothingTimeConstant = 0.96;
      agentVoiceAnalyser.current = newAnalyser;
    }
  }, []);

  useEffect(() => {
    if (!isInitialized || isDisconnected) return;

    if (time <= 0) {
      handleQuit();
      return;
    }

    const intervalId = setInterval(() => {
      setTime((prev) => prev - 1);
    }, 1000);

    if (time > 0 && time % 300 === 0) {
      const minutesLeft = time / 60;
      sendSystemMessageViaSettings(minutesLeft + " minutes left.");
      console.log(minutesLeft + " minutes left");
    }

    return () => clearInterval(intervalId);
  }, [time, isInitialized, isDisconnected, handleQuit]);

  useEffect(() => {
    if (microphoneState === null) {
      if (setupMicrophone) setupMicrophone().catch((error: any) => {
        console.error("Microphone setup failed:", error);
        if (error.name === "NotAllowedError") {
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
        .then(() => { setMicPermissionDenied(false); })
        .catch((err) => { if (err.name === "NotAllowedError") setMicPermissionDenied(true); });
    }
  }, [microphoneState]);

  useEffect(() => {
    let wakeLock: any;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch (err) { console.error(err); }
    };
    if (isInitialized) requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, [isInitialized]);

  useEffect(() => {
    if (microphoneState === 1 && socket && !isDisconnected && !manuallyDisconnected) {
      const onOpen = () => {
        const initialSettings = JSON.parse(JSON.stringify(stsConfig));

        if (initialSettings.agent && initialSettings.agent.think) {
          initialSettings.agent.think.prompt = demoSystemPrompt;
          initialSettings.agent.think.provider = {
            ...(initialSettings.agent.think.provider || {}),
             model: "gpt-4.1-mini"
          };
          setCurrentAgentThinkProvider(initialSettings.agent.think.provider);
        }
        if (initialSettings.agent?.think?.functions) {
          delete initialSettings.agent.think.functions;
        }
        if (initialSettings.context) {
            initialSettings.greeting = "Hi there! I'm H, your AI recruiter for this quick demo. Nice to meet you!";
            delete initialSettings.context;
        }
        
        let combinedStsConfig = initialSettings;
        if (applyParamsToConfig) {
             combinedStsConfig = applyParamsToConfig(initialSettings);
        }

        sendSocketMessage(socket, combinedStsConfig);

        setTimeout(() => {
          console.log("Starting microphone after configuration sent for demo");
          if (startMicrophone) startMicrophone();
          if (startListening) startListening(true);
        }, 300);
      };
      socket.addEventListener("open", onOpen);
      return () => {
        if (socket) socket.removeEventListener("open", onOpen);
        if (microphone && (microphone as any).ondataavailable) (microphone as any).ondataavailable = null;
      };
    }
  }, [
    microphoneState, socket, isDisconnected, manuallyDisconnected, 
    applyParamsToConfig, startMicrophone, startListening, microphone,
  ]);

  const [settingsApplied, setSettingsApplied] = useState(false);

  useEffect(() => {
    if (!microphone || !socket || !processor || microphoneState !== 2 || socketState !== 1) return;
    if (settingsApplied) {
      console.log("Connecting audio processor after settings were applied for demo");
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [microphone, socket, microphoneState, socketState, processor, settingsApplied]);

  useEffect(() => {
    if (!processor || !socket || socket.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
      toast.message("Your interviewer fell asleep from your inactivity. Please focus!");
    } else {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket]);

  useEffect(() => {
    if (microphoneAudioContext && microphone && userVoiceAnalyser.current === null) {
      const newAnalyser = microphoneAudioContext.createAnalyser();
      newAnalyser.fftSize = 2048;
      newAnalyser.smoothingTimeConstant = 0.96;
      microphone.connect(newAnalyser);
      userVoiceAnalyser.current = newAnalyser;
    }
  }, [microphoneAudioContext, microphone]);

  useEffect(() => {
    if (!isDisconnected && !manuallyDisconnected && microphoneState === 1 && socketState === -1 && isInitialized) {
      if (connectToDeepgram) connectToDeepgram();
    }
  }, [microphoneState, socketState, isInitialized, isDisconnected, manuallyDisconnected, connectToDeepgram]);

  const bufferAudio = useCallback((audioData: ArrayBuffer) => {
    if (!audioContext.current) { console.error("No audio context for buffering"); return; }
    if (audioContext.current.state === 'suspended') audioContext.current.resume().catch(console.error);
    const audioBufferInstance = createAudioBuffer(audioContext.current, audioData);
    if (!audioBufferInstance) { console.error("Failed to create audio buffer"); return; }
    try {
      const source = playAudioBuffer(audioContext.current, audioBufferInstance, startTimeRef, agentVoiceAnalyser.current);
      scheduledAudioSources.current.push(source);
    } catch (error) { console.error("Error playing audio buffer:", error); }
  }, []);

  const clearAudioBuffer = () => {
    scheduledAudioSources.current.forEach(source => { if (source) try { source.stop(); } catch (e) { console.error(e); } });
    scheduledAudioSources.current = [];
  };

  const onMessage = useCallback(async (event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      if (settingsApplied) {
        bufferAudio(event.data);
        if (isWaitingForUserVoiceAfterSleep && isWaitingForUserVoiceAfterSleep.current) {
          isWaitingForUserVoiceAfterSleep.current = false;
        }
      }
    } else {
      console.log("Demo Raw message:", event?.data);
      setData(event.data);
    }
  }, [bufferAudio, settingsApplied, isWaitingForUserVoiceAfterSleep]);

  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  useEffect(() => {
    if (previousVoiceRef.current !== voice && voice && socket && socketState === 1 && settingsApplied) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        speak: { provider: { type: "deepgram", model: voice } }
      });
    }
    previousVoiceRef.current = voice;
  }, [voice, socket, socketState, settingsApplied]);

  useEffect(() => {
    if (status === VoiceBotStatus.LISTENING && socket && socketState === 1 && processor) {
      if (audioContext.current && audioContext.current.state !== 'running') audioContext.current.resume().catch(console.error);
      if (!processor.onaudioprocess) processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, socket, socketState, processor]);

  useEffect(() => {
    if (previousInstructionsRef.current !== instructions && instructions && socket && socketState === 1 && settingsApplied) {
        console.log("Updating demo prompt due to instructions change (from query params) using UpdatePrompt.");
        const newPromptContent = `${demoSystemPrompt}\n${instructions}`;

        sendSocketMessage(socket, {
            type: "UpdatePrompt",
            prompt: newPromptContent,
        });
    }
    previousInstructionsRef.current = instructions;
  }, [
    instructions,
    socket,
    socketState,
    settingsApplied,
    demoSystemPrompt 
  ]);

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
        // Always allow agent response to be processed regardless of sleep state
        // This ensures the agent's responses are always added to the queue and spoken
        startSpeaking();
        const assistantTranscript = data.content;
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

        maybeRecordBehindTheScenesEvent(parsedData);

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

          startListening();
          userRole(parsedData);
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
          // Update the last time the user spoke
          lastUserSpeakingTime.current = Date.now();
          console.log("User speaking detected, resetting inactivity timer");

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

      toast.success("Microphone access granted!");
    } catch (error) {
      console.error("Failed to get microphone permission:", error);
      setMicPermissionDenied(true);

      if (error.name === "NotAllowedError") {
        toast.error(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      } else {
        toast.error(
          "Could not access microphone. Please check your device settings."
        );
      }
    }
  };

  // User inactivity tracking - check if user has been silent for too long
  useEffect(() => {
    if (!isInitialized || isDisconnected) return;

    // Setup inactivity timer that checks every 30 seconds
    userInactivityTimer.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedMinutes =
        (currentTime - lastUserSpeakingTime.current) / (1000 * 60);

      // If user hasn't spoken for 5 minutes
      if (elapsedMinutes >= 5) {
        console.log("User inactive for 5 minutes, disconnecting...");
        toast.info("No activity detected for 5 minutes. Demo will end.");
        handleQuit();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (userInactivityTimer.current) {
        clearInterval(userInactivityTimer.current);
      }
    };
  }, [isInitialized, isDisconnected, handleQuit]);

  // Add click listeners to all navigation elements (links and buttons)
  useEffect(() => {
    if (!isInitialized) return;

    // Function to handle navigation (both links and the Quit button)
    const handleNavigation = (e: MouseEvent) => {
      // Check if clicked element is a link in navbar or the quit button
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      const quitButton = target.closest("button");

      // Handle if it's a navigation link
      if (link && link.closest("nav")) {
        // Prevent the default navigation
        e.preventDefault();

        // Get the destination
        const destinationUrl = link.getAttribute("href") || "/";

        const confirmed = window.confirm(
          "You're in the middle of a demo. Are you sure you want to leave?"
        );
        if (confirmed) {
          cleanupAndNavigate(destinationUrl);
        }
      }

      if (quitButton && quitButton.textContent?.includes("Quit Interview")) {
        e.preventDefault();
        cleanupAndNavigate("/");
      }
    };

    document.addEventListener("click", handleNavigation, true);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "You're in the middle of a demo. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleNavigation, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isInitialized, time, cleanupAndNavigate]);

  // Start a keep-alive timer to maintain agent audio capabilities
  useEffect(() => {
    if (!isInitialized || isDisconnected || !socket || socketState !== 1)
      return;

    keepAliveTimer.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending keep-alive to maintain agent audio connection");
        sendSocketMessage(socket, { type: "KeepAlive" });
      }
    }, 28000);

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
      if (!microphone) {
        toast.error(
          "Microphone access is required for the interview. Please grant permission."
        );
        requestMicrophonePermission();
        return;
      }

      if (audioContext.current && audioContext.current.state === "suspended") {
        await audioContext.current.resume();
      }

      lastUserSpeakingTime.current = Date.now();
      setIsInitialized(true);
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to start interview. Please try again.");
    }
  };

  // Send a system message TODO find a better way than just updating systems message
  const sendSystemMessageViaSettings = (text: string) => {
    if (
      isInitialized &&
      text.trim() &&
      socket &&
      socket.readyState === WebSocket.OPEN
      // currentAgentThinkProvider is not strictly needed if we're just updating the prompt
      // as the UpdatePrompt message doesn't target a specific provider, but the agent's overall prompt.
    ) {
      try {
        const updatedPrompt = `${demoSystemPrompt}\n\n${text}`;
        
        sendSocketMessage(socket, {
          type: "UpdatePrompt",
          prompt: updatedPrompt,
        });
      } catch (error) {
        console.error("Failed to send UpdatePrompt message:", error);
      }
    }
  };

  // Toggle microphone (mute/unmute)
  const toggleMicrophone = () => {
    if (processor && processor.onaudioprocess) {
      processor.onaudioprocess = null;
    } else if (processor && socket) {
      processor.onaudioprocess = sendMicToSocket(socket);
      if (status === VoiceBotStatus.SLEEPING) {
        startListening(true);
      }
      isWaitingForUserVoiceAfterSleep.current = false;
      console.log("Microphone enabled - resetting speech recognition state");
    }
  };

  // Handle voice interaction
  const handleVoiceBotAction = () => {
    console.log("Starting voice interaction");

    if (audioContext.current && audioContext.current.state === "suspended") {
      audioContext.current.resume().catch((err) => {
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
        <div className="mt-24 flex flex-col h-full w-full border-b items-center justify-between">
          <div className="">
            <div className="text-2xl font-semibold text-center">
              Time: {formatTime(time)}
            </div>
          </div>

          <div className="flex flex-row gap-4 w-6xl max-w-[90vw]">
            <div className="card-interviewer">
              <div className="avatar">
                <Image
                  src="/icon.png"
                  alt="deepgram"
                  width={65}
                  height={54}
                  className="object-cover"
                />
                {isSpeaking && <span className="animate-speak"></span>}
              </div>
              <h3>AI Recruiter</h3>
            </div>

            <div className="card-border border-primary-200/50 ">
              <div className="card-content">
                <Image
                  src="/icon.png"
                  alt="user avatar"
                  width={540}
                  height={540}
                  className="rounded-full object-cover size-[120px]"
                />
                <h3>You</h3>
              </div>
            </div>
          </div>

          <div className="w-full flex max-sm:flex-col max-sm items-center justify-center gap-6 mb-4 font-bold rounded-sm">
            {!isInitialized ? (
              <>
                <Button
                  disabled={!microphone}
                  onClick={handleConnect}
                  className="w-[150px] bg-white text-black font-bold px-4 py-2 hover:cursor-pointer"
                >
                  Start Chat!
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
                  onClick={toggleMicrophone}
                  className={`${
                    processor?.onaudioprocess ? "bg-red-400" : "bg-green-500"
                  }
                    w-[150px] text-white font-semibold hover:cursor-pointer`}
                >
                  {processor?.onaudioprocess
                    ? "Mute Microphone"
                    : "Enable Microphone"}
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
      ) : null}
    </div>
  );
}

export default DemoDeepgramInterview;
