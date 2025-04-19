/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-var */

import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorklet from "./worklets/vol-meter";

import { createWorkletFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = await audioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      const workletName = "audio-processing-worklet-vad";
      const src = createWorkletFromSrc(workletName, AudioRecordingWorklet);

      await this.audioContext.audioWorklet.addModule(src);
      this.recordingWorklet = new AudioWorkletNode(
        this.audioContext,
        workletName,
        {
          processorOptions: {
            sampleRate: this.audioContext.sampleRate,
            silenceDurationSec: 1,
            maxBufferDuration: 15,
          }
        }
      );

      this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
        // worklet processes recording floats and messages converted buffer
        const arrayBuffer = ev.data.data.int16arrayBuffer;

        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          this.emit("data", arrayBufferString);
        }
      };
      this.source.connect(this.recordingWorklet);

      try {
        // vu meter worklet
        const vuWorkletName = "vu-meter";
        await this.audioContext.audioWorklet.addModule(
          createWorkletFromSrc(vuWorkletName, VolMeterWorklet)
        );
        this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
        
        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          this.emit("volume", ev.data.volume);
        };
        this.source.connect(this.vuWorklet);
      } catch (error) {
        console.error("Error initializing vu-meter worklet:", error);
        // Continue even if the VU meter fails
        this.vuWorklet = undefined;
      }
      // VU meter setup is done in the try block above
      this.recording = true;
      resolve();
      this.starting = null;
    });
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}