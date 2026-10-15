/**
 * Generates an in-memory playable audio WAV blob for demo samples
 * This ensures that when testing samples, the player has real audio waveforms,
 * real playback time ticking, and audible marine chime / audio tones.
 */
export function createSyntheticAudioBlob(durationSeconds: number): string {
  if (typeof window === 'undefined') return '';

  const sampleRate = 22050;
  const numChannels = 1;
  const numFrames = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numFrames * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & file length
  view.setUint32(4, 36 + numFrames * 2, true);
  // RIFF type & format chunk identifier
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numFrames * 2, true);

  // Generate pleasant marine acoustic tones + subtle radio clicks
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    // Harmonic frequencies simulating radio voice resonance
    const voiceEnvelope = 0.6 + 0.3 * Math.sin(2 * Math.PI * 1.5 * t);
    const carrier = Math.sin(2 * Math.PI * 320 * t) * 0.4 +
                    Math.sin(2 * Math.PI * 480 * t) * 0.3 +
                    Math.sin(2 * Math.PI * 640 * t) * 0.2;
    // subtle pulsing every 3 seconds
    const phrasePulse = (Math.sin(2 * Math.PI * 0.33 * t) > 0.1) ? 1.0 : 0.08;
    const sampleVal = Math.max(-1, Math.min(1, carrier * voiceEnvelope * phrasePulse * 0.4));
    
    // Convert to 16-bit PCM integer
    const intSample = sampleVal < 0 ? sampleVal * 0x8000 : sampleVal * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
