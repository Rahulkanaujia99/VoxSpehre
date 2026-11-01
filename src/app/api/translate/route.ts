import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// Language code mappings for Sarvam AI
const SARVAM_LANG_MAP: Record<string, string> = {
  hindi: 'hi-IN',
  bengali: 'bn-IN',
  gujarati: 'gu-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN',
  marathi: 'mr-IN',
  odia: 'od-IN',
  punjabi: 'pa-IN',
  tamil: 'ta-IN',
  telugu: 'te-IN',
};

async function translateChunkWithGemma(
  text: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  const prompt = `You are VoxSphere's expert multilingual speech translation engine.
Translate the following transcript accurately and idiomatically into ${targetLanguage}.
CRITICAL INSTRUCTIONS:
1. Preserve all timestamp intervals (e.g. "[00:15 - 00:22]") and speaker tags (e.g. "Speaker 1:" or translated equivalent).
2. Translate the spoken dialogue naturally, preserving exact meaning, speaker intent, tone, and formatting.
3. Output ONLY the translated transcript without reasoning, meta-commentary, or markdown code fences.

TRANSCRIPT TO TRANSLATE:
${text}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemma translation failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  // Return the non-thought part or the last part
  const finalPart = parts.find((p: { text?: string; thought?: boolean }) => !p.thought) || parts[parts.length - 1];
  const translated = finalPart?.text?.trim();
  if (!translated) throw new Error('Empty response from Gemma');
  return translated;
}

async function translateChunkWithSarvam(
  text: string,
  targetLangCode: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      input: text.slice(0, 2000), // Sarvam accepts up to 2000 chars per chunk
      source_language_code: 'en-IN',
      target_language_code: targetLangCode,
      speaker_gender: 'Male',
      mode: 'formal',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sarvam translation failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.translated_text || '';
}

async function translateChunkWithOpenAI(
  text: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert multilingual speech localization assistant. Translate verbatim transcripts into ${targetLanguage} while preserving speaker labels, timestamps, and conversational intent. Output ONLY the translation.`,
        },
        {
          role: 'user',
          content: `Translate into ${targetLanguage}:\n\n${text}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI translate returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage = 'Spanish', engine = 'auto' } = await req.json();

    const transcriptText = (text || '').trim();
    if (!transcriptText) {
      return NextResponse.json(
        { error: 'Transcript text is required for translation.' },
        { status: 400 }
      );
    }

    const serverOpenaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const serverGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const serverSarvamKey = (process.env.SARVAM_API_KEY || '').trim();

    const normalizedLang = targetLanguage.toLowerCase().trim();
    const sarvamCode = SARVAM_LANG_MAP[normalizedLang];

    // Split transcript into reasonable chunks to handle long transcripts without silent truncation
    // Chunk by lines/segments roughly every 2500 characters
    const lines = transcriptText.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > 2500 && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const translatedChunks: string[] = [];

    // Helper to translate a single chunk using available AI engines with fallback
    const translateSingleChunk = async (chunk: string): Promise<string> => {
      // 1. If Indian language and Sarvam available:
      if (sarvamCode && serverSarvamKey) {
        try {
          const res = await translateChunkWithSarvam(chunk, sarvamCode, serverSarvamKey);
          if (res) return res;
        } catch (e) {
          console.warn('Sarvam translation error, trying Gemma:', e);
        }
      }

      // 2. Try Gemma (Google AI Studio) - primary verified engine
      if (serverGeminiKey) {
        try {
          const res = await translateChunkWithGemma(chunk, targetLanguage, serverGeminiKey);
          if (res) return res;
        } catch (e) {
          console.warn('Gemma translation error:', e);
        }
      }

      // 3. Try OpenAI
      if (serverOpenaiKey) {
        try {
          const res = await translateChunkWithOpenAI(chunk, targetLanguage, serverOpenaiKey);
          if (res) return res;
        } catch (e) {
          console.warn('OpenAI translation error:', e);
        }
      }

      throw new Error(`All translation engines failed for chunk.`);
    };

    // Translate all chunks in sequence to prevent rate limits
    for (const chunk of chunks) {
      const translated = await translateSingleChunk(chunk);
      translatedChunks.push(translated);
    }

    const fullTranslation = translatedChunks.join('\n\n');

    return NextResponse.json({
      success: true,
      targetLanguage,
      translatedText: fullTranslation,
      chunksCount: chunks.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Translation request failed';
    console.error('Translation route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
