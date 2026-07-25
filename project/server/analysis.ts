import OpenAI from 'openai';
import type { GeneratedAnalysis } from '../src/lib/engine';

export type ChartAnalysisRequest = { image: string; symbol?: string; timeframe?: string };

const point = {
  type: 'object', additionalProperties: false, required: ['x', 'y'],
  properties: { x: { type: 'number', minimum: 0, maximum: 1 }, y: { type: 'number', minimum: 0, maximum: 1 } },
} as const;

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['market_trend', 'direction', 'confidence', 'setup_grade', 'risk_score', 'trend_strength', 'momentum_score', 'entry', 'stop_loss', 'take_profit', 'risk_reward', 'reasons', 'indicators', 'overlays', 'detailed_explanation'],
  properties: {
    market_trend: { type: 'string' },
    direction: { type: 'string', enum: ['buy', 'sell', 'neutral'] },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    setup_grade: { type: 'string', enum: ['A+', 'A', 'B', 'C'] },
    risk_score: { type: 'number', minimum: 0, maximum: 100 },
    trend_strength: { type: 'number', minimum: 0, maximum: 100 },
    momentum_score: { type: 'number', minimum: 0, maximum: 100 },
    entry: { type: 'number' }, stop_loss: { type: 'number' }, take_profit: { type: 'number' },
    risk_reward: { type: 'number', minimum: 0 },
    reasons: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string' } },
    indicators: {
      type: 'object',
      additionalProperties: false,
      required: ['RSI (14)', 'EMA 50', 'EMA 200', 'ATR %', 'Bullish Candles %'],
      properties: {
        'RSI (14)': { type: 'number' },
        'EMA 50': { type: 'number' },
        'EMA 200': { type: 'number' },
        'ATR %': { type: 'number' },
        'Bullish Candles %': { type: 'number' },
      },
    },
    overlays: {
      type: 'object', additionalProperties: false,
      required: ['support', 'resistance', 'liquidity', 'ema50', 'ema200', 'entryZone', 'stopLoss', 'takeProfit', 'patterns'],
      properties: {
        support: { type: 'array', items: { ...point, required: ['x', 'y', 'strength'], properties: { ...point.properties, strength: { type: 'string', enum: ['weak', 'moderate', 'strong'] } } } },
        resistance: { type: 'array', items: { ...point, required: ['x', 'y', 'strength'], properties: { ...point.properties, strength: { type: 'string', enum: ['weak', 'moderate', 'strong'] } } } },
        liquidity: { type: 'array', items: { ...point, required: ['x', 'y', 'type'], properties: { ...point.properties, type: { type: 'string', enum: ['buyside', 'sellside'] } } } },
        ema50: { type: 'array', items: point }, ema200: { type: 'array', items: point },
        entryZone: { anyOf: [{ type: 'object', additionalProperties: false, required: ['x1', 'y1', 'x2', 'y2'], properties: { x1: { type: 'number', minimum: 0, maximum: 1 }, y1: { type: 'number', minimum: 0, maximum: 1 }, x2: { type: 'number', minimum: 0, maximum: 1 }, y2: { type: 'number', minimum: 0, maximum: 1 } } }, { type: 'null' }] },
        stopLoss: { anyOf: [point, { type: 'null' }] }, takeProfit: { anyOf: [point, { type: 'null' }] },
        patterns: { type: 'array', items: { ...point, required: ['type', 'label', 'x', 'y'], properties: { ...point.properties, type: { type: 'string' }, label: { type: 'string' } } } },
      },
    },
    detailed_explanation: { type: 'string' },
  },
} as const;

export async function analyzeChart(openai: OpenAI, { image, symbol = 'AUTO', timeframe = 'auto' }: ChartAnalysisRequest): Promise<GeneratedAnalysis> {
  if (!image || !/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) throw new Error('Please upload a PNG, JPEG, or WebP chart image.');
  const payload = image.slice(image.indexOf(',') + 1);
  if (Math.ceil(payload.length * 0.75) > 8 * 1024 * 1024) throw new Error('Chart image must be smaller than 8 MB.');

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.1',
    input: [{ role: 'user', content: [
      { type: 'input_text', text: `Analyze this ${symbol.slice(0, 12)} trading chart on the ${timeframe.slice(0, 8)} timeframe. Base every claim on visible evidence. If the chart is unclear or lacks a valid setup, return direction "neutral" and conservative scores. Price levels must use the visible price scale. Overlay coordinates are normalized from 0 to 1. This is decision support, not financial advice.` },
      { type: 'input_image', image_url: image, detail: 'high' },
    ] }],
    text: { format: { type: 'json_schema', name: 'chart_analysis', strict: true, schema: analysisSchema } },
  });
  if (!response.output_text) throw new Error('The AI returned no analysis. Please try another chart.');
  return JSON.parse(response.output_text) as GeneratedAnalysis;
}
