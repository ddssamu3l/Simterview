/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { createContext, useContext, useState, useRef } from "react";
import { getApiKey, sendKeepAliveMessage } from "@/utils/deepgramUtils";

/**
 * React context for managing Deepgram WebSocket connections.
 * 
 * This context provides state and functions for establishing,
 * maintaining, and closing WebSocket connections to Deepgram's
 * speech-to-speech API.
 */
const DeepgramContext = createContext();

/**
 * Provider component for Deepgram WebSocket connections.
 * 
 * This component manages the WebSocket connection to Deepgram,
 * including connection establishment, reconnection logic,
 * and keep-alive functionality.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
const DeepgramContextProvider = ({ children }) => {
  /**
   * The active WebSocket connection to Deepgram.
   */
  const [socket, setSocket] = useState();
  
  /**
   * Current state of the WebSocket connection:
   * -1: not connected
   *  0: connecting
   *  1: connected
   *  2: error
   *  3: closed
   */
  const [socketState, setSocketState] = useState(-1);
  
  /**
   * Number of reconnection attempts made after a connection failure.
   */
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  /**
   * Whether the connection has been rate-limited by Deepgram.
   */
  const [rateLimited, setRateLimited] = useState(false);
  
  /**
   * Whether the connection was manually disconnected by the user.
   * When true, automatic reconnection is disabled.
   */
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  
  /**
   * Reference to the keep-alive interval timer.
   */
  const keepAlive = useRef();
  
  /**
   * Reference to track manual disconnection state to avoid closure issues.
   * This is used within callbacks that might capture stale state.
   */
  const isManuallyDisconnected = useRef(false);
  
  /**
   * Maximum number of reconnection attempts before giving up.
   */
  const maxReconnectAttempts = 5;

  /**
   * Disconnects from the Deepgram WebSocket.
   * 
   * This function:
   * 1. Sets the manual disconnection flags (both state and ref)
   * 2. Clears the keep-alive interval
   * 3. Properly closes the WebSocket connection
   * 4. Resets the socket state and reconnect attempts
   */
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

  /**
   * Establishes a WebSocket connection to Deepgram.
   * 
   * This async function:
   * 1. Checks if manual disconnection is active
   * 2. Verifies reconnection attempts haven't exceeded maximum
   * 3. Fetches the API key
   * 4. Creates a new WebSocket connection
   * 5. Sets up event listeners for connection management
   * 6. Configures binary data handling and keep-alive
   * 
   * @returns {Promise<void>}
   */
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

      /**
       * Handler for WebSocket open event.
       * Sets up connection state and keep-alive interval.
       */
      const onOpen = () => {
        console.log("WebSocket connected");
        setSocketState(1); // connected
        setReconnectAttempts(0); // reset reconnect attempts after a successful connection
        keepAlive.current = setInterval(sendKeepAliveMessage(newSocket), 10000);
      };

      /**
       * Handler for WebSocket error events.
       * Updates state to reflect the error.
       * 
       * @param {Event} err - The error event 
       */
      const onError = (err) => {
        console.error("WebSocket error:", err);
        setSocketState(2); // error
      };

      /**
       * Handler for WebSocket close events.
       * Cleans up resources and attempts reconnection if appropriate.
       * 
       * @param {CloseEvent} event - The close event
       */
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

      // Configure WebSocket for binary data and add event listeners
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

  /**
   * Resets the connection state to allow reconnection.
   * 
   * This function:
   * 1. Clears the manual disconnection flags
   * 2. Resets the reconnection attempt counter
   * 
   * Used when a user wants to manually reconnect after disconnection.
   */
  const resetConnectionState = () => {
    setManuallyDisconnected(false);
    isManuallyDisconnected.current = false; // Reset the ref too
    setReconnectAttempts(0);
  };

  /**
   * Context value provided to consumers.
   */
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

/**
 * Custom hook to access the Deepgram context.
 * 
 * This hook provides access to the Deepgram WebSocket connection
 * and associated state and functions.
 * 
 * @returns {Object} The Deepgram context value
 * @property {WebSocket|null} socket - The active WebSocket connection or null
 * @property {number} socketState - Current connection state (-1 to 3)
 * @property {boolean} rateLimited - Whether connection is rate-limited
 * @property {boolean} manuallyDisconnected - Whether connection was manually closed
 * @property {Function} connectToDeepgram - Function to establish a connection
 * @property {Function} disconnectFromDeepgram - Function to close a connection
 * @property {Function} resetConnectionState - Function to reset connection state
 */
function useDeepgram() {
  return useContext(DeepgramContext);
}

export { DeepgramContextProvider, useDeepgram };
