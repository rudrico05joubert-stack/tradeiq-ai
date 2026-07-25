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

  const { data: allowed, error: quotaError } = await supabase.rpc('consume_analysis_quota');
  if (quotaError) return res.status(503).json({ error: 'Usage checks are temporarily unavailable.' });
  if (!allowed) return res.status(429).json({ error: 'Daily analysis limit reached. Try again tomorrow.' });

  try {
    const analysis = await analyzeChart(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), req.body as never);
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Chart analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error ? error.message : 'Unable to analyze this chart.';
    return res.status(500).json({ error: message });
  }
}
