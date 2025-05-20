/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertFloat32ToInt16, downsample } from "../utils/audioUtils";

export const getApiKey = async () => {
  try {
    const response = await fetch(withBasePath("/api/deepgram/authenticate"), { method: "POST" });
    
    if (!response.ok) {
      console.error("API key fetch failed:", response.statusText);
      return null;
    }
    
    const result = await response.json();
    
    if (!result || !result.key) {
      console.error("No API key in response");
      return null;
    }
    
    return result.key;
  } catch (error) {
    console.error("Error fetching API key:", error);
    return null;
  }
};

export const sendMicToSocket = (socket: WebSocket) => (event: AudioProcessingEvent) => {
  try {
    if (!event || !event.inputBuffer) {
      return;
    }
    
    const inputData = event.inputBuffer.getChannelData(0);
    
    if (!inputData || inputData.length === 0) {
      return;
    }
    
    const downsampledData = downsample(inputData, 48000, 16000);
    const audioDataToSend = convertFloat32ToInt16(downsampledData);
    
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(audioDataToSend);
    }
  } catch (error) {
    console.error("Error sending microphone data:", error);
  }
};

export const sendSocketMessage = (socket: WebSocket, message: DGMessageV1) => {
  try {
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send message, socket not open");
      return;
    }
    
    const jsonString = JSON.stringify(message);
    socket.send(jsonString);
  } catch (error) {
    console.error("Error sending socket message:", error);
  }
};

export const sendKeepAliveMessage = (socket: WebSocket) => () => {
  sendSocketMessage(socket, { type: "KeepAlive" });
};

// --- V1 API Type Definitions ---

export interface Header {
  key: string;
  value: string;
}

export interface AudioConfig {
  input: {
    encoding: string;
    sample_rate: number;
  };
  output: {
    encoding: string;
    sample_rate: number;
    container?: string;
    buffer_size?: number;
  };
}

export interface ProviderBase {
  type?: string; 
  model?: string;
}

export interface CustomProvider extends ProviderBase {
  type: "custom";
  url: string;
  headers?: Header[];
}

export interface ListenConfigV1 {
  provider: ProviderBase;
}

export interface ThinkConfigV1 {
  provider: ProviderBase | CustomProvider;
  prompt?: string; 
  functions?: LlmFunctionV1[];
}

export interface SpeakConfigV1 {
  provider: ProviderBase;
  temp?: number; 
  rep_penalty?: number; 
}

export interface AgentConfigV1 {
  listen?: ListenConfigV1;
  think?: ThinkConfigV1;
  speak?: SpeakConfigV1;
  prompt?: string; 
  greeting?: string;
  mip_opt_out?: boolean;
  experimental?: any;
}

export interface ContextConfig {
  messages: { role: string; content: string }[];
  replay: boolean;
}

export interface StsConfigV1 {
  type: "Settings";
  audio: AudioConfig;
  agent: AgentConfigV1;
  context?: ContextConfig;
  greeting?: string;
  mip_opt_out?: boolean;
  experimental?: any;
}

export interface LlmParameterBaseV1 {
  type: string;
  description?: string;
}

export interface LlmParameterObjectV1 extends LlmParameterBaseV1 {
  type: "object";
  properties: Record<string, LlmParameterV1>;
  required?: string[];
}

export interface LlmParameterScalarV1 extends LlmParameterBaseV1 {
  type: "string" | "integer" | "number" | "boolean";
}

export type LlmParameterV1 = LlmParameterScalarV1 | LlmParameterObjectV1;

export interface LlmFunctionV1 {
  name: string;
  description: string;
  url?: string; 
  method?: string; 
  headers?: Header[]; 
  parameters: LlmParameterObjectV1 | Record<string, never>; 
}

export interface VoiceV1 { 
  name: string;
  canonical_name: string;
  metadata: {
    accent: string;
    gender: string;
    image: string;
    color: string;
    sample: string;
  };
}

export type DGMessageV1 =
  | StsConfigV1 
  | { type: "UpdateSpeak"; speak: SpeakConfigV1 } 
  | { type: "UpdatePrompt"; prompt: string }
  | { type: "FunctionCallResponse"; id: string; name: string; content: string } 
  | { type: "KeepAlive" }
  | { type: "InjectAgentMessage"; content: string };

export type IncomingDGMessageV1 =
  | { type: "Welcome"; request_id: string }
  | { type: "SettingsApplied" }
  | { type: "PromptUpdated" }
  | { type: "SpeakUpdated" }
  | { type: "Warning"; description: string; code?: string }
  | { type: "Error"; description: string; code: string }
  | { type: "AgentThinking" }
  | { type: "UserStartedSpeaking" } 
  | { type: "AgentAudioDone" }    
  | { type: "AgentStartedSpeaking"; tts_latency?: number; ttt_latency?: number; total_latency?: number }
  | { type: "ConversationText"; role: "user" | "assistant"; content: string } 
  | {
      type: "FunctionCallRequest";
      functions: Array<{ 
        id: string;
        name: string;
        arguments: string; 
        client_side: boolean;
      }>;
    }
  | { type: "FunctionCallResponse"; id: string; name: string; content: string; client_side?: boolean };

// Aliases for external consumption to maintain compatibility or simplify imports
export type AgentConfig = AgentConfigV1;
export type StsConfig = StsConfigV1;
export type LlmFunction = LlmFunctionV1;
export type LlmParameter = LlmParameterV1;
export type LlmParameterBase = LlmParameterBaseV1;
export type LlmParameterObject = LlmParameterObjectV1;
export type LlmParameterScalar = LlmParameterScalarV1;
export type Voice = VoiceV1;
export type DGMessage = DGMessageV1;
export type IncomingDGMessage = IncomingDGMessageV1;
export type ListenConfig = ListenConfigV1;
export type SpeakConfig = SpeakConfigV1;
export type ThinkConfig = ThinkConfigV1;

export const withBasePath = (path: string): string => {
  return path;
};
