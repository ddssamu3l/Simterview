"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  voiceBotReducer,
  INCREMENT_SLEEP_TIMER,
  START_SPEAKING,
  START_LISTENING,
  START_SLEEPING,
  ADD_MESSAGE,
  SET_PARAMS_ON_COPY_URL,
  ADD_BEHIND_SCENES_EVENT,
} from "./VoiceBotReducer";

/**
 * Default timeout in seconds before the bot transitions to sleep mode due to inactivity.
 */
const defaultSleepTimeoutSeconds = 60;

/**
 * Enum defining the various event types that can occur during a voice interaction.
 * 
 * These events are used to track the state of the conversation and trigger
 * appropriate responses in the UI and audio processing pipeline.
 */
export enum EventType {
  /** Agent configuration has been successfully applied */
  SETTINGS_APPLIED = "SettingsApplied",
  /** Agent has finished speaking the current audio segment */
  AGENT_AUDIO_DONE = "AgentAudioDone",
  /** User has started speaking (voice activity detected) */
  USER_STARTED_SPEAKING = "UserStartedSpeaking",
  /** Agent has started speaking (beginning of agent's turn) */
  AGENT_STARTED_SPEAKING = "AgentStartedSpeaking",
  /** New conversation text received (from either user or agent) */
  CONVERSATION_TEXT = "ConversationText",
  /** Agent has finished thinking and processing the current request */
  END_OF_THOUGHT = "EndOfThought",
  /** Agent is requesting to call a function */
  FUNCTION_CALL_REQUEST = "FunctionCallRequest",
  /** Confirmation that a prompt update has been applied */
  PROMPT_UPDATED = "PromptUpdated",
  /** Confirmation that a speak configuration update has been applied */
  SPEAK_UPDATED = "SpeakUpdated",
  /** Non-fatal errors or warnings from the agent */
  WARNING = "Warning",
  /** Notification that the agent is thinking */
  AGENT_THINKING = "AgentThinking",
}

/**
 * Union type representing all possible message types in the voice bot conversation.
 * Can be either a LatencyMessage with timing data or a ConversationMessage with text.
 */
export type VoiceBotMessage = LatencyMessage | ConversationMessage;

/**
 * Message containing latency measurements for the conversation.
 * Used for performance tracking and optimization.
 * 
 * @property {number|null} total_latency - Total end-to-end latency in milliseconds, or null if unavailable
 * @property {number} tts_latency - Text-to-speech conversion latency in milliseconds
 * @property {number} ttt_latency - Think-to-text processing latency in milliseconds
 */
export type LatencyMessage = {
  total_latency: number | null;
  tts_latency: number;
  ttt_latency: number;
};

/**
 * Union type representing text messages in the conversation.
 * Can be either from the user or from the assistant.
 */
export type ConversationMessage = UserMessage | AssistantMessage;

/**
 * Message from the user in the conversation.
 * 
 * @property {string} user - The text content of the user's message
 */
export type UserMessage = { user: string };

/**
 * Message from the assistant in the conversation.
 * 
 * @property {string} assistant - The text content of the assistant's message
 */
export type AssistantMessage = { assistant: string };

/**
 * Events that occur behind the scenes during a conversation.
 * 
 * These events are used for tracking the internal state of the conversation
 * and for debugging purposes. They're not directly visible to the user
 * but influence the behavior of the voice bot.
 */
export type BehindTheScenesEvent =
  | { type: EventType.SETTINGS_APPLIED }
  | { type: EventType.USER_STARTED_SPEAKING }
  | { type: EventType.AGENT_STARTED_SPEAKING }
  | { type: EventType.CONVERSATION_TEXT; role: "user" | "assistant"; content: string }
  | { type: "Interruption" }
  | { type: EventType.END_OF_THOUGHT };

/**
 * Type guard to check if a message is a ConversationMessage (not a LatencyMessage).
 * 
 * @param {VoiceBotMessage} voiceBotMessage - The message to check
 * @returns {boolean} True if the message is a ConversationMessage
 */
export const isConversationMessage = (
  voiceBotMessage: VoiceBotMessage,
): voiceBotMessage is ConversationMessage =>
  isUserMessage(voiceBotMessage as UserMessage) ||
  isAssistantMessage(voiceBotMessage as AssistantMessage);

/**
 * Type guard to check if a message is a LatencyMessage.
 * 
 * @param {VoiceBotMessage} voiceBotMessage - The message to check
 * @returns {boolean} True if the message is a LatencyMessage
 */
export const isLatencyMessage = (
  voiceBotMessage: VoiceBotMessage,
): voiceBotMessage is LatencyMessage =>
  (voiceBotMessage as LatencyMessage).tts_latency !== undefined;

/**
 * Type guard to check if a message is from the user.
 * 
 * @param {ConversationMessage} conversationMessage - The message to check
 * @returns {boolean} True if the message is from the user
 */
export const isUserMessage = (
  conversationMessage: ConversationMessage,
): conversationMessage is UserMessage => (conversationMessage as UserMessage).user !== undefined;

/**
 * Type guard to check if a message is from the assistant.
 * 
 * @param {ConversationMessage} conversationMessage - The message to check
 * @returns {boolean} True if the message is from the assistant
 */
export const isAssistantMessage = (
  conversationMessage: ConversationMessage,
): conversationMessage is AssistantMessage =>
  (conversationMessage as AssistantMessage).assistant !== undefined;

/**
 * Basic action type for the VoiceBot reducer.
 * This is extended in VoiceBotReducer.ts with more specific action types.
 */
export type VoiceBotAction = { type: string };

/**
 * Enum defining the possible states of the voice bot.
 * 
 * @enum {string}
 */
export enum VoiceBotStatus {
  /** Bot is actively listening for user input */
  LISTENING = "listening",
  /** Bot is processing the user's request */
  THINKING = "thinking",
  /** Bot is speaking (audio is playing) */
  SPEAKING = "speaking",
  /** Bot is in sleep mode due to inactivity */
  SLEEPING = "sleeping",
  /** Initial state before any interaction */
  NONE = "",
}

/**
 * State interface for the VoiceBot context.
 * 
 * @interface VoiceBotState
 */
export interface VoiceBotState {
  /** Current status of the voice bot */
  status: VoiceBotStatus;
  /** Counter for tracking seconds of inactivity */
  sleepTimer: number;
  /** Array of all messages in the conversation */
  messages: VoiceBotMessage[];
  /** Whether to include parameters when copying the URL */
  attachParamsToCopyUrl: boolean;
  /** Array of behind-the-scenes events for debugging */
  behindTheScenesEvents: BehindTheScenesEvent[];
}

/**
 * Context interface with state and functions for the VoiceBot.
 * 
 * This extends the VoiceBotState with methods for manipulating
 * the conversation state and transitioning between different states.
 * 
 * @interface VoiceBotContext
 * @extends VoiceBotState
 */
export interface VoiceBotContext extends VoiceBotState {
  /** Add a new message to the conversation */
  addVoicebotMessage: (newMessage: VoiceBotMessage) => void;
  /** Add a behind-the-scenes event for debugging */
  addBehindTheScenesEvent: (data: BehindTheScenesEvent) => void;
  /** Ref tracking whether the bot is waiting for user voice after sleep */
  isWaitingForUserVoiceAfterSleep: React.MutableRefObject<boolean>;
  /** Transition to the speaking state */
  startSpeaking: (wakeFromSleep?: boolean) => void;
  /** Transition to the listening state */
  startListening: (wakeFromSleep?: boolean) => void;
  /** Transition to the sleeping state */
  startSleeping: () => void;
  /** Toggle between sleeping and listening states */
  toggleSleep: () => void;
  /** Messages in display order, with latency messages inserted at turn boundaries */
  displayOrder: VoiceBotMessage[];
  /** Set whether to attach params to the copied URL */
  setAttachParamsToCopyUrl: (attachParamsToCopyUrl: boolean) => void;
}

/**
 * Initial state for the VoiceBot context.
 */
const initialState: VoiceBotState = {
  status: VoiceBotStatus.NONE,
  sleepTimer: 0,
  messages: [],
  attachParamsToCopyUrl: true,
  behindTheScenesEvents: [],
};

/**
 * React context for sharing VoiceBot state and functions throughout the component tree.
 */
export const VoiceBotContext = createContext<VoiceBotContext | undefined>(undefined);

/**
 * Custom hook to access the VoiceBot context.
 * 
 * @returns {VoiceBotContext} The VoiceBot context
 * @throws {Error} If used outside of a VoiceBotProvider
 */
export function useVoiceBot() {
  const context = useContext(VoiceBotContext);
  if (!context) throw new Error("useVoiceBot must be used within a VoiceBotProvider");
  return context;
}

/**
 * Props for the VoiceBotProvider component.
 * 
 * @interface Props
 */
interface Props {
  /** React children to render within the provider */
  children: React.ReactNode;
}

/**
 * Provider component for the VoiceBot context.
 * 
 * This component manages the state and behavior of the voice bot,
 * including state transitions, message handling, and the conversation flow.
 * 
 * @param {Props} props - The component props
 * @returns {React.ReactNode} The provider component with children
 */
export function VoiceBotProvider({ children }: Props) {
  const [state, dispatch] = useReducer(voiceBotReducer, initialState);
  const isWaitingForUserVoiceAfterSleep = useRef<boolean>(false);
  const sleepInterval = useRef<NodeJS.Timeout | undefined>(undefined);

  const addVoicebotMessage = useCallback((newMessage: VoiceBotMessage) => {
    dispatch({ type: ADD_MESSAGE, payload: newMessage });
  }, [dispatch]);

  const addBehindTheScenesEvent = useCallback((event: BehindTheScenesEvent) => {
    dispatch({ type: ADD_BEHIND_SCENES_EVENT, payload: event });
  }, [dispatch]);

  const startSpeaking = useCallback((wakeFromSleep = false) => {
    if (wakeFromSleep) {
      isWaitingForUserVoiceAfterSleep.current = true;
    }
    dispatch({ type: START_SPEAKING });
  }, [dispatch]);

  const startListening = useCallback((wakeFromSleep = false) => {
    if (wakeFromSleep) {
      isWaitingForUserVoiceAfterSleep.current = false;
    }
    dispatch({ type: START_LISTENING });
  }, [dispatch]);

  const startSleeping = useCallback(() => {
    dispatch({ type: START_SLEEPING });
  }, [dispatch]);

  const toggleSleep = useCallback(() => {
    if (state.status === VoiceBotStatus.SLEEPING) {
      startListening(true);
    } else {
      startSleeping();
    }
  }, [state.status, startListening, startSleeping]);

  const setAttachParamsToCopyUrl = useCallback((attachParamsToCopyUrl: boolean) => {
    dispatch({ type: SET_PARAMS_ON_COPY_URL, payload: attachParamsToCopyUrl });
  }, [dispatch]);

  /**
   * Set up a timer to increment the sleep timer every second.
   * This is used to track inactivity and transition to sleep mode.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: INCREMENT_SLEEP_TIMER });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Transition to sleep mode when inactivity threshold is reached.
   */
  useEffect(() => {
    if (state.sleepTimer > defaultSleepTimeoutSeconds) {
      startSleeping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sleepTimer]);

  /**
   * Determine if a message represents the end of a turn in the conversation.
   * This is true when an assistant message is followed by a user message.
   * 
   * @param {ConversationMessage} message - The current message
   * @param {ConversationMessage} previousMessage - The previous message
   * @returns {boolean} True if this is the end of a turn
   */
  const endOfTurn = (message: ConversationMessage, previousMessage: ConversationMessage) =>
    isAssistantMessage(previousMessage) && isUserMessage(message);

  /**
   * Calculate the display order of messages, inserting latency messages at turn boundaries.
   * This ensures that latency information is displayed at the appropriate points in the conversation.
   */
  const displayOrder = useMemo(() => {
    const conv = state.messages.filter(isConversationMessage);
    const lat = state.messages.filter(isLatencyMessage);

    const acc: Array<VoiceBotMessage> = [];

    conv.forEach((conversationMessage, i, arr) => {
      const previousMessage = arr[i - 1];
      if (previousMessage && endOfTurn(conversationMessage, previousMessage)) {
        const latencyMessage = lat.shift();
        if (latencyMessage) acc.push(latencyMessage);
      }
      acc.push(conversationMessage);
      if (isAssistantMessage(conversationMessage) && i === arr.length - 1) {
        const latencyMessage = lat.shift();
        if (latencyMessage) acc.push(latencyMessage);
      }
    });
    return acc;
  }, [state.messages]);

  /**
   * Memoized context value to prevent unnecessary re-renders.
   */
  const contextValue = useMemo(() => {
    return {
      ...state,
      addVoicebotMessage,
      addBehindTheScenesEvent,
      isWaitingForUserVoiceAfterSleep,
      startSpeaking,
      startListening,
      startSleeping,
      toggleSleep,
      displayOrder,
      setAttachParamsToCopyUrl,
    };
  }, [state, displayOrder, addVoicebotMessage, addBehindTheScenesEvent, startSpeaking, startListening, startSleeping, toggleSleep, setAttachParamsToCopyUrl]);

  return <VoiceBotContext.Provider value={contextValue}>{children}</VoiceBotContext.Provider>;
}
