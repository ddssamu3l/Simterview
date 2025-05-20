/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { getApiKey, sendKeepAliveMessage } from "@/utils/deepgramUtils";

/**
 * Enum for Deepgram WebSocket connection states.
 */
export enum DeepgramSocketState {
  NOT_CONNECTED = -1,
  CONNECTING = 0,
  CONNECTED = 1,
  ERROR = 2,
  CLOSED = 3,
}

/**
 * Interface for the Deepgram context value.
 */
interface DeepgramContextType {
  socket: WebSocket | undefined;
  socketState: DeepgramSocketState;
  rateLimited: boolean;
  manuallyDisconnected: boolean;
  connectToDeepgram: () => Promise<void>;
  disconnectFromDeepgram: () => void;
  resetConnectionState: () => void;
  reconnectAttempts: number; 
}

/**
 * React context for managing Deepgram WebSocket connections.
 */
const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined,
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

/**
 * Provider component for Deepgram WebSocket connections.
 */
export const DeepgramContextProvider: React.FC<DeepgramContextProviderProps> = ({
  children,
}) => {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [socketState, setSocketState] = useState<DeepgramSocketState>(
    DeepgramSocketState.NOT_CONNECTED,
  );
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);

  const keepAlive = useRef<number | undefined>(undefined);
  const isManuallyDisconnected = useRef<boolean>(false);

  const maxReconnectAttempts = 5;

  const disconnectFromDeepgram = useCallback(() => {
    console.log("Disconnecting from Deepgram");
    setManuallyDisconnected(true);
    isManuallyDisconnected.current = true;

    if (socket) {
      if (keepAlive.current) {
        clearInterval(keepAlive.current);
        keepAlive.current = undefined;
      }
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close(1000, "User disconnected");
        console.log("WebSocket connection closed");
      }
      setSocket(undefined);
      setSocketState(DeepgramSocketState.NOT_CONNECTED);
      setReconnectAttempts(0);
    }
  }, [socket]);

  const connectToDeepgram = useCallback(async () => {
    if (manuallyDisconnected || isManuallyDisconnected.current) {
      console.log("Not connecting: manually disconnected");
      return;
    }

    console.log("Connecting to Deepgram");

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      setRateLimited(true);
      return;
    }

    setSocketState(DeepgramSocketState.CONNECTING);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.error("Failed to get API key");
        setSocketState(DeepgramSocketState.ERROR);
        return;
      }

      const newSocket = new WebSocket(
        "wss://agent.deepgram.com/v1/agent/converse",
        ["token", apiKey],
      );

      const onOpen = () => {
        console.log("WebSocket connected");
        setSocketState(DeepgramSocketState.CONNECTED);
        setReconnectAttempts(0);
        if (newSocket && newSocket.readyState === WebSocket.OPEN) {
            keepAlive.current = window.setInterval(() => sendKeepAliveMessage(newSocket), 10000);
        } else {
            console.log("Socket not open, cannot start keepAlive");
        }
      };

      const onError = (event: Event) => {
        console.error("WebSocket error:", event);
        setSocketState(DeepgramSocketState.ERROR);
      };

      const onClose = (_event: CloseEvent) => {
        if (keepAlive.current) {
          clearInterval(keepAlive.current);
          keepAlive.current = undefined;
        }
        setSocketState(DeepgramSocketState.CLOSED);

        if (!isManuallyDisconnected.current) {
          console.log("WebSocket closed, attempting reconnect");
          setTimeout(connectToDeepgram, 3000); 
          setReconnectAttempts((attempts) => attempts + 1);
        } else {
          console.log(
            "WebSocket closed, not reconnecting (manually disconnected)",
          );
        }
      };

      newSocket.binaryType = "arraybuffer";
      newSocket.addEventListener("open", onOpen);
      newSocket.addEventListener("error", onError);
      newSocket.addEventListener("close", onClose);

      setSocket(newSocket);
    } catch (error) {
      console.error("Error connecting to Deepgram:", error);
      setSocketState(DeepgramSocketState.ERROR);
    }
  }, [
    manuallyDisconnected,
    reconnectAttempts,
    maxReconnectAttempts,
  ]);

  const resetConnectionState = () => {
    setManuallyDisconnected(false);
    isManuallyDisconnected.current = false;
    setReconnectAttempts(0);
    setRateLimited(false); 
  };
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log("DeepgramContextProvider unmounting, disconnecting socket.");
        disconnectFromDeepgram();
      }
      if (keepAlive.current) {
        clearInterval(keepAlive.current);
      }
    };
  }, [socket, disconnectFromDeepgram]);

  return (
    <DeepgramContext.Provider
      value={{
        socket,
        socketState,
        rateLimited,
        manuallyDisconnected,
        connectToDeepgram,
        disconnectFromDeepgram,
        resetConnectionState,
        reconnectAttempts,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

/**
 * Custom hook to access the Deepgram context.
 */
export function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider",
    );
  }
  return context;
} 