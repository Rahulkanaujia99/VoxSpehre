import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { query, topic } = await req.json();

    const searchQuery = (query || topic || '').trim();
    if (!searchQuery) {
      return NextResponse.json(
        { error: 'A search query or topic is required for research retrieval.' },
        { status: 400 }
      );
    }

    // Read Tavily key strictly from server-side environment variables
    const tavilyApiKey = (process.env.TAVILY_API_KEY || '').trim();

    if (!tavilyApiKey) {
      return NextResponse.json(
        {
          error:
            'Tavily API is not configured on the server. Please add TAVILY_API_KEY to backend environment variables (.env.local) to enable live research & topic enrichment.',
          configured: false,
        },
        { status: 503 }
      );
    }

    // Secure server-to-server call to Tavily API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: searchQuery,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error || errJson.message || errText;
      } catch {}
      // Sanitize any key strings from error message
      const sanitized = parsedErr.replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
      return NextResponse.json(
        { error: `Tavily Search API error: ${sanitized}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return sanitized structured research results to frontend (keys never included)
    return NextResponse.json({
      success: true,
      query: searchQuery,
      answer: data.answer || null,
      results: (data.results || []).map((r: { title?: string; url?: string; content?: string; score?: number }) => ({
        title: r.title || 'Source Citation',
        url: r.url || '#',
        content: r.content || '',
        score: typeof r.score === 'number' ? Math.round(r.score * 100) / 100 : undefined,
      })),
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown research error';
    console.error('Research API error (sanitized):', msg.replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]'));
    return NextResponse.json(
      { error: 'An error occurred while fetching live research intelligence.' },
      { status: 500 }
    );
  }
}
