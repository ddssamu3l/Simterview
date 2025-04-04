/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from 'react';
import { MultimodalLiveClient } from '@/lib/multimodal-live-client';
import { AudioRecorder } from '@/lib/audio-recorder';
import { AudioStreamer } from '@/lib/audio-streamer';

interface Message {
  role: 'user' | 'assistant' | "system";
  content: {
    text?: string;
    modelTurn?: {
      parts?: Array<{ text: string }>;
    };
  };
}

function GeminiVoiceChat() {
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // Type your refs with the appropriate classes or null
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const clientRef = useRef<MultimodalLiveClient | null>(null);

  // Properly typed refs for screen sharing
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenCaptureStreamRef = useRef<MediaStream | null>(null);
  const screenCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client and audio streamer
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new MultimodalLiveClient({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
      });

      // Setup listeners for connection and errors
      clientRef.current.on('open', () => {
        console.log("WebSocket connection opened");
      });

      clientRef.current.on('close', (event) => {
        console.log("WebSocket connection closed", event);
        setConnected(false);
      });

      // Setup listeners for content and audio events
      clientRef.current.on('content', (data: any) => {
        setMessages(prev => [...prev, { role: 'assistant', content: data }]);
      });

      clientRef.current.on('audio', (audioData: any) => {
        if (audioStreamerRef.current) {
          audioStreamerRef.current.addPCM16(new Uint8Array(audioData));
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
    };
  }, []);

  // Connect to the API
  const handleConnect = async () => {
    try {
      await clientRef.current?.connect({
        model: "models/gemini-2.0-flash-exp",
      });
      setConnected(true);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  // Disconnect from the API and stop audio recording and screen sharing if active
  const handleDisconnect = () => {
    clientRef.current?.disconnect();
    setConnected(false);
    
    // Stop audio recording if active
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setAudioEnabled(false);
    }
    
    // Stop screen sharing if active
    if (screenSharing) {
      stopScreenCapture();
    }
    
    // Reset messages
    setMessages([]);
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

  // Start screen capture
  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: { ideal: 1 },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      screenCaptureStreamRef.current = mediaStream;

      // Set both video elements to the same stream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = mediaStream;
      }

      // Set up screen capture interval (0.5 frames per second)
      screenCaptureIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 2000);

      setScreenSharing(true);

      // Listen for when user stops sharing
      mediaStream.getTracks()[0].onended = () => {
        stopScreenCapture();
      };
      
      // Send a message to inform the AI that screen sharing has started
      if (connected && clientRef.current) {
        sendMessage("I've started sharing my screen with you. Please let me know if you can see it.");
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  // Stop screen capture
  const stopScreenCapture = () => {
    if (screenCaptureStreamRef.current) {
      screenCaptureStreamRef.current.getTracks().forEach(track => track.stop());
      screenCaptureStreamRef.current = null;
    }

    if (screenCaptureIntervalRef.current) {
      clearInterval(screenCaptureIntervalRef.current);
      screenCaptureIntervalRef.current = null;
    }

    // Clear both video elements
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
    }

    setScreenSharing(false);
    
    // Inform the AI that screen sharing has stopped
    if (connected && clientRef.current) {
      sendMessage("I've stopped sharing my screen.");
    }
  };

  // Capture and send a frame from the screen
  const captureAndSendFrame = () => {
    if (!connected || !screenCaptureStreamRef.current || !hiddenVideoRef.current || !canvasRef.current || !clientRef.current) {
      return;
    }

    const video = hiddenVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Resize to 25% of original (to reduce bandwidth)
    canvas.width = video.videoWidth * 0.25;
    canvas.height = video.videoHeight * 0.25;

    if (canvas.width > 0 && canvas.height > 0) {
      try {
        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to base64 JPEG
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // Get just the base64 data part (remove the prefix)
        const data = base64.slice(base64.indexOf(',') + 1);

        // Send to AI
        clientRef.current.sendRealtimeInput([
          { mimeType: 'image/jpeg', data }
        ]);
        
        console.log('Screen capture frame sent');
      } catch (error) {
        console.error('Error capturing or sending frame:', error);
      }
    }
  };

  // Send text message
  const sendMessage = (text: string) => {
    if (connected && text.trim() && clientRef.current) {
      try {
        clientRef.current.send({ text });
        setMessages(prev => [...prev, { role: 'user', content: { text } }]);
      } catch (error) {
        console.error("Failed to send message:", error);
        // If the WebSocket isn't connected, reconnect
        if (error instanceof Error && error.message === "WebSocket is not connected") {
          handleConnect(); // Attempt to reconnect
        }
      }
    }
  };

  return (
    <div className="">
      {/* Hidden video and canvas elements for screen capture */}
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
      
      {/* Screen sharing preview (shown only when active) */}
      {screenSharing && (
        <div className="fixed bottom-4 right-4 border border-gray-300 rounded shadow-lg overflow-hidden z-10">
          <div className="bg-black text-white text-xs p-1 flex justify-between items-center">
            <span>Screen sharing (AI can see this)</span>
            <button 
              onClick={stopScreenCapture}
              className="bg-red-500 text-white px-2 py-0.5 rounded text-xs"
            >
              Stop
            </button>
          </div>
          <video 
            ref={videoRef} 
            className="w-64 h-auto" 
            autoPlay 
            muted
          />
        </div>
      )}

      <div className="controls flex flex-wrap gap-2 mb-4">
        {!connected ? (
          <button 
            onClick={handleConnect}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Start Chat
          </button>
        ) : (
          <>
            <button 
              onClick={handleDisconnect}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              End Chat
            </button>
            <button 
              onClick={toggleMicrophone}
              className={`${audioEnabled ? 'bg-red-400' : 'bg-green-500'} text-white px-4 py-2 rounded`}
            >
              {audioEnabled ? 'Mute Microphone' : 'Enable Microphone'}
            </button>
            {!screenSharing ? (
              <button 
                onClick={startScreenCapture}
                className="bg-purple-500 text-white px-4 py-2 rounded"
              >
                Share Screen
              </button>
            ) : (
              <button 
                onClick={stopScreenCapture}
                className="bg-red-400 text-white px-4 py-2 rounded"
              >
                Stop Sharing
              </button>
            )}
          </>
        )}
      </div>

      <div className="conversation w-full max-w-2xl h-96 overflow-y-auto border border-gray-300 rounded p-4 mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`message p-2 mb-2 rounded ${msg.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'} max-w-[80%]`}>
            {msg.content.modelTurn?.parts?.[0]?.text || msg.content.text || "[Non-text content]"}
          </div>
        ))}
      </div>

      {connected && (
        <div className="message-input w-full max-w-2xl flex">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l px-4 py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                sendMessage(input.value);
                input.value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              sendMessage(input.value);
              input.value = '';
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-r"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default GeminiVoiceChat;
