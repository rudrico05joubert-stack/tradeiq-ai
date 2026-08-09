import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { analyzeChart } from '../server/analysis.js';

type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (code: number) => { json: (body: unknown) => void } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI analysis is temporarily unavailable.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: 'Authentication is temporarily unavailable.' });
  if (!token) return res.status(401).json({ error: 'Please sign in to analyze a chart.' });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });

  let reservationId: string | null = null;
  try {
    // Reserve before calling OpenAI. This prevents over-limit and burst requests
    // from consuming the application's AI budget.
    const { data: reservation, error: quotaError } = await supabase.rpc('begin_analysis_request');
    if (quotaError) return res.status(503).json({ error: 'Usage checks are temporarily unavailable.' });
    reservationId = typeof reservation === 'string' ? reservation : null;
    if (!reservationId) return res.status(429).json({ error: 'Analysis limit reached. Please wait and try again.' });

    const analysis = await analyzeChart(new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 }), req.body as never);
    const { error: finishError } = await supabase.rpc('finish_analysis_request', {
      reservation_id: reservationId,
      p_succeeded: true,
    });
    if (finishError) console.error('Unable to finalize analysis reservation:', finishError.message);
    return res.status(200).json(analysis);
  } catch (error) {
    if (reservationId) {
      const { error: releaseError } = await supabase.rpc('finish_analysis_request', {
        reservation_id: reservationId,
        p_succeeded: false,
      });
      if (releaseError) console.error('Unable to release analysis reservation:', releaseError.message);
    }
    console.error('Chart analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Unable to analyze this chart. Please try again.' });
  }
}
