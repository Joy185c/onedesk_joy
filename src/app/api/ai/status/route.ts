import { NextResponse } from 'next/server';

export async function GET() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  if (hasGemini) {
    return NextResponse.json({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      isLive: true,
      statusText: 'Live Google Gemini 1.5 Flash Connected',
    });
  }

  if (hasGroq) {
    return NextResponse.json({
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      isLive: true,
      statusText: 'Live Groq LLaMA 3.3 Connected',
    });
  }

  return NextResponse.json({
    provider: 'heuristic',
    model: 'deterministic-planner-v2',
    isLive: false,
    statusText: 'Semantic Heuristic Engine (Add GEMINI_API_KEY to .env.local for live LLM)',
  });
}

