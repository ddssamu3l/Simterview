/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { createContext, useContext, useState, useRef } from "react";
import { getApiKey, sendKeepAliveMessage } from "@/utils/deepgramUtils";

const DeepgramContext = createContext();

const DeepgramContextProvider = ({ children }) => {
  const [socket, setSocket] = useState();
  const [socketState, setSocketState] = useState(-1);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const keepAlive = useRef();
  const isManuallyDisconnected = useRef(false); // Use ref to avoid closure issues
  const maxReconnectAttempts = 5;

  const disconnectFromDeepgram = () => {
    console.log("Disconnecting from Deepgram");
    
    // Set both the state and ref to prevent auto-reconnection
    setManuallyDisconnected(true);
    isManuallyDisconnected.current = true; // Set ref value that onClose can access
    
    if (socket) {
      // Clear keep-alive interval
      if (keepAlive.current) {
        clearInterval(keepAlive.current);
        keepAlive.current = null;
      }
      
      // Close the WebSocket connection
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, "User disconnected");
        console.log("WebSocket connection closed");
      }
      
      setSocket(null);
      setSocketState(-1);
      setReconnectAttempts(0);
    }
  };

  const connectToDeepgram = async () => {
    // Don't try to reconnect if manually disconnected (check both state and ref)
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

    setSocketState(0); // connecting

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.error("Failed to get API key");
        setSocketState(2); // error
        return;
      }
      
      const newSocket = new WebSocket("wss://agent.deepgram.com/agent", [
        "token",
        apiKey,
      ]);

      const onOpen = () => {
        console.log("WebSocket connected");
        setSocketState(1); // connected
        setReconnectAttempts(0); // reset reconnect attempts after a successful connection
        keepAlive.current = setInterval(sendKeepAliveMessage(newSocket), 10000);
      };

      const onError = (err) => {
        console.error("WebSocket error:", err);
        setSocketState(2); // error
      };

      const onClose = (event) => {
        clearInterval(keepAlive.current);
        setSocketState(3); // closed
        
        // Only attempt to reconnect if not manually disconnected
        // Using ref instead of state to avoid closure issues
        if (!isManuallyDisconnected.current) {
          console.log("WebSocket closed, attempting reconnect");
          setTimeout(connectToDeepgram, 3000); // reconnect after 3 seconds
          setReconnectAttempts((attempts) => attempts + 1);
        } else {
          console.log("WebSocket closed, not reconnecting (manually disconnected)");
        }
      };

      newSocket.binaryType = "arraybuffer";
      newSocket.addEventListener("open", onOpen);
      newSocket.addEventListener("error", onError);
      newSocket.addEventListener("close", onClose);
      
      setSocket(newSocket);
    } catch (error) {
      console.error("Error connecting to Deepgram:", error);
      setSocketState(2); // error
    }
  };

  // Public function to reset the connection state when needed
  const resetConnectionState = () => {
    setManuallyDisconnected(false);
    isManuallyDisconnected.current = false; // Reset the ref too
    setReconnectAttempts(0);
  };

  return (
    <DeepgramContext.Provider
      value={{
        socket,
        socketState,
        rateLimited,
        manuallyDisconnected,
        connectToDeepgram,
        disconnectFromDeepgram,
        resetConnectionState
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram() {
  return useContext(DeepgramContext);
}

export { DeepgramContextProvider, useDeepgram };
