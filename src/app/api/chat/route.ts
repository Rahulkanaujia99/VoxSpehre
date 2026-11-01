import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { transcript, question, history = [] } = await req.json();

    const cleanTranscript = (transcript || '').trim();
    const cleanQuestion = (question || '').trim();

    if (!cleanTranscript) {
      return NextResponse.json(
        { error: 'Transcript text is required to chat.' },
        { status: 400 }
      );
    }

    if (!cleanQuestion) {
      return NextResponse.json(
        { error: 'A question is required.' },
        { status: 400 }
      );
    }

    const serverGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const serverOpenaiKey = (process.env.OPENAI_API_KEY || '').trim();

    // Format previous conversation turns if provided
    const conversationContext = history
      .slice(-6)
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      )
      .join('\n');

    const systemInstruction = `You are VoxSphere's AI Transcript Assistant. You answer questions strictly and solely based on the user's provided recording transcript.

RULES:
1. Ground your answers ONLY in the provided transcript.
2. If the user's question asks about something not mentioned in the transcript, respond clearly with:
   "This information is not mentioned in the transcript."
3. Do NOT guess, extrapolate, or invent details, participants, decisions, or dates that are absent from the text.
4. Keep your answers direct, structured, and helpful. Use bullet points or bold text where appropriate.`;

    const promptText = `${systemInstruction}

=== FULL RECORDING TRANSCRIPT ===
"""
${cleanTranscript}
"""

${conversationContext ? `=== RECENT CONVERSATION HISTORY ===\n${conversationContext}\n` : ''}
User Question: ${cleanQuestion}

Assistant Answer:`;

    // 1. Primary Engine: Google Gemma 4 on Google AI Studio
    if (serverGeminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${serverGeminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1200,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const answerText =
            parts.find((p: { text?: string; thought?: boolean }) => !p.thought)?.text ||
            parts[parts.length - 1]?.text;

          if (answerText && answerText.trim()) {
            return NextResponse.json({
              success: true,
              engine: 'gemma-4',
              answer: answerText.trim(),
            });
          }
        } else {
          console.warn('Gemma chat error:', await res.text());
        }
      } catch (err) {
        console.warn('Gemma chat failed, falling back:', err);
      }
    }

    // 2. Secondary Engine: OpenAI gpt-4o-mini
    if (serverOpenaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverOpenaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              {
                role: 'user',
                content: `Transcript:\n"""${cleanTranscript}"""\n\nQuestion: ${cleanQuestion}`,
              },
            ],
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const answer = data.choices?.[0]?.message?.content;
          if (answer) {
            return NextResponse.json({
              success: true,
              engine: 'openai',
              answer: answer.trim(),
            });
          }
        }
      } catch (err) {
        console.warn('OpenAI chat failed:', err);
      }
    }

    // 3. Fallback: Intelligent Rule-based Transcript Search & Answer
    const lowerQ = cleanQuestion.toLowerCase();
    const sentences = cleanTranscript
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 5);

    let fallbackAnswer = '';

    if (lowerQ.includes('what is this') || lowerQ.includes('about') || lowerQ.includes('summary')) {
      fallbackAnswer = `Based on the transcript, this conversation discusses: ${sentences.slice(0, 3).join(' ')}`;
    } else if (lowerQ.includes('objective') || lowerQ.includes('goal') || lowerQ.includes('purpose')) {
      const match = sentences.find((s: string) => /\b(objective|goal|purpose|aim|plan|target)\b/i.test(s));
      fallbackAnswer = match
        ? `The main objective identified in the transcript is: "${match}"`
        : 'The transcript does not explicitly state a primary objective.';
    } else if (lowerQ.includes('decision') || lowerQ.includes('decide')) {
      const match = sentences.find((s: string) => /\b(decided|agreed|approved|resolved)\b/i.test(s));
      fallbackAnswer = match
        ? `The following decision is recorded in the transcript: "${match}"`
        : 'This information is not mentioned in the transcript. No specific decisions were explicitly recorded.';
    } else if (lowerQ.includes('action') || lowerQ.includes('next step') || lowerQ.includes('task')) {
      const match = sentences.find((s: string) => /\b(action|next step|follow up|assigned|deadline)\b/i.test(s));
      fallbackAnswer = match
        ? `The following action item is mentioned in the transcript: "${match}"`
        : 'This information is not mentioned in the transcript. No specific action items were explicitly assigned.';
    } else {
      // Find matching sentences by keyword overlap
      const qWords = lowerQ.split(/\s+/).filter((w: string) => w.length > 3 && !['what', 'when', 'where', 'which', 'about', 'there', 'their', 'could', 'would'].includes(w));
      const relevant = sentences.filter((s: string) => {
        const lowerS = s.toLowerCase();
        return qWords.some((w: string) => lowerS.includes(w));
      });

      if (relevant.length > 0) {
        fallbackAnswer = `Here is what the transcript states regarding your question:\n\n• ${relevant.slice(0, 3).join('\n\n• ')}`;
      } else {
        fallbackAnswer = 'This information is not mentioned in the transcript.';
      }
    }

    return NextResponse.json({
      success: true,
      engine: 'fallback',
      answer: fallbackAnswer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
