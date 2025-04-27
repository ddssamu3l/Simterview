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

export const sendSocketMessage = (socket: WebSocket, message: DGMessage) => {
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

export interface AgentConfig {
  listen: { model: string };
  speak: {
    model: string;
    temp?: number;
    rep_penalty?: number;
  };
  think: {
    provider: { type: string; fallback_to_groq?: boolean };
    model: string;
    instructions: string;
    functions?: LlmFunction[];
  };
}

export interface ContextConfig {
  messages: { role: string; content: string }[];
  replay: boolean;
}

export interface StsConfig {
  type: string;
  audio: AudioConfig;
  agent: AgentConfig;
  context?: ContextConfig;
}

export interface LlmFunction {
  name: string;
  description: string;
  url: string;
  method: string;
  headers: Header[];
  key?: string;
  parameters: LlmParameterObject | Record<string, never>;
}

export type LlmParameter = LlmParameterScalar | LlmParameterObject;

export interface LlmParameterBase {
  type: string;
  description?: string;
}

export interface LlmParameterObject extends LlmParameterBase {
  type: "object";
  properties: Record<string, LlmParameter>;
  required?: string[];
}

export interface LlmParameterScalar extends LlmParameterBase {
  type: "string" | "integer";
}

export interface Header {
  key: string;
  value: string;
}

export interface Voice {
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

export type DGMessage =
  | { type: "SettingsConfiguration"; audio: AudioConfig; agent: AgentConfig }
  | { type: "UpdateInstructions"; instructions: string }
  | { type: "UpdateSpeak"; model: string }
  | { type: "FunctionCallResponse"; function_call_id: string; output: string}
  | { type: "KeepAlive" };

export const withBasePath = (path: string): string => {
  return path;
};
