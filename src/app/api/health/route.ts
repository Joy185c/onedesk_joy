import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let latencyMs = 0;
  let dbError: string | null = null;

  try {
    const supabase = createClient();
    const { error } = await supabase.from('workspaces').select('id').limit(1);
    latencyMs = Date.now() - startTime;
    if (error) {
      dbStatus = 'degraded';
      dbError = error.message;
    }
  } catch (err: any) {
    dbStatus = 'unavailable';
    dbError = err.message || 'Unknown database error';
    latencyMs = Date.now() - startTime;
  }

  const isHealthy = dbStatus === 'healthy' || dbStatus === 'degraded';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      version: '2.0.0',
      edition: 'OneDesk Master Blueprint v2.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: dbStatus,
          latencyMs,
          error: dbError,
        },
        ai: {
          status: 'ready',
          provider: process.env.GROQ_API_KEY ? 'Groq LLaMA 3.3' : process.env.GEMINI_API_KEY ? 'Google Gemini 1.5' : 'Deterministic Heuristic Fallback',
        },
        storage: {
          status: 'ready',
          buckets: ['avatars', 'attachments'],
        },
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
