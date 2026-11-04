/**
 * VoxSphere Audio Trimmer Utilities
 * High-performance, client-side Web Audio API decoding, slicing, and 16-bit PCM WAV encoding.
 */

/**
 * Decodes an audio File, Blob, or URL into an AudioBuffer using the Web Audio API.
 * Also computes normalized waveform peak samples for visualization.
 */
export async function decodeAudioSource(
  source: File | Blob | string
): Promise<{
  audioBuffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  peaks: number[];
}> {
  let arrayBuffer: ArrayBuffer;

  if (typeof source === 'string') {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio from URL: ${res.statusText}`);
    }
    arrayBuffer = await res.arrayBuffer();
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  // Create an AudioContext for decoding
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    // Extract normalized peaks (160 bars for crisp timeline display)
    const channelData = audioBuffer.getChannelData(0);
    const numBars = 160;
    const blockSize = Math.floor(channelData.length / numBars);
    const peaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j += 4) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1, Math.max(0.05, max)));
    }

    return {
      audioBuffer,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      peaks,
    };
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Encodes a slice of an AudioBuffer [startSec, endSec] into a standard 16-bit PCM RIFF WAV Blob.
 */
export function encodeAudioBufferToWav(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.floor(endSec * sampleRate));
  const numSamples = Math.max(0, endSample - startSample);

  if (numSamples <= 0) {
    throw new Error('Selected trim range has zero duration.');
  }

  // Extract channel data
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c).subarray(startSample, endSample));
  }

  // Interleave samples
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = numSamples * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // Helper to write ASCII strings into DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true); // total file size - 8
  writeString(8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM linear)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample (16)

  // 3. "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit PCM samples interleaved
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Encodes a slice of an AudioBuffer [startSec, endSec] into a 16-bit PCM Mono RIFF WAV Blob.
 * Downmixing to mono halves payload size, making it ideal for chunked transcription under 4MB.
 */
export function encodeAudioBufferToMonoWav(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.floor(endSec * sampleRate));
  const numSamples = Math.max(0, endSample - startSample);

  if (numSamples <= 0) {
    throw new Error('Selected range has zero duration.');
  }

  const bytesPerSample = 2; // 16-bit
  const blockAlign = 1 * bytesPerSample; // 1 channel (mono)
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = numSamples * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // 16 for PCM
  view.setUint16(20, 1, true); // PCM linear
  view.setUint16(22, 1, true); // 1 channel (MONO)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // 3. "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Extract channel pointers
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  // Downmix to mono and write 16-bit PCM
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sIdx = startSample + i;
    let mixed = 0;
    for (let c = 0; c < numChannels; c++) {
      mixed += channels[c][sIdx] || 0;
    }
    mixed = mixed / numChannels;
    mixed = Math.max(-1, Math.min(1, mixed));
    const intSample = mixed < 0 ? mixed * 0x8000 : mixed * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Triggers a client-side browser download for a Blob with a specific filename.
 */
export function downloadAudioBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
