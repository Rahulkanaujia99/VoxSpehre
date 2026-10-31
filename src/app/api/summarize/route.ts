import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { text, engine = 'openai', mode = 'all' } = await req.json();

    const transcriptText = (text || '').trim();
    if (!transcriptText) {
      return NextResponse.json({ error: 'Transcript text is required for summarization.' }, { status: 400 });
    }

    const serverOpenaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const serverGeminiKey = (process.env.GEMINI_API_KEY || '').trim();

    // Prefer OpenAI for summarization, fallback to Gemini if OpenAI key is not configured
    let targetEngine = engine;
    if (targetEngine === 'openai' && !serverOpenaiKey && serverGeminiKey) targetEngine = 'gemini';
    if (targetEngine === 'gemini' && !serverGeminiKey && serverOpenaiKey) targetEngine = 'openai';

    const prompt = `You are VoxSphere's Executive AI Intelligence Engine. Analyze this verbatim transcript:
"""
${transcriptText.slice(0, 10000)}
"""

You must generate comprehensive documentation covering all 6 strategic business summary dimensions:
1. Executive Summary (Concise 2-3 sentence overview covering core findings and direction)
2. Detailed Summary (Comprehensive multi-paragraph analysis detailing arguments, context, and nuance)
3. Meeting Minutes (Formal minutes format with attendees, discussion items, notes, and official conclusions)
4. Key Discussion Points (List of 4-6 crucial discussion topics analyzed in depth)
5. Action Items (List of 3-5 concrete deliverables, owners, and immediate next steps)
6. Important Decisions (List of key resolutions, agreements, and strategic decisions concluded)

Return STRICT valid raw JSON matching this schema:
{
  "summary": "Concise executive overview of core conversation points and direction",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "sentiment": "positive" | "neutral" | "analytical" | "critical",
  "actionItems": ["Action Item 1", "Action Item 2", "Action Item 3"],
  "comprehensiveSummaries": {
    "executive": "Concise 2-3 sentence high-impact executive summary.",
    "detailed": "Detailed multi-paragraph executive summary detailing all discussion nuances, speaker positions, and business implications.",
    "minutes": "MEETING MINUTES\\n\\n1. PURPOSE & AGENDA:\\nOverview of recorded discussion.\\n\\n2. DISCUSSION SUMMARY:\\nKey remarks made during the meeting.\\n\\n3. ADJOURNMENT & OUTLOOK:\\nNext milestones agreed upon.",
    "keyPoints": [
      "Key point 1 with strategic context",
      "Key point 2 with operational analysis",
      "Key point 3 with financial or timeline impact",
      "Key point 4 with organizational takeaways"
    ],
    "actionItems": [
      "Action 1: Review due diligence and operational model",
      "Action 2: Consolidate team findings into committee deck",
      "Action 3: Coordinate stakeholder alignment session"
    ],
    "decisions": [
      "Decision 1: Approved directional roadmap and priority sequence",
      "Decision 2: Agreed risk mitigation parameters for execution",
      "Decision 3: Confirmed governance and reporting frequency"
    ]
  }
}
Return only valid JSON. Do not include markdown code fences (\`\`\`json) or extra text.`;

    // 1. OpenAI Summarization (Primary)
    if (targetEngine === 'openai') {
      if (!serverOpenaiKey) {
        return NextResponse.json(
          { error: 'OpenAI API is not configured on the server. Please define OPENAI_API_KEY in backend environment variables (.env.local).' },
          { status: 503 }
        );
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serverOpenaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an executive audio intelligence assistant specializing in corporate minutes, action items, strategic summaries, and decision records. Always respond with strict raw JSON.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API returned status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('No content returned by OpenAI.');
      const parsed = JSON.parse(raw.trim());
      return NextResponse.json({ success: true, engine: 'openai', ...parsed });
    }

    // 2. Google Gemini Summarization (Fallback)
    if (targetEngine === 'gemini') {
      if (!serverGeminiKey) {
        return NextResponse.json(
          { error: 'Google Gemini API is not configured on the server. Please define GEMINI_API_KEY in backend environment variables (.env.local).' },
          { status: 503 }
        );
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${serverGeminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`);
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('No content returned by Gemini.');
      const parsed = JSON.parse(raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim());
      return NextResponse.json({ success: true, engine: 'gemini', ...parsed });
    }

    return NextResponse.json({ error: 'No valid AI summarization engine configured.' }, { status: 400 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown summarization error';
    console.error('Summarization API error (sanitized):', msg.replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]'));
    return NextResponse.json({ error: 'Failed to generate AI executive summaries.' }, { status: 500 });
  }
}
