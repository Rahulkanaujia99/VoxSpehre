import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export interface StructuredAISummaryData {
  about: string;
  objective: string | null;
  keyDiscussionAreas: string[];
  insights: string[];
  decisions: string[];
  actionItems: string[];
  conclusion: string;
}

function extractTranscriptGroundedSummary(transcript: string): StructuredAISummaryData {
  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const fullClean = transcript.replace(/\s+/g, ' ').trim();

  // 1. What the transcript is about
  const about =
    sentences.slice(0, 2).join(' ') ||
    fullClean.slice(0, 200) ||
    'Recorded conversation and discussion.';

  // 2. Main Objective
  let objective: string | null = null;
  const objectiveMatch = sentences.find((s) =>
    /\b(objective|goal|purpose|aim|target|plan to|aiming to|intending to)\b/i.test(s)
  );
  if (objectiveMatch) {
    objective = objectiveMatch;
  }

  // 3. Key Discussion Areas
  const keyAreas: string[] = [];
  sentences.forEach((s) => {
    if (
      s.length > 25 &&
      /\b(milestone|investment|capacity|installed|solar|market|growth|energy|strategy|revenue|customer|project|technology|development)\b/i.test(s)
    ) {
      if (keyAreas.length < 5 && !keyAreas.includes(s)) {
        keyAreas.push(s);
      }
    }
  });
  if (keyAreas.length === 0 && sentences.length > 0) {
    keyAreas.push(...sentences.slice(0, Math.min(3, sentences.length)));
  }

  // 4. Important Insights (numerical findings, milestones, achievements)
  const insights: string[] = [];
  sentences.forEach((s) => {
    if (
      /\b(\d+|billion|million|percent|%|milestone|reached|created|unlocked|first|highest|growth)\b/i.test(s)
    ) {
      if (insights.length < 4 && !insights.includes(s)) {
        insights.push(s);
      }
    }
  });
  if (insights.length === 0 && sentences.length > 1) {
    insights.push(sentences[1]);
  }

  // 5. Key Decisions (Only if explicitly discussed - do NOT invent)
  const decisions: string[] = [];
  sentences.forEach((s) => {
    if (/\b(decided to|agreed to|approved|resolved to|concluded that|settled on)\b/i.test(s)) {
      if (decisions.length < 3) {
        decisions.push(s);
      }
    }
  });

  // 6. Action Items (Only if explicitly discussed - do NOT invent)
  const actionItems: string[] = [];
  sentences.forEach((s) => {
    if (/\b(action item|next step|responsible for|follow up|assigned to|deadline|must submit|will deliver)\b/i.test(s)) {
      if (actionItems.length < 3) {
        actionItems.push(s);
      }
    }
  });

  // 7. Overall Conclusion
  const conclusion =
    sentences[sentences.length - 1] ||
    'The conversation reached its conclusion with key discussion milestones documented.';

  return {
    about,
    objective,
    keyDiscussionAreas: keyAreas,
    insights,
    decisions,
    actionItems,
    conclusion,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { text, engine = 'auto', mode = 'all' } = await req.json();

    const transcriptText = (text || '').trim();
    if (!transcriptText) {
      return NextResponse.json(
        { error: 'Transcript text is required for AI summarization.' },
        { status: 400 }
      );
    }

    const serverOpenaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const serverGeminiKey = (process.env.GEMINI_API_KEY || '').trim();

    const prompt = `You are VoxSphere's Strategic Intelligence & Conversation Analytics Engine.
Analyze the following complete transcript and generate a structured JSON summary based strictly and truthfully on the conversation.
Do NOT invent details, decisions, or action items that were not mentioned.

JSON Schema to return:
{
  "about": "Overall subject and context of what the conversation is about",
  "objective": "Primary purpose or objective of the discussion (or null if not stated)",
  "keyDiscussionAreas": ["Major topic or area 1", "Major topic or area 2"],
  "insights": ["Significant finding, observation or takeaway 1", "Significant finding 2"],
  "decisions": ["Actual decision made (leave empty array [] if none discussed)"],
  "actionItems": ["Actual task or next step assigned (leave empty array [] if none mentioned)"],
  "conclusion": "Concise explanation of the conversation outcome",
  "summary": "Executive overview summarizing the dialogue in 2-3 structured paragraphs",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "sentiment": "positive | neutral | analytical | critical"
}

TRANSCRIPT:
"""
${transcriptText}
"""

Return ONLY the valid JSON object.`;

    // 1. Primary Engine: Google Gemma 4 on Google AI Studio
    if (serverGeminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${serverGeminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const content = parts.find((p: { text?: string; thought?: boolean }) => !p.thought)?.text || parts[parts.length - 1]?.text;
          if (content) {
            const parsed = JSON.parse(content.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim());

            const structuredAI: StructuredAISummaryData = {
              about: parsed.about || parsed.summary || 'Recorded discussion.',
              objective: parsed.objective || null,
              keyDiscussionAreas: Array.isArray(parsed.keyDiscussionAreas) ? parsed.keyDiscussionAreas : [],
              insights: Array.isArray(parsed.insights) ? parsed.insights : [],
              decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
              actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
              conclusion: parsed.conclusion || 'Analysis completed.',
            };

            const formattedAISummary = [
              `• What the transcript is about: ${structuredAI.about}`,
              structuredAI.objective ? `• Main Objective: ${structuredAI.objective}` : null,
              structuredAI.keyDiscussionAreas.length > 0 ? `• Key Discussion Areas:\n  - ${structuredAI.keyDiscussionAreas.join('\n  - ')}` : null,
              structuredAI.insights.length > 0 ? `• Important Insights:\n  - ${structuredAI.insights.join('\n  - ')}` : null,
              structuredAI.decisions.length > 0 ? `• Key Decisions:\n  - ${structuredAI.decisions.join('\n  - ')}` : '• Key Decisions: None discussed',
              structuredAI.actionItems.length > 0 ? `• Action Items:\n  - ${structuredAI.actionItems.join('\n  - ')}` : '• Action Items: None mentioned',
              `• Overall Conclusion: ${structuredAI.conclusion}`,
            ].filter(Boolean).join('\n\n');

            return NextResponse.json({
              success: true,
              engine: 'gemma',
              summary: parsed.summary || structuredAI.about,
              keyTopics: parsed.keyTopics || structuredAI.keyDiscussionAreas,
              sentiment: parsed.sentiment || 'analytical',
              comprehensiveSummaries: {
                summary: parsed.summary || structuredAI.about,
                paragraph: transcriptText, // The paragraph view holds the complete transcript
                aiSummary: formattedAISummary,
                structuredAISummary: structuredAI,
                decisions: structuredAI.decisions,
                actionItems: structuredAI.actionItems,
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemma summarization error, trying OpenAI/fallback:', geminiErr);
      }
    }

    // 2. OpenAI Fallback
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
              {
                role: 'system',
                content: 'You are an executive conversation analyst. Return ONLY valid JSON adhering strictly to the requested schema. Do not invent unmentioned facts.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            const parsed = JSON.parse(content);
            const structuredAI: StructuredAISummaryData = {
              about: parsed.about || parsed.summary || 'Recorded conversation.',
              objective: parsed.objective || null,
              keyDiscussionAreas: Array.isArray(parsed.keyDiscussionAreas) ? parsed.keyDiscussionAreas : [],
              insights: Array.isArray(parsed.insights) ? parsed.insights : [],
              decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
              actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
              conclusion: parsed.conclusion || 'Analysis completed.',
            };

            const formattedAISummary = [
              `• What the transcript is about: ${structuredAI.about}`,
              structuredAI.objective ? `• Main Objective: ${structuredAI.objective}` : null,
              structuredAI.keyDiscussionAreas.length > 0 ? `• Key Discussion Areas:\n  - ${structuredAI.keyDiscussionAreas.join('\n  - ')}` : null,
              structuredAI.insights.length > 0 ? `• Important Insights:\n  - ${structuredAI.insights.join('\n  - ')}` : null,
              structuredAI.decisions.length > 0 ? `• Key Decisions:\n  - ${structuredAI.decisions.join('\n  - ')}` : '• Key Decisions: None discussed',
              structuredAI.actionItems.length > 0 ? `• Action Items:\n  - ${structuredAI.actionItems.join('\n  - ')}` : '• Action Items: None mentioned',
              `• Overall Conclusion: ${structuredAI.conclusion}`,
            ].filter(Boolean).join('\n\n');

            return NextResponse.json({
              success: true,
              engine: 'openai',
              summary: parsed.summary || structuredAI.about,
              keyTopics: parsed.keyTopics || structuredAI.keyDiscussionAreas,
              sentiment: parsed.sentiment || 'analytical',
              comprehensiveSummaries: {
                summary: parsed.summary || structuredAI.about,
                paragraph: transcriptText,
                aiSummary: formattedAISummary,
                structuredAISummary: structuredAI,
                decisions: structuredAI.decisions,
                actionItems: structuredAI.actionItems,
              },
            });
          }
        }
      } catch (openaiErr) {
        console.warn('OpenAI summarization failed:', openaiErr);
      }
    }

    // 3. High-Fidelity Transcript-Grounded Fallback (No hallucinated facts)
    const structuredAI = extractTranscriptGroundedSummary(transcriptText);

    const formattedAISummary = [
      `• What the transcript is about: ${structuredAI.about}`,
      structuredAI.objective ? `• Main Objective: ${structuredAI.objective}` : null,
      structuredAI.keyDiscussionAreas.length > 0 ? `• Key Discussion Areas:\n  - ${structuredAI.keyDiscussionAreas.join('\n  - ')}` : null,
      structuredAI.insights.length > 0 ? `• Important Insights:\n  - ${structuredAI.insights.join('\n  - ')}` : null,
      structuredAI.decisions.length > 0 ? `• Key Decisions:\n  - ${structuredAI.decisions.join('\n  - ')}` : '• Key Decisions: None discussed',
      structuredAI.actionItems.length > 0 ? `• Action Items:\n  - ${structuredAI.actionItems.join('\n  - ')}` : '• Action Items: None mentioned',
      `• Overall Conclusion: ${structuredAI.conclusion}`,
    ].filter(Boolean).join('\n\n');

    return NextResponse.json({
      success: true,
      engine: 'synthesized',
      summary: structuredAI.about,
      keyTopics: structuredAI.keyDiscussionAreas.slice(0, 4),
      sentiment: 'analytical',
      comprehensiveSummaries: {
        summary: structuredAI.about,
        paragraph: transcriptText,
        aiSummary: formattedAISummary,
        structuredAISummary: structuredAI,
        decisions: structuredAI.decisions,
        actionItems: structuredAI.actionItems,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown summarization error';
    console.error('Summarization API error:', msg);
    return NextResponse.json({ error: 'Failed to generate AI executive summaries.' }, { status: 500 });
  }
}
