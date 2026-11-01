import { TranscriptionResult } from '@/types/transcription';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptionRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_size: string | null;
  duration: number;
  audio_url: string | null;
  storage_path: string | null;
  format: string;
  language: string;
  detected_confidence: number;
  word_count: number;
  speakers_count: number;
  sentiment: 'positive' | 'neutral' | 'analytical' | 'critical';
  summary: string;
  key_topics: string[];
  segments: any[];
  original_segments?: any[];
  comprehensive_summaries?: any;
  created_at: string;
  updated_at: string;
}

export function recordToTranscriptionResult(record: TranscriptionRecord): TranscriptionResult {
  return {
    metadata: {
      fileName: record.file_name,
      fileSize: record.file_size || 'Unknown',
      duration: record.duration,
      format: record.format || 'mp3',
      language: record.language || 'en',
      detectedConfidence: record.detected_confidence ?? 0.95,
      wordCount: record.word_count ?? 0,
      speakersCount: record.speakers_count ?? 1,
    },
    segments: record.segments || [],
    originalSegments: record.original_segments || record.segments || [],
    summary: record.summary || '',
    keyTopics: record.key_topics || [],
    sentiment: record.sentiment || 'neutral',
    comprehensiveSummaries: record.comprehensive_summaries || undefined,
  };
}
