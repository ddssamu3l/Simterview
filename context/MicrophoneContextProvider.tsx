/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";

/**
 * Defines the shape of the microphone context.
 */
interface MicrophoneContextType {
  microphone: MediaStreamAudioSourceNode | undefined;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  setupMicrophone: () => Promise<void>;
  microphoneState: 0 | 1 | 2 | null; // null: not setup, 0: setting up, 1: ready, 2: open
  microphoneAudioContext: AudioContext | undefined;
  setMicrophoneAudioContext: Dispatch<SetStateAction<AudioContext | undefined>>;
  processor: ScriptProcessorNode | undefined;
  mediaStream: MediaStream | null; // Expose mediaStream for advanced use cases if needed by consumers directly
}

/**
 * React context for managing microphone access and audio processing.
 */
const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined,
);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

/**
 * Provider component for microphone functionality.
 */
export const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = (
  { children },
) => {
  const [microphoneState, setMicrophoneState] = useState<0 | 1 | 2 | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | undefined>();
  const [microphoneAudioContext, setMicrophoneAudioContext] = useState<AudioContext | undefined>();
  const [processor, setProcessor] = useState<ScriptProcessorNode | undefined>();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const stopMicrophone = useCallback(() => {
    console.log("Stopping microphone");
    
    if (microphoneState !== null) { // Check if it was ever set up
      try {
        if (processor) {
          processor.disconnect();
        }
        if (microphone) {
          microphone.disconnect();
        }
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
          console.log("Microphone tracks stopped");
        }
        if (microphoneAudioContext && microphoneAudioContext.state !== "closed") {
           microphoneAudioContext.suspend().catch(err => console.error("Error suspending audio context:",err));
        }
        
        setMicrophoneState(0); 
        console.log("Microphone resources released");
      } catch (err) {
        console.error("Error stopping microphone:", err);
      }
    }
  }, [microphone, processor, microphoneAudioContext, mediaStream, microphoneState]);

  const setupMicrophone = useCallback(async () => {
    // If already open or setting up, or ready, don't try to set up again.
    if (microphoneState === 2 || microphoneState === 0 || microphoneState === 1) {
      console.log(`Microphone setup skipped, state is: ${microphoneState}`);
      return;
    }
    console.log("Starting microphone setup");
    setMicrophoneState(0); // Setting up

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // Consider making this configurable if background noise is an issue
        },
      });
      console.log("Microphone permission granted");

      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (newAudioContext.state === "suspended") {
        await newAudioContext.resume();
      }
      
      const newMicrophone = newAudioContext.createMediaStreamSource(stream);
      setMediaStream(stream);
      
      // Buffer size might need adjustment based on performance and latency requirements
      const newProcessor = newAudioContext.createScriptProcessor(4096, 1, 1);

      setMicrophone(newMicrophone);
      setMicrophoneAudioContext(newAudioContext);
      setProcessor(newProcessor);
      setMicrophoneState(1); // Ready
      console.log("Microphone ready");
    } catch (err: any) {
      console.error("Microphone setup error:", err);
      setMicrophoneState(null); // Back to not setup on error
      if (err.name === "NotAllowedError") {
        console.log("Microphone permission denied by user");
        // Potentially set a state here to inform UI about permission denial
      } else if (err.name === "NotFoundError") {
        console.log("No microphone detected");
      }
      // Re-throw or handle error appropriately for UI feedback
      throw err;
    }
  }, [microphoneState]); // Added microphoneState as a dependency to prevent re-setup if already done

  // Ref to hold the latest stopMicrophone callback
  const stopMicrophoneRef = React.useRef(stopMicrophone);

  useEffect(() => {
    stopMicrophoneRef.current = stopMicrophone;
  }, [stopMicrophone]);

  // Ensure microphone is stopped on unmount
  useEffect(() => {
    return () => {
      // Call the latest version of stopMicrophone via the ref
      stopMicrophoneRef.current();
    };
  }, []); // Empty dependency array: runs only on mount and unmount

  const startMicrophone = useCallback(() => {
    if (microphone && processor && microphoneAudioContext) {
      console.log("Activating microphone");
      microphone.connect(processor);
      processor.connect(microphoneAudioContext.destination);
      setMicrophoneState(2); // Open
    } else {
      console.error("Cannot start microphone: not fully initialized.");
    }
  }, [processor, microphoneAudioContext, microphone]);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
        microphoneAudioContext,
        setMicrophoneAudioContext, // This was in the original JS provider's value object
        processor,
        mediaStream // Exposing mediaStream as well
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

/**
 * Custom hook to access the Microphone context.
 */
export function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);
  if (context === undefined) {
    throw new Error(
      "useMicrophone must be used within a MicrophoneContextProvider",
    );
  }
  return context;
}

export { MicrophoneContext }; // Exporting context itself can be useful for some testing scenarios or advanced composition 