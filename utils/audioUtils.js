// Audio processing utilities

export function createAudioBuffer(audioContext, data, sampleRate = 24000) {  
  if (!data) {
    console.error("No data provided to createAudioBuffer");
    return null;
  }
  
  try {
    const audioDataView = new Int16Array(data);
    
    if (audioDataView.length === 0) {
      console.error("Received audio data is empty");
      return null;
    }
    
    const buffer = audioContext.createBuffer(1, audioDataView.length, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Convert linear16 PCM to float [-1, 1]
    for (let i = 0; i < audioDataView.length; i++) {
      channelData[i] = audioDataView[i] / 32768;
    }
    return buffer;
  } catch (error) {
    console.error("Error creating audio buffer:", error);
    return null;
  }
}

export function playAudioBuffer(audioContext, buffer, startTimeRef, analyzer) {  
  try {
    if (audioContext.state !== 'running') {
      audioContext.resume().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    source.connect(analyzer); // Connect to the analyzer
    analyzer.connect(audioContext.destination); // Connect the analyzer to the destination

    const currentTime = audioContext.currentTime;
    
    if (startTimeRef.current < currentTime) {
      startTimeRef.current = currentTime;
    }

    source.start(startTimeRef.current);
    startTimeRef.current += buffer.duration;

    return source; // Return the source if you need to further manipulate it (stop, pause, etc.)
  } catch (error) {
    console.error("Error playing audio buffer:", error);
    return null;
  }
}

export function downsample(buffer, fromSampleRate, toSampleRate) {
  if (!buffer) {
    console.error("No buffer provided to downsample");
    return new Float32Array(0);
  }
  
  if (fromSampleRate === toSampleRate) {
    return buffer;
  }
  
  try {
    const sampleRateRatio = fromSampleRate / toSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0,
        count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  } catch (error) {
    console.error("Error during downsampling:", error);
    return new Float32Array(0);
  }
}

export function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff;
  }
  return buf.buffer;
}

export const normalizeVolume = (analyzer, dataArray, normalizationFactor) => {
  analyzer.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((acc, val) => acc + val, 0);
  const average = sum / dataArray.length;
  return Math.min(average / normalizationFactor, 1);
};
