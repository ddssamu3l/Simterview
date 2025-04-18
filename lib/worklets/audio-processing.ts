// const AudioRecordingWorklet = `
// class AudioProcessingWorklet extends AudioWorkletProcessor {

//   // send and clear buffer every 2048 samples, 
//   // which at 16khz is about 8 times a second
//   buffer = new Int16Array(2048);

//   // current write index
//   bufferWriteIndex = 0;

//   constructor() {
//     super();
//     this.hasAudio = false;
//   }

//   /**
//    * @param inputs Float32Array[][] [input#][channel#][sample#] so to access first inputs 1st channel inputs[0][0]
//    * @param outputs Float32Array[][]
//    */
//   process(inputs) {
//     if (inputs[0].length) {
//       const channel0 = inputs[0][0];
//       this.processChunk(channel0);
//     }
//     return true;
//   }

//   sendAndClearBuffer(){
//     this.port.postMessage({
//       event: "chunk",
//       data: {
//         int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
//       },
//     });
//     this.bufferWriteIndex = 0;
//   }

//   processChunk(float32Array) {
//     const l = float32Array.length;
    
//     for (let i = 0; i < l; i++) {
//       // convert float32 -1 to 1 to int16 -32768 to 32767
//       const int16Value = float32Array[i] * 32768;
//       this.buffer[this.bufferWriteIndex++] = int16Value;
//       if(this.bufferWriteIndex >= this.buffer.length) {
//         this.sendAndClearBuffer();
//       }
//     }

//     if(this.bufferWriteIndex >= this.buffer.length) {
//       this.sendAndClearBuffer();
//     }
//   }
// }
// `;

// export default AudioRecordingWorklet;

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // --- ADJUSTABLE PARAMETERS ---
  // VAD threshold (adjust based on mic sensitivity and background noise)
  ENERGY_THRESHOLD = 0.005; // Example: -46dB approx if max is 1.0
  // Silence duration in seconds (ADJUST THIS VALUE)
  SILENCE_DURATION_SEC = 1.0; // Example: 1 second of silence threshold
  // Minimum speech duration in seconds (optional, prevents sending very short noise bursts)
  MIN_SPEECH_DURATION_SEC = 0.1; // Example: 100ms
  // Maximum buffer duration in seconds before sending anyway (prevents huge buffers)
  MAX_BUFFER_DURATION_SEC = 5.0; // Example: Send chunk every 5 seconds max, even if still speaking

  // Internal state
  accumulatedBuffer = []; // Use a dynamic array initially
  isSpeaking = false;
  silenceFramesCounter = 0;
  speechFramesCounter = 0;
  sampleRate = 16000; // Default, updated in constructor if possible

  // Calculated frame counts
  silenceThresholdFrames = this.SILENCE_DURATION_SEC * this.sampleRate;
  minSpeechFrames = this.MIN_SPEECH_DURATION_SEC * this.sampleRate;
  maxBufferFrames = this.MAX_BUFFER_DURATION_SEC * this.sampleRate;


  constructor(options) {
    super();
    if (options && options.processorOptions && options.processorOptions.sampleRate) {
        this.sampleRate = options.processorOptions.sampleRate;
        // Recalculate frames based on actual sample rate
        this.silenceThresholdFrames = this.SILENCE_DURATION_SEC * this.sampleRate;
        this.minSpeechFrames = this.MIN_SPEECH_DURATION_SEC * this.sampleRate;
        this.maxBufferFrames = this.MAX_BUFFER_DURATION_SEC * this.sampleRate;
    }
    // You could also accept ENERGY_THRESHOLD, SILENCE_DURATION_SEC, MAX_BUFFER_DURATION_SEC
    // via options for configuration from the main thread.
    if(options.silenceDurationSec){
      SILENCE_DURATION_SEC = options.silenceDurationSec;
    }
    if(options.maxBufferDuration){
      MAX_BUFFER_DURATION = options.maxBufferDuration;
    }
  }


  process(inputs, outputs, parameters) {
    const inputChannel = inputs[0]?.[0];

    if (!inputChannel) {
      return true; // No input data
    }

    let frameContainsSpeech = false;
    let currentFrameEnergy = 0;

    // 1. Accumulate and Analyze Energy
    for (let i = 0; i < inputChannel.length; i++) {
        const sample = inputChannel[i];
        currentFrameEnergy += sample * sample;
        // Convert Float32 to Int16 and add to buffer
        const int16Value = Math.max(-32768, Math.min(32767, Math.floor(sample * 32768)));
        this.accumulatedBuffer.push(int16Value);
    }

    currentFrameEnergy = Math.sqrt(currentFrameEnergy / inputChannel.length);
    frameContainsSpeech = currentFrameEnergy > this.ENERGY_THRESHOLD;

    // 2. Update Speech/Silence State
    if (frameContainsSpeech) {
        this.silenceFramesCounter = 0;
        this.isSpeaking = true;
        this.speechFramesCounter += inputChannel.length;
    } else if (this.isSpeaking) {
        // Only count silence *after* speech has started
        this.silenceFramesCounter += inputChannel.length;
    }

    // 3. Check for Sending Conditions

    // Condition A: Sufficient silence after valid speech
    const silenceThresholdMet = !frameContainsSpeech &&
                                this.isSpeaking &&
                                this.silenceFramesCounter >= this.silenceThresholdFrames &&
                                this.speechFramesCounter >= this.minSpeechFrames;

    // Condition B: Buffer exceeds max length (even during speech)
    const maxBufferReached = this.accumulatedBuffer.length >= this.maxBufferFrames;

    if (silenceThresholdMet || maxBufferReached) {
        if (this.accumulatedBuffer.length > 0) {
            const outputBuffer = new Int16Array(this.accumulatedBuffer);
            this.port.postMessage({
                // Use different event names if helpful for the main thread
                event: silenceThresholdMet ? "speech_end_chunk" : "interim_chunk",
                data: {
                    int16arrayBuffer: outputBuffer.buffer,
                },
            });
        }

        // --- Reset state ONLY if silence threshold was met ---
        if (silenceThresholdMet) {
            this.accumulatedBuffer = [];
            this.isSpeaking = false;
            this.silenceFramesCounter = 0;
            this.speechFramesCounter = 0;
        } else {
            // --- If max buffer reached, just clear buffer but keep state ---
            // This allows silence detection to continue correctly after the forced chunk
            this.accumulatedBuffer = [];
            // Note: speechFramesCounter isn't reset, reflecting total speech time so far
            // Note: silenceFramesCounter isn't reset, reflecting silence *since last actual speech*
        }
    }

    return true; // Keep processor alive
  }
}

// Make sure the registration name is unique if you have multiple versions
registerProcessor('audio-processing-worklet-vad', AudioProcessingWorklet);
`;

// --- Keep this part ---
export default AudioRecordingWorklet;
