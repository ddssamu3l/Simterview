/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-var */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values using clsx and tailwind-merge.
 * 
 * This utility function merges class names from various sources while
 * properly handling Tailwind CSS classes by removing duplicates and
 * resolving conflicts.
 * 
 * @param {...ClassValue[]} inputs - Class values to be merged together
 * @returns {string} A single string of merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extended options for creating an AudioContext.
 * 
 * Extends the standard AudioContextOptions with an optional id property
 * that allows for caching and retrieving AudioContext instances by ID.
 * 
 * @typedef {Object} GetAudioContextOptions
 * @property {string} [id] - Optional unique identifier for caching the AudioContext
 * @property {number} [sampleRate] - Sample rate for the AudioContext (from AudioContextOptions)
 * @property {AudioContextLatencyCategory} [latencyHint] - Latency hint (from AudioContextOptions)
 */
export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

/**
 * Cache for AudioContext instances indexed by ID.
 * 
 * This map stores AudioContext instances by their ID to allow reuse,
 * preventing the creation of multiple contexts for the same purpose.
 * It's only initialized on the client side to prevent SSR issues.
 * 
 * @type {Map<string, AudioContext>}
 */
// Only create the map on the client side
const map: Map<string, AudioContext> = typeof window !== 'undefined' ? new Map() : null as unknown as Map<string, AudioContext>;

/**
 * Creates or retrieves an AudioContext instance with browser autoplay policy handling.
 * 
 * This function handles the common challenges with AudioContext in browsers:
 * 1. Creates a shared AudioContext instance (via Map) that can be reused by ID
 * 2. Handles the browser autoplay policy restrictions by attempting playback
 * 3. Falls back to waiting for user interaction if automatic playback fails
 * 4. Ensures SSR-safe operation by checking for client environment
 * 
 * @param {GetAudioContextOptions} options - Options for the AudioContext
 *   - id: Optional ID to retrieve an existing AudioContext from the map
 *   - Plus standard AudioContextOptions (sampleRate, latencyHint, etc.)
 * @returns {Promise<AudioContext>} A Promise resolving to an AudioContext instance
 * @throws {Error} If called in a non-browser environment
 */
export const audioContext: (
  options?: GetAudioContextOptions,
) => Promise<AudioContext> = (() => {
  // Check if we're running on the client side
  const isClient = typeof window !== 'undefined';
  
  /**
   * Promise that resolves on first user interaction with the page.
   * 
   * This Promise is used to handle browser autoplay policies that require
   * user interaction before allowing audio to play. It resolves automatically
   * when the user interacts with the page via pointer or keyboard.
   * 
   * On the server side, it's simply resolved immediately as a dummy.
   * 
   * @type {Promise<unknown>}
   */
  // Only initialize this on the client
  const didInteract = isClient 
    ? new Promise((res) => {
        window.addEventListener("pointerdown", res, { once: true });
        window.addEventListener("keydown", res, { once: true });
      })
    : Promise.resolve(); // Dummy promise for server side

  return async (options?: GetAudioContextOptions) => {
    // Return a dummy object during server-side rendering
    if (!isClient) {
      throw new Error("AudioContext is only available in the browser");
    }
    
    try {
      const a = new Audio();
      a.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      await a.play();
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    } catch (e) {
      await didInteract;
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();

/**
 * Converts a Blob object to a parsed JSON object.
 * 
 * This utility function reads a Blob containing JSON text and parses it,
 * returning the resulting JavaScript object. It handles browser-only API
 * usage and properly manages the asynchronous nature of FileReader.
 * 
 * @param {Blob} blob - The Blob object containing JSON text to parse
 * @returns {Promise<any>} A Promise that resolves with the parsed JSON object
 * @throws {Error} If called in a non-browser environment or if parsing fails
 */
export const blobToJSON = (blob: Blob) => {
  // Check if we're running on the client side
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("FileReader is only available in the browser"));
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const json = JSON.parse(reader.result as string);
        resolve(json);
      } else {
        reject("oops");
      }
    };
    reader.readAsText(blob);
  });
};

/**
 * Converts a base64 encoded string to an ArrayBuffer.
 * 
 * This utility function decodes a base64 string into a binary ArrayBuffer,
 * which can be used with various Web APIs like AudioContext. It handles
 * browser-only API usage and ensures proper conversion.
 * 
 * @param {string} base64 - The base64 encoded string to convert
 * @returns {ArrayBuffer} The resulting binary data as an ArrayBuffer
 * @throws {Error} If called in a non-browser environment
 */
export function base64ToArrayBuffer(base64: string) {
  // Check if we're running on the client side
  if (typeof window === 'undefined') {
    throw new Error("atob is only available in the browser");
  }
  
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Formats a time value in seconds to a human-readable string.
 * 
 * Converts a numeric time value into a formatted string in "HH:MM:SS" format,
 * with each component padded to two digits.
 * 
 * @param {number} time - The time value in seconds to format
 * @returns {string} A formatted time string in "HH:MM:SS" format
 */
export function formatTime(time: number){
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  /**
   * Pads a number with leading zeros to ensure it's at least 2 digits.
   * 
   * @param {number} num - The number to pad
   * @returns {string} The padded number as a string
   */
  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Formats an ISO date string into a more readable format.
 * 
 * Converts an ISO 8601 date string into a simplified format showing
 * month/day and hours:minutes.
 * 
 * @param {string} isoDateString - An ISO 8601 formatted date string
 * @returns {string} A formatted date string in "MM/DD/HH:MM" format
 */
export function formatISODate(isoDateString: string) {
  const date = new Date(isoDateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${month}/${day}/${hours}:${minutes}`;
}