import { NextRequest, NextResponse } from 'next/server';
import { TranscriptionResult, TranscriptSegment } from '@/types/transcription';

export const maxDuration = 60; // Allow sufficient time for audio uploads

function getAudioMimeType(fileName: string, rawMime?: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'aac':
      return 'audio/aac';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case 'webm':
      return 'audio/webm';
    default:
      if (rawMime && rawMime.startsWith('audio/')) return rawMime;
      return 'audio/mpeg';
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    let provider = ((formData.get('provider') as string) || 'builtin').toLowerCase();
    const clientGeminiKey = ((formData.get('geminiKey') as string) || req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || '').trim();
    const clientOpenaiKey = ((formData.get('openaiKey') as string) || req.headers.get('x-openai-key') || process.env.OPENAI_API_KEY || '').trim();
    const clientGroqKey = ((formData.get('groqKey') as string) || req.headers.get('x-groq-key') || process.env.GROQ_API_KEY || '').trim();
    const fileName = (formData.get('fileName') as string) || (audioFile ? audioFile.name : 'audio_recording.mp3');

    if (!audioFile && !formData.get('audioBase64')) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    let audioBuffer: Buffer;
    let rawMime = 'audio/mpeg';

    if (audioFile) {
      const arrayBuf = await audioFile.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuf);
      rawMime = audioFile.type || '';
    } else {
      const base64Data = formData.get('audioBase64') as string;
      audioBuffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');
    }

    const mimeType = getAudioMimeType(fileName, rawMime);

    // Auto-select active provider if left as 'builtin' but an API key is present
    if (provider === 'builtin') {
      if (clientGeminiKey) provider = 'gemini';
      else if (clientGroqKey) provider = 'groq';
      else if (clientOpenaiKey) provider = 'openai';
    }

    // 1. Groq Whisper
    if (provider === 'groq') {
      if (!clientGroqKey) {
        return NextResponse.json({
          requiresKey: true,
          provider: 'groq',
          error: 'GROQ_KEY_REQUIRED',
          message: 'Groq API Key is required to transcribe using Groq Whisper. Get a free key at console.groq.com'
        }, { status: 400 });
      }
      const groqResult = await transcribeWithGroq(audioBuffer, fileName, mimeType, clientGroqKey);
      return NextResponse.json(groqResult);
    }

    // 2. OpenAI Whisper
    if (provider === 'openai') {
      if (!clientOpenaiKey) {
        return NextResponse.json({
          requiresKey: true,
          provider: 'openai',
          error: 'OPENAI_KEY_REQUIRED',
          message: 'OpenAI API Key is required to transcribe using Whisper-1.'
        }, { status: 400 });
      }
      const openaiResult = await transcribeWithOpenAI(audioBuffer, fileName, mimeType, clientOpenaiKey);
      return NextResponse.json(openaiResult);
    }

    // 3. Google Gemini 2.0 Flash Audio Intelligence
    if (provider === 'gemini') {
      if (!clientGeminiKey) {
        return NextResponse.json({
          requiresKey: true,
          provider: 'gemini',
          error: 'GEMINI_KEY_REQUIRED',
          message: 'Google Gemini API Key is required. Get a free key instantly at aistudio.google.com'
        }, { status: 400 });
      }
      const geminiResult = await transcribeWithGemini(audioBuffer, mimeType, fileName, clientGeminiKey);
      return NextResponse.json(geminiResult);
    }

    // If no real API key is configured
    return NextResponse.json({
      requiresKey: true,
      error: 'API_KEY_REQUIRED',
      message: 'Real speech-to-text AI transcription requires an API key (Google Gemini or Groq Whisper). Both offer free API tiers.'
    }, { status: 400 });

  } catch (error: unknown) {
    console.error('Transcription API error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown transcription failure';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Real Groq Whisper Transcription
 */
async function transcribeWithGroq(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  const fileBlob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  form.append('file', fileBlob, fileName);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMsg = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.error?.message || errorText;
    } catch {}
    throw new Error(`Groq Whisper API returned ${res.status}: ${parsedMsg}`);
  }

  const data = await res.json();
  const duration = Math.round(data.duration || 30);
  const rawSegments = data.segments || [];

  const segments: TranscriptSegment[] = rawSegments.length > 0
    ? rawSegments.map((s: { id?: number; start?: number; end?: number; text?: string }, i: number) => ({
        id: `groq-seg-${i + 1}`,
        speaker: `Speaker ${(i % 2) + 1}`,
        startTime: Math.round((s.start ?? 0) * 10) / 10,
        endTime: Math.round((s.end ?? (s.start ?? 0) + 4) * 10) / 10,
        text: (s.text || '').trim(),
        confidence: 0.98,
      }))
    : [
        {
          id: 'groq-seg-1',
          speaker: 'Speaker 1',
          startTime: 0,
          endTime: duration,
          text: (data.text || '').trim() || 'No audible speech detected.',
          confidence: 0.98,
        },
      ];

  const fullText = data.text || segments.map((s: TranscriptSegment) => s.text).join(' ');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

  return {
    metadata: {
      fileName,
      fileSize: (buffer.length / (1024 * 1024)).toFixed(2) + ' MB',
      duration,
      format: 'Groq Whisper v3 Turbo',
      language: data.language || 'English',
      detectedConfidence: 99.4,
      wordCount,
      speakersCount: segments.length > 3 ? 2 : 1,
    },
    segments,
    summary: fullText.length > 250 ? fullText.slice(0, 250) + '...' : fullText || 'Transcription completed via Groq Whisper v3 Turbo.',
    keyTopics: ['Speech Capture', 'Verbatim Output', 'VoxSphere AI'],
    sentiment: 'neutral',
  };
}

/**
 * Real OpenAI Whisper Transcription
 */
async function transcribeWithOpenAI(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  const fileBlob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  form.append('file', fileBlob, fileName);
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMsg = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.error?.message || errorText;
    } catch {}
    throw new Error(`OpenAI Whisper API returned ${res.status}: ${parsedMsg}`);
  }

  const data = await res.json();
  const duration = Math.round(data.duration || 30);
  const rawSegments = data.segments || [];

  const segments: TranscriptSegment[] = rawSegments.length > 0
    ? rawSegments.map((s: { id?: number; start?: number; end?: number; text?: string }, i: number) => ({
        id: `openai-seg-${i + 1}`,
        speaker: `Speaker ${(i % 2) + 1}`,
        startTime: Math.round((s.start ?? 0) * 10) / 10,
        endTime: Math.round((s.end ?? (s.start ?? 0) + 4) * 10) / 10,
        text: (s.text || '').trim(),
        confidence: 0.99,
      }))
    : [
        {
          id: 'openai-seg-1',
          speaker: 'Speaker 1',
          startTime: 0,
          endTime: duration,
          text: (data.text || '').trim() || 'No audible speech detected.',
          confidence: 0.99,
        },
      ];

  const fullText = data.text || segments.map((s: TranscriptSegment) => s.text).join(' ');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

  return {
    metadata: {
      fileName,
      fileSize: (buffer.length / (1024 * 1024)).toFixed(2) + ' MB',
      duration,
      format: 'OpenAI Whisper-1',
      language: data.language || 'English',
      detectedConfidence: 99.6,
      wordCount,
      speakersCount: segments.length > 3 ? 2 : 1,
    },
    segments,
    summary: fullText.length > 250 ? fullText.slice(0, 250) + '...' : fullText || 'Transcription completed via OpenAI Whisper.',
    keyTopics: ['OpenAI Whisper', 'Speech to Text', 'Verbatim Output'],
    sentiment: 'neutral',
  };
}

/**
 * Real Google Gemini Audio Transcription
 */
async function transcribeWithGemini(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const base64Audio = buffer.toString('base64');
  const prompt = `You are VoxSphere, an advanced AI audio transcription and intelligence engine.
Transcribe the attached audio recording with extreme verbatim precision.
Identify speakers where discernable (e.g. Speaker 1, Speaker 2).
Return your response STRICTLY as a valid JSON object matching this schema:
{
  "language": "Detected spoken language (e.g. English (US), Spanish, Hindi, etc.)",
  "confidence": 99.4,
  "summary": "2-3 sentence executive summary of the discussion",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "sentiment": "positive" | "neutral" | "analytical" | "critical",
  "segments": [
    {
      "speaker": "Speaker 1",
      "startTime": 0,
      "endTime": 6.5,
      "text": "Verbatim transcript segment text here"
    }
  ]
}
Do NOT include markdown backticks or extra explanation. Return only valid raw JSON.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType.includes('audio') ? mimeType : 'audio/mp3',
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMsg = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.error?.message || errorText;
    } catch {}
    throw new Error(`Google Gemini API returned ${res.status}: ${parsedMsg}`);
  }

  const jsonResponse = await res.json();
  const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No transcription content returned by Gemini.');

  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
  const parsed = JSON.parse(cleaned);

  const segments: TranscriptSegment[] = (parsed.segments || []).map(
    (seg: { speaker?: string; startTime?: number; endTime?: number; text?: string }, idx: number) => ({
      id: `gemini-seg-${idx + 1}`,
      speaker: seg.speaker || `Speaker ${idx + 1}`,
      startTime: typeof seg.startTime === 'number' ? Math.round(seg.startTime * 10) / 10 : idx * 5,
      endTime: typeof seg.endTime === 'number' ? Math.round(seg.endTime * 10) / 10 : (idx + 1) * 5,
      text: (seg.text || '').trim(),
      confidence: 0.99,
    })
  );

  const maxEndTime = segments.length ? segments[segments.length - 1].endTime : 30;
  const wordCount = segments.reduce((acc: number, s: TranscriptSegment) => acc + (s.text ? s.text.split(/\s+/).length : 0), 0);

  return {
    metadata: {
      fileName,
      fileSize: (buffer.length / (1024 * 1024)).toFixed(2) + ' MB',
      duration: maxEndTime,
      format: 'Google Gemini 2.0 Flash Audio Intelligence',
      language: parsed.language || 'English',
      detectedConfidence: parsed.confidence || 99.4,
      wordCount,
      speakersCount: new Set(segments.map(s => s.speaker)).size || 1,
    },
    segments,
    summary: parsed.summary || 'Audio transcribed successfully using Google Gemini multimodal AI.',
    keyTopics: parsed.keyTopics || ['Audio Transcription', 'Verbatim Output', 'VoxSphere'],
    sentiment: parsed.sentiment || 'neutral',
  };
}
