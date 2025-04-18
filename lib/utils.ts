/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-var */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

// Only create the map on the client side
const map: Map<string, AudioContext> = typeof window !== 'undefined' ? new Map() : null as unknown as Map<string, AudioContext>;

export const audioContext: (
  options?: GetAudioContextOptions,
) => Promise<AudioContext> = (() => {
  // Check if we're running on the client side
  const isClient = typeof window !== 'undefined';
  
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

export function formatTime(time: number){
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export function formatISODate(isoDateString: string) {
  const date = new Date(isoDateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${month}/${day}/${hours}:${minutes}`;
}