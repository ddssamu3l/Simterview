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
import { interviewerSystemPrompt } from '@/public';
import { getInterview } from '@/app/api/interview/get/route';
import { toast } from 'sonner';
import { SchemaType } from '@google/generative-ai';
import { ToolCall } from '@/multimodal-live-types';
import { saveInterviewFeedback } from '@/app/api/interview/post/route';

interface Message {
  role: 'user' | 'assistant' | "system";
  content: {
    text?: string;
    modelTurn?: {
      parts?: Array<{ text: string }>;
    };
  };
}

function GeminiVoiceChat({ username, userId, interviewId }: AgentProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<Message>();
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isSpeaking, setisSpeaking] = useState(false);
  const [interviewReady, setInterviewReady] = useState(false);
  const [interviewType, setInterviewType] = useState("");
  const [isBehavioral, setIsBehavioral] = useState(false);
  const [interviewLength, setInterviewLength] = useState(0);
  const [time, setTime] = useState(0);
  const [interviewQuestions, setInterviewQuestions] = useState([""]);

  // Type your refs with the appropriate classes or null
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const defaultFramerate = 1;
  const [framerate, setFramerate] = useState(defaultFramerate);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientRef = useRef<MultimodalLiveClient | null>(null);

  // Properly typed refs for screen sharing
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenCaptureStreamRef = useRef<MediaStream | null>(null);
  const screenCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const interviewVoices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];

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
          if(interviewDetails.data && interviewDetails.data.createdBy === userId){
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
        setConnected(false);
      });

      clientRef.current.on('toolcall', (toolCall: ToolCall) => {
        console.log("Tool called: " + JSON.stringify(toolCall));
        if (toolCall.functionCalls[0].name === "store-feedback"){
          console.log("saving feedback...");
          async function saveFeedback(){
            try{
              // Type assertion to tell TypeScript about the expected structure
              const args = toolCall.functionCalls[0].args as { pass: boolean; feedback: string };
              const pass = args.pass;
              const feedback = args.feedback;
              await saveInterviewFeedback({ interviewId, userId, pass, feedback });
            }catch(error){
              console.error("Error: " + error);
            }
          }
          saveFeedback();
          sendSystemMessage("The store-feedback tool is completed. An internal record of the candidate's performance for this interview is saved.");
        }
      });

      // Setup listeners for content and audio events
      clientRef.current.on('content', (data: any) => {        
        let transcriptText = '';
        
        if (data.modelTurn && data.modelTurn.parts && data.modelTurn.parts.length > 0) {
          transcriptText = data.modelTurn.parts[0].text;
          console.log("Extracted transcript:", transcriptText || "No transcript found");
        }
        // Check if data directly has text property (another possible format)
        else if (data.text) {
          transcriptText = data.text;
        }
        // Check if data is text itself (string)
        else if (typeof data === 'string') {
          transcriptText = data;
        }
        // Check if data has a text attribute at the top level
        else if (data.parts && data.parts.length > 0) {
          for (const part of data.parts) {
            if (part.text) {
              transcriptText = part.text;
              break;
            }
          }
        }
        else{
          console.log("No texts found");
        }
        
        // Add message to conversation history even if empty to debug
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: { 
            text: transcriptText || "[No text transcript]",
            modelTurn: data.modelTurn || data
          } 
        }]);
        
        // Always update the last message for display in UI, even if no transcript was found
        setLastAssistantMessage({ 
          role: 'assistant', 
          content: { text: transcriptText || "[Listening...]" } 
        });
      });

      clientRef.current.on('audio', (audioData: any) => {        
        if (audioStreamerRef.current) {
          audioStreamerRef.current.addPCM16(new Uint8Array(audioData));
          setisSpeaking(true);
          
          // When audio stops (pause detected), set isSpeaking to false
          const dataLength = audioData.byteLength;
          if (dataLength === 0 || dataLength < 100) { // Small packet might indicate end
            setTimeout(() => setisSpeaking(false), 500); // Small delay to prevent flickering
          }
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

    // dynamic framerate setting
    const handleKeyPress = () => {
      setFramerate(15); 
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setFramerate(defaultFramerate);
      }, 500);
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      window.removeEventListener('keydown', handleKeyPress);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interviewId]);

  // timer mechanic
  useEffect(() => {
    if(!connected) return 

    if (time <= 0) handleDisconnect();

    const intervalId = setInterval(() => {
      setTime(prev => prev - 1);
    }, 1000);

    // if less than 5 minutes left, inform the AI recruiter
    if(time == 600){
      sendSystemMessage("There is only 10 minutes left in the interview.");
    }

    if(time == 300){
      sendSystemMessage("There is only 5 minute left in the interview. Tell the candidate that you are wrapping up the interview and you'll need a second in order to generate a comprehensive analysis. After you are done calling the store-feedback tool, summarize the interview with the candidate verbally.");
    }

    return () => clearInterval(intervalId);
  }, [time, connected]);

  // dynamic framerate switching
  useEffect(() => {
    // clear the previous framerate interval and set the new framerate interval
    if (screenCaptureIntervalRef.current) {
      clearInterval(screenCaptureIntervalRef.current);
    }
    screenCaptureIntervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 1000 / framerate);
  }, [framerate])

  // Connect to the API
  const handleConnect = async () => {
    try {
      // select a random voice as the interviewer's voice
      const voiceNumber = Math.floor(Math.random() * 5);

      const interviewDetailsSystemPrompt = `\n\n Interview type = ${interviewType}, Interview length = ${time}, Interview question: ${interviewQuestions}`;

      await clientRef.current?.connect({
        model: "models/gemini-2.0-flash-exp",
        systemInstruction: {
          parts: [{ text: interviewerSystemPrompt + interviewDetailsSystemPrompt }],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "store-feedback",
                description: "Stores an internal feedback record of the candidate's interview performance in the database",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    pass: {
                      type: SchemaType.BOOLEAN,
                      description: 'Whether the candidate passed the interview. Set to true if you would pass the candidate in an interview, false otherwise.',
                    },
                    feedback: {
                      type: SchemaType.STRING,
                      description: "A written report for the hiring manager describing the candidate's overall performance that includes the things they did well and the things they need to improve on.",
                    },
                  },
                  required: ['pass', 'feedback'],
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: interviewVoices[voiceNumber],
              },
            },
          },
        },
      });

      setConnected(true);
      sendSystemMessage("The candidate has joined. Please greet the candidate!");
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
    
    // Stop screen sharing if active
    if (screenSharing) {
      stopScreenCapture();
    }
    
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

  // Start screen capture
  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: { ideal: 15 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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

      // Set up screen capture framerate
      screenCaptureIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000/defaultFramerate);

      setScreenSharing(true);

      // Listen for when user stops sharing
      mediaStream.getTracks()[0].onended = () => {
        stopScreenCapture();
      };
      
      // Send a message to inform the AI that screen sharing has started
      if (connected && clientRef.current) {
        sendSystemMessage("The user has shared their screen. Let the user know once you can see it.");
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
      sendSystemMessage("The user has stopped sharing their screen.");
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
      } catch (error) {
        console.error('Error capturing or sending frame:', error);
      }
    }
  };

  // Send text message to the AI from the user
  // const sendMessage = (text: string) => {
  //   if (connected && text.trim() && clientRef.current) {
  //     try {
  //       clientRef.current.send({ text });
  //       setMessages(prev => [...prev, { role: 'user', content: { text } }]);
  //     } catch (error) {
  //       console.error("Failed to send message:", error);
  //       // If the WebSocket isn't connected, reconnect
  //       if (error instanceof Error && error.message === "WebSocket is not connected") {
  //         handleConnect(); // Attempt to reconnect
  //       }
  //     }
  //   }
  // };

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

  return (
    <div className="flex flex-col call-view">
      <div>
        {!isBehavioral && 
          <div className="text-xl font-semibold text-center">
            Capture framerate: {framerate}
          </div>
        }
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
          
          {/* Display the transcript from the AI */}
          {lastAssistantMessage && lastAssistantMessage.content.text && (
            <div className=" mt-4 p-3 bg-primary-100 text-black rounded-lg max-w-md text-sm">
              <p>{lastAssistantMessage.content.text}</p>
            </div>
          )}
        </div>

        <div className="card-border border-primary-200/50 ">
          <div className="card-content">
            <Image src="/icon.png" alt="user avatar" width={540} height={540} className="rounded-full object-cover size-[120px]" />
            <h3>{username}</h3>
          </div>
        </div>
      </div>
        
      <div className="w-full flex justify-center gap-6 mb-4 font-bold rounded-sm">
        {!connected ? (
          <Button
            disabled={!interviewReady}
            onClick={handleConnect}
            className="w-[150px] bg-white text-black font-bold px-4 py-2"
          >
            Start Interview
          </Button>
        ) : (
          <>
            <Button
              onClick={handleDisconnect}
              className="w-[150px] bg-red-500 text-white font-semibold"
            >
              Start Over
            </Button>
            <Button
              onClick={toggleMicrophone}
              className={`${audioEnabled ? 'bg-red-400' : 'bg-green-500'} w-[150px] text-white font-semibold`}
            >
              {audioEnabled ? 'Mute Microphone' : 'Enable Microphone'}
            </Button>
            {!isBehavioral && (
              !screenSharing ? (
                <Button
                  onClick={startScreenCapture}
                  className="w-[150px] bg-purple-500 text-white font-semibold"
                >
                  Share Screen
                </Button>
              ) : (
                <Button
                  onClick={stopScreenCapture}
                  className="w-[150px] bg-red-400 text-white font-semibold"
                >
                  Stop Sharing
                </Button>
              )
            )}
          </>
        )}
      </div>

      <div className="w-full flex justify-center gap-6 mt-12">
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
      </div>
    </div>
  )
}

export default GeminiVoiceChat;
