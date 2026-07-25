import type { GeneratedAnalysis } from './engine';
import { supabase } from './supabase';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  ?? (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');

export async function analyzeWithAI({ file, symbol, timeframe }: {
  file: File;
  symbol: string;
  timeframe: string;
}): Promise<GeneratedAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
  const image = await fileToBase64(file);
  const response = await fetch(`${apiBaseUrl}/api/analyze-chart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ image, symbol, timeframe }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? 'AI request failed.');
  return data as GeneratedAnalysis;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read the uploaded chart image.'));
    reader.readAsDataURL(file);
  });
}
