"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import Transcript from "./Transcript";
import { useDeepgram } from "../context/DeepgramContextProvider";
import { useMicrophone } from "../context/MicrophoneContextProvider";
import { EventType, useVoiceBot, VoiceBotStatus } from "../context/VoiceBotContextProvider";
import { createAudioBuffer, playAudioBuffer } from "../utils/audioUtils";
import { sendSocketMessage, sendMicToSocket } from "@/utils/deepgramUtils";
import { usePrevious } from "@uidotdev/usehooks";
import { useStsQueryParams } from "@/hooks/UseStsQueryParams";

export const App = ({
  defaultStsConfig,
  onMessageEvent = () => { },
  requiresUserActionToInitialize = false,
  className = "",
}) => {
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
  const {
    setupMicrophone,
    microphone,
    microphoneState,
    processor,
    microphoneAudioContext,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone();
  const { 
    socket, 
    connectToDeepgram, 
    disconnectFromDeepgram, 
    socketState,
    manuallyDisconnected 
  } = useDeepgram();
  const { voice, instructions, applyParamsToConfig } = useStsQueryParams();
  const audioContext = useRef(null);
  const agentVoiceAnalyser = useRef(null);
  const userVoiceAnalyser = useRef(null);
  const startTimeRef = useRef(-1);
  const [data, setData] = useState();
  const [isInitialized, setIsInitialized] = useState(requiresUserActionToInitialize ? false : null);
  const [isDisconnected, setIsDisconnected] = useState(false); // Track disconnection state
  const previousVoice = usePrevious(voice);
  const previousInstructions = usePrevious(instructions);
  const scheduledAudioSources = useRef([]);
  const pathname = usePathname();

  // AUDIO MANAGEMENT
  /**
   * Initialize the audio context for managing and playing audio. (just for TTS playback; user audio input logic found in Microphone Context Provider)
   */
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      agentVoiceAnalyser.current = audioContext.current.createAnalyser();
      agentVoiceAnalyser.current.fftSize = 2048;
      agentVoiceAnalyser.current.smoothingTimeConstant = 0.96;
    }
  }, []);

  /**
   * Callback to handle audio data processing and playback.
   * Converts raw audio into an AudioBuffer and plays the processed audio through the web audio context
   */
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

  const clearAudioBuffer = () => {
    scheduledAudioSources.current.forEach((source) => source.stop());
    scheduledAudioSources.current = [];
  };

  // MICROPHONE AND SOCKET MANAGEMENT
  /**
   * Open the microphone at the very start when there isn't one.
   * Logic for microphone found in Microphone Context Provider
   */
  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let wakeLock;
    const requestWakeLock = async () => {
      try {
        // Wake lock will only be successfully granted if this useEffect is triggered as a result of a user action (a click or tap)
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

  /**
   * Open Deepgram once the microphone opens.
   * Runs whenever the `microphone` changes state, but exits if no microphone state.
   * `microphone` is only set once it is ready to open and record audio.
   */
  useEffect(() => {
    if (microphoneState === 1 && socket && defaultStsConfig) {
      /**
       * When the connection to Deepgram opens, the following will happen;
       *  1. Send the API configuration first.
       *  2. Start the microphone immediately.
       *  3. Update the app state to the INITIAL listening state.
       */

      const onOpen = () => {
        const combinedStsConfig = applyParamsToConfig(defaultStsConfig);
        sendSocketMessage(socket, combinedStsConfig);
        startMicrophone();
        startListening(true);
        
        if (pathname === "/") {
          // This is the "base" demo at /agent
          toggleSleep();
        }
      };

      socket.addEventListener("open", onOpen);

      /**
       * Cleanup function runs before component unmounts. Use this
       * to deregister/remove event listeners.
       */
      return () => {
        if (socket) {
          socket.removeEventListener("open", onOpen);
        }
        if (microphone && microphone.ondataavailable) {
          microphone.ondataavailable = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphone, socket, microphoneState, defaultStsConfig, pathname]);

  /**
   * Performs checks to ensure that the system is ready to proceed with setting up the data transmission
   * Attaches an event listener to the microphone which sends audio data through the WebSocket as it becomes available
   */
  useEffect(() => {
    if (!microphone) return;
    if (!socket) return;
    if (!processor) return;
    if (microphoneState !== 2) return;
    if (socketState !== 1) return;
    processor.onaudioprocess = sendMicToSocket(socket);
  }, [microphone, socket, microphoneState, socketState, processor]);

  useEffect(() => {
    if (!processor || socket?.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
    } else {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket]);

  /**
   * Create AnalyserNode for user microphone audio context.
   * Exposes audio time / frequency data which is used in the
   * AnimationManager to scale the animations in response to user/agent voice
   */
  useEffect(() => {
    if (microphoneAudioContext && microphone) {
      userVoiceAnalyser.current = microphoneAudioContext.createAnalyser();
      userVoiceAnalyser.current.fftSize = 2048;
      userVoiceAnalyser.current.smoothingTimeConstant = 0.96;
      microphone.connect(userVoiceAnalyser.current);
    }
  }, [microphoneAudioContext, microphone]);

  /**
   * Handles incoming WebSocket messages. Differentiates between ArrayBuffer data and other data types (basically just string type).
   * */
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
        onMessageEvent(event.data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bufferAudio, status],
  );

  /**
   * Opens Deepgram when the microphone opens.
   * Runs whenever `microphone` changes state, but exits if no microphone state.
   */
  useEffect(() => {
    if (
      !isDisconnected && // Don't reconnect if explicitly disconnected in UI
      !manuallyDisconnected && // Also don't reconnect if manually disconnected at provider level
      microphoneState === 1 &&
      socketState === -1 &&
      (!requiresUserActionToInitialize || (requiresUserActionToInitialize && isInitialized))
    ) {
      connectToDeepgram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    microphone,
    socket,
    microphoneState,
    socketState,
    isInitialized,
    requiresUserActionToInitialize,
    isDisconnected,
    manuallyDisconnected, 
  ]);

  /**
   * Sets up a WebSocket message event listener to handle incoming messages through the 'onMessage' callback.
   */
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  useEffect(() => {
    if (previousVoice && previousVoice !== voice && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        model: voice,
      });
    }
  }, [voice, socket, socketState, previousVoice]);

  useEffect(() => {
    if (previousInstructions !== instructions && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateInstructions",
        instructions: `${defaultStsConfig.agent.think.instructions}\n${instructions}`,
      });
    }
  }, [defaultStsConfig, previousInstructions, instructions, socket, socketState]);

  /**
   * Manage responses to incoming data from WebSocket.
   * This useEffect primarily handles string-based data that is expected to represent JSON-encoded messages determining actions based on the nature of the message
   * */
  useEffect(() => {
    /**
     * When the API returns a message event, several possible things can occur.
     *
     * 1. If it's a user message, check if it's a wake word or a stop word and add it to the queue.
     * 2. If it's an agent message, add it to the queue.
     * 3. If the message type is `AgentAudioDone` switch the app state to `START_LISTENING`
     */

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
          // Note: It's not quite correct that the agent goes to the listening state upon receiving
          // `AgentAudioDone`. When that message is sent, it just means that all of the agent's
          // audio has arrived at the client, but the client will still be in the process of playing
          // it, which means the agent is still speaking. In practice, with the way the server
          // currently sends audio, this means Talon will deem the agent speech finished right when
          // the agent begins speaking the final sentence of its reply.
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
  }, [data, socket]);

  const handleVoiceBotAction = () => {
    console.log("Starting voice interaction");
    
    if (audioContext.current && audioContext.current.state === 'suspended') {
      audioContext.current.resume().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
    }
    
    if (requiresUserActionToInitialize && !isInitialized) {
      setIsInitialized(true);
    }

    if (status !== VoiceBotStatus.NONE) {
      toggleSleep();
    }
  };
  
  const handleDisconnect = () => {
    console.log("Disconnecting from Deepgram");
    
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
    
    // Update UI to reflect disconnected state
    setIsDisconnected(true);
    
    console.log("Disconnected from all services");
  };

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

  // MAIN UI
  return (
    <div className="w-full flex flex-col items-center">
      {!isDisconnected && (
        <button className="text-center w-full mb-2 bg-white text-black" onClick={handleVoiceBotAction}>
          <span className="text-xl">Toggle mic</span>
        </button>
      )}
      
      {!isDisconnected ? (
        <button 
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4" 
          onClick={handleDisconnect}
        >
          Disconnect from Deepgram
        </button>
      ) : (
        <div className="bg-yellow-500 text-white font-bold py-2 px-4 rounded mb-4">
          Disconnected - Refresh page to reconnect
        </div>
      )}

      <div className={className}>
        {isDisconnected ? (
          <div className="text-base text-red-500 text-center w-full p-4 border border-red-300 rounded bg-red-50">
            <p className="font-bold mb-2">Disconnected from Deepgram</p>
            <p>Microphone access has been released.</p>
            <p>Refresh the page to reconnect.</p>
          </div>
        ) : !microphone ? (
          <div className="text-base text-gray-25 text-center w-full">Loading microphone...</div>
        ) : (
          <Fragment>
            {socketState === 0 && (
              <div className="text-base text-gray-25 text-center w-full">Loading Deepgram...</div>
            )}
            {socketState > 0 && status === VoiceBotStatus.SLEEPING && (
              <div className="text-xl flex flex-col items-center justify-center mt-4 mb-10 md:mt-4 md:mb-10">
                <div className="text-gray-450 text-sm">
                  I&apos;ve stopped listening. Click the orb to resume.
                </div>
              </div>
            )}
            {socketState === -1 && !isDisconnected && (
              <div className="text-base text-red-500 text-center w-full">
                Connection to Deepgram failed. Please try again.
              </div>
            )}
            {/* Transcript Section */}
            <div
              className={`h-20 md:h-12 text-sm md:text-base mt-2 flex flex-col items-center text-gray-200 overflow-y-auto`}
            >
              {messages.length > 0 ? <Transcript /> : null}
            </div>
          </Fragment>
        )}
      </div>
    </div>
  );
};
