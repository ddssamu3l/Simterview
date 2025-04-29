"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * React context for managing microphone access and audio processing.
 * 
 * This context provides state and functions for initializing,
 * starting, and stopping the microphone, as well as accessing
 * the audio processing nodes.
 */
const MicrophoneContext = createContext();

/**
 * Provider component for microphone functionality.
 * 
 * This component manages the microphone state and audio processing
 * pipeline, including initialization, starting, and stopping.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
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
  
  /**
   * The audio source node from the microphone.
   * Used to capture audio input from the user.
   */
  const [microphone, setMicrophone] = useState();
  
  /**
   * The audio context used for microphone processing.
   */
  const [microphoneAudioContext, setMicrophoneAudioContext] = useState();
  
  /**
   * The ScriptProcessorNode used to process audio data.
   * This node is used to send audio data to Deepgram.
   */
  const [processor, setProcessor] = useState();
  
  /**
   * The raw media stream from getUserMedia.
   * Stored separately to allow proper cleanup.
   */
  const [mediaStream, setMediaStream] = useState(null);

  /**
   * Initializes the microphone and audio processing pipeline.
   * 
   * This async function:
   * 1. Requests microphone permission from the user
   * 2. Creates an AudioContext for processing
   * 3. Sets up the MediaStreamSource and ScriptProcessorNode
   * 4. Updates the component state with the initialized nodes
   * 
   * @returns {Promise<void>}
   * @throws {Error} If microphone access is denied or unavailable
   */
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

  /**
   * Activates the microphone by connecting the audio nodes.
   * 
   * This function connects the microphone source to the script processor
   * and the processor to the audio context destination, creating the
   * complete audio processing pipeline.
   */
  const startMicrophone = useCallback(() => {
    console.log("Activating microphone");
    microphone.connect(processor);
    processor.connect(microphoneAudioContext.destination);
    setMicrophoneState(2);
  }, [processor, microphoneAudioContext, microphone]);
  
  /**
   * Stops the microphone and cleans up all audio resources.
   * 
   * This function:
   * 1. Disconnects all audio processing nodes
   * 2. Stops all media stream tracks
   * 3. Suspends the audio context
   * 4. Clears state references
   * 
   * This ensures that the microphone is properly released and
   * can be acquired by other applications.
   */
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

  /**
   * The context value provided to consumers.
   */
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

/**
 * Custom hook to access the Microphone context.
 * 
 * This hook provides access to the microphone state and functions
 * for controlling the microphone and audio processing.
 * 
 * @returns {Object} The Microphone context value
 * @property {MediaStreamAudioSourceNode} microphone - The audio source node
 * @property {Function} startMicrophone - Function to start the microphone
 * @property {Function} stopMicrophone - Function to stop the microphone
 * @property {Function} setupMicrophone - Function to initialize the microphone
 * @property {number|null} microphoneState - Current microphone state
 * @property {AudioContext} microphoneAudioContext - Audio context for processing
 * @property {Function} setMicrophoneAudioContext - Function to update the audio context
 * @property {ScriptProcessorNode} processor - Audio processor node
 */
function useMicrophone() {
  return useContext(MicrophoneContext);
}

export { MicrophoneContextProvider, useMicrophone };
