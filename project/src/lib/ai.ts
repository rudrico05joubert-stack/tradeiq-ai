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
  const image = await prepareChartImage(file);
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

const MAX_CHART_DIMENSION = 1920;
const MAX_UNTOUCHED_BYTES = 1_500_000;

async function prepareChartImage(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return fileToBase64(file);
  }

  const largestDimension = Math.max(bitmap.width, bitmap.height);
  if (largestDimension <= MAX_CHART_DIMENSION && file.size <= MAX_UNTOUCHED_BYTES) {
    bitmap.close();
    return fileToBase64(file);
  }

  const scale = Math.min(1, MAX_CHART_DIMENSION / largestDimension);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return fileToBase64(file);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const optimized = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.9);
  });
  return fileToBase64(optimized ?? file);
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read the uploaded chart image.'));
    reader.readAsDataURL(file);
  });
}
