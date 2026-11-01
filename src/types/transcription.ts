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

export type TranscriptionStyle =
  | 'standard'
  | 'verbatim'
  | 'clean_readable'
  | 'unclear_audio'
  | 'interview_qa'
  | 'customer_support'
  | 'technical'
  | 'legal'
  | 'medical'
  | 'financial'
  | 'bilingual';

export interface StructuredAISummary {
  about?: string;
  objective?: string | null;
  keyDiscussionAreas?: string[];
  insights?: string[];
  decisions?: string[];
  actionItems?: string[];
  conclusion?: string;
}

export interface ComprehensiveSummaries {
  summary?: string;
  paragraph?: string;
  aiSummary?: string;
  structuredAISummary?: StructuredAISummary;
  translatedText?: string;
  executive?: string;
  detailed?: string;
  minutes?: string;
  keyPoints?: string[];
  importantInsights?: string[];
  actionItems?: string[];
  decisions?: string[];
}

export type SummarizationMode =
  | 'summary'
  | 'paragraph'
  | 'ai_summary'
  | 'translate'
  | 'edit'
  | 'executive'
  | 'detailed'
  | 'minutes'
  | 'key_points'
  | 'important_insights'
  | 'action_items'
  | 'decisions';

export interface TranscriptionResult {
  metadata: AudioMetadata;
  segments: TranscriptSegment[];
  originalSegments?: TranscriptSegment[];
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'analytical' | 'critical';
  comprehensiveSummaries?: ComprehensiveSummaries;
}

export interface AISettings {
  provider: 'sarvam' | 'gemini' | 'openai' | 'groq';
  modelName?: string;
  enableDiarization: boolean;
  enableTimestamps: boolean;
  customVocabulary?: string;
}

export interface QueueItem {
  id: string;
  file?: File;
  fileName: string;
  fileSize: string;
  durationEstimate: number; // in seconds
  status: 'queued' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: TranscriptionResult;
  addedAt: number;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  date: string;
  duration: number;
  wordCount: number;
  speakersCount: number;
  result: TranscriptionResult;
}

export interface UserCreditState {
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface ResearchEnrichment {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

export interface SummarizationResult {
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'analytical' | 'critical';
  actionItems?: string[];
  comprehensiveSummaries?: ComprehensiveSummaries;
}
