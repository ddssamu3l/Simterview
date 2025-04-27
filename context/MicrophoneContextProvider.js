"use client";

import { createContext, useCallback, useContext, useState } from "react";

const MicrophoneContext = createContext();

const MicrophoneContextProvider = ({ children }) => {
  /**
   * Possible microphone states:
   * - not setup - null
   * - setting up - 0
   * - ready - 1
   * - open - 2
   * - paused - 3
   */
  const [microphoneState, setMicrophoneState] = useState(null);
  const [microphone, setMicrophone] = useState();
  const [microphoneAudioContext, setMicrophoneAudioContext] = useState();
  const [processor, setProcessor] = useState();
  const [mediaStream, setMediaStream] = useState(null); // Store the media stream separately

  const setupMicrophone = async () => {
    console.log("Starting microphone setup");
    setMicrophoneState(0);

    try {
      // Explicitly request user permission with constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          volume: 1.0,
          echoCancellation: true,
          noiseSuppression: false,
          latency: 0,
        },
      });
      console.log("Microphone permission granted");

      // Create audio context with user interaction to satisfy autoplay policy
      const microphoneAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume the audio context if it's suspended
      if (microphoneAudioContext.state === 'suspended') {
        await microphoneAudioContext.resume();
      }
      
      const microphone = microphoneAudioContext.createMediaStreamSource(stream);
      
      // Store the original stream in state for later access
      setMediaStream(stream);
      
      const processor = microphoneAudioContext.createScriptProcessor(4096, 1, 1);

      setMicrophone(microphone);
      setMicrophoneAudioContext(microphoneAudioContext);
      setProcessor(processor);
      setMicrophoneState(1);
      console.log("Microphone ready");
    } catch (err) {
      console.error("Microphone setup error:", err);
      if (err.name === "NotAllowedError") {
        console.log("Microphone permission denied by user");
      } else if (err.name === "NotFoundError") {
        console.log("No microphone detected");
      }
    }
  };

  const startMicrophone = useCallback(() => {
    console.log("Activating microphone");
    microphone.connect(processor);
    processor.connect(microphoneAudioContext.destination);
    setMicrophoneState(2);
  }, [processor, microphoneAudioContext, microphone]);
  
  const stopMicrophone = useCallback(() => {
    console.log("Stopping microphone");
    
    if (microphoneState >= 1) {
      try {
        // Disconnect the audio processing nodes if they exist
        if (processor) {
          processor.disconnect();
        }
        
        if (microphone) {
          microphone.disconnect();
        }
        
        // Get the media stream tracks and stop them
        // This is the key part to properly release the microphone
        if (mediaStream) {
          const tracks = mediaStream.getTracks();
          tracks.forEach(track => {
            track.stop();
          });
          
          // Clear the media stream reference
          setMediaStream(null);
          console.log("Microphone tracks stopped");
        }
        
        // Close or suspend the audio context if possible
        if (microphoneAudioContext && microphoneAudioContext.state !== 'closed') {
          try {
            microphoneAudioContext.suspend();
          } catch (err) {
            console.error("Error suspending audio context:", err);
          }
        }
        
        setMicrophoneState(0); // Reset to initializing state
        setMicrophone(null); // Clear microphone reference
        console.log("Microphone fully released");
      } catch (err) {
        console.error("Error stopping microphone:", err);
      }
    }
  }, [microphone, processor, microphoneAudioContext, mediaStream, microphoneState]);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
        microphoneAudioContext,
        setMicrophoneAudioContext,
        processor,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

function useMicrophone() {
  return useContext(MicrophoneContext);
}

export { MicrophoneContextProvider, useMicrophone };
