import {
  type VoiceBotState,
  VoiceBotStatus,
  type ConversationMessage,
  type LatencyMessage,
  type BehindTheScenesEvent,
} from "./VoiceBotContextProvider";

/**
 * Action type for transitioning to the listening state.
 * This action resets the sleep timer and sets status to LISTENING.
 */
export const START_LISTENING = "start_listening";

/**
 * Action type for transitioning to the thinking state.
 * This action sets status to THINKING.
 */
export const START_THINKING = "start_thinking";

/**
 * Action type for transitioning to the speaking state.
 * This action resets the sleep timer and sets status to SPEAKING.
 */
export const START_SPEAKING = "start_speaking";

/**
 * Action type for transitioning to the sleeping state.
 * This action sets status to SLEEPING.
 */
export const START_SLEEPING = "start_sleeping";

/**
 * Action type for incrementing the sleep timer.
 * This is dispatched every second to track inactivity.
 */
export const INCREMENT_SLEEP_TIMER = "increment_sleep_timer";

/**
 * Action type for adding a new message to the conversation.
 * This action adds a ConversationMessage or LatencyMessage to the messages array.
 */
export const ADD_MESSAGE = "add_message";

/**
 * Action type for setting whether to attach params to copied URL.
 * This controls whether URL parameters are included when users copy the URL.
 */
export const SET_PARAMS_ON_COPY_URL = "set_attach_params_to_copy_url";

/**
 * Action type for adding behind-the-scenes events.
 * These events track internal state changes for debugging and analysis.
 */
export const ADD_BEHIND_SCENES_EVENT = "add_behind_scenes_event";

/**
 * Union type of all possible actions for the VoiceBot reducer.
 * 
 * Each action has a type field and may include a payload with
 * additional data specific to that action type.
 */
export type VoiceBotAction =
  | { type: typeof START_LISTENING }
  | { type: typeof START_THINKING }
  | { type: typeof START_SPEAKING }
  | { type: typeof START_SLEEPING }
  | { type: typeof INCREMENT_SLEEP_TIMER }
  | { type: typeof ADD_MESSAGE; payload: ConversationMessage | LatencyMessage }
  | { type: typeof SET_PARAMS_ON_COPY_URL; payload: boolean }
  | { type: typeof ADD_BEHIND_SCENES_EVENT; payload: BehindTheScenesEvent };

/**
 * Reducer function for the VoiceBot state.
 * 
 * This function handles all state transitions for the VoiceBot context,
 * producing a new state object based on the current state and the action.
 * 
 * @param {VoiceBotState} state - Current state of the VoiceBot
 * @param {VoiceBotAction} action - Action to process
 * @returns {VoiceBotState} New state after applying the action
 */
export const voiceBotReducer = (state: VoiceBotState, action: VoiceBotAction) => {
  switch (action.type) {
    case START_LISTENING:
      return { ...state, status: VoiceBotStatus.LISTENING, sleepTimer: 0 };
    case START_THINKING:
      return { ...state, status: VoiceBotStatus.THINKING };
    case START_SPEAKING:
      return { ...state, status: VoiceBotStatus.SPEAKING, sleepTimer: 0 };
    case START_SLEEPING:
      return { ...state, status: VoiceBotStatus.SLEEPING };
    case INCREMENT_SLEEP_TIMER:
      return { ...state, sleepTimer: state.sleepTimer + 1 };
    case ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case SET_PARAMS_ON_COPY_URL:
      return { ...state, attachParamsToCopyUrl: action.payload };
    case ADD_BEHIND_SCENES_EVENT:
      return {
        ...state,
        behindTheScenesEvents: [...state.behindTheScenesEvents, action.payload],
      };
    default:
      return state;
  }
};
