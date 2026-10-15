export interface TranscriptSegment {
  id: string;
  speaker: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  confidence?: number;
}

export interface AudioMetadata {
  fileName: string;
  fileSize: string;
  duration: number; // in seconds
  format: string;
  language: string;
  detectedConfidence: number;
  wordCount: number;
  speakersCount: number;
}

export interface TranscriptionResult {
  metadata: AudioMetadata;
  segments: TranscriptSegment[];
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'analytical' | 'critical';
}

export interface AISettings {
  provider: 'gemini' | 'openai' | 'groq' | 'builtin';
  geminiKey?: string;
  openaiKey?: string;
  groqKey?: string;
  modelName?: string;
  enableDiarization: boolean;
  enableTimestamps: boolean;
  customVocabulary?: string;
}
