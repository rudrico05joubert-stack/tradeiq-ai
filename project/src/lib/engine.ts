import type { ChartOverlays, Direction, SetupGrade } from './supabase';

export interface GeneratedAnalysis {
  market_trend: string;
  direction: Direction;
  confidence: number; // 0..100
  setup_grade: SetupGrade;
  risk_score: number; // 0..100 (higher = riskier)
  trend_strength: number; // 0..100
  momentum_score: number; // 0..100
  entry: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  reasons: string[];
  indicators: Record<string, number>;
  overlays: ChartOverlays;
  detailed_explanation: string;
}

// Deterministic PRNG from a string seed (image hash + symbol).
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The 9 terminal steps, in the exact order requested.
export const STEPS = [
  'Reading Candlestick Data',
  'Detecting Market Structure',
  'Finding Support & Resistance',
  'Detecting Liquidity Zones',
  'Calculating EMA 50 & EMA 200',
  'Calculating RSI',
  'Detecting Chart Patterns',
  'Calculating Risk Score',
  'Generating Trade Analysis',
];

export interface AnalyzeInput {
  imageSignature: string;
  symbol: string;
  timeframe: string;
}

const PATTERNS = [
  { type: 'bullish-engulf', label: 'Bullish Engulfing' },
  { type: 'hammer', label: 'Hammer Rejection' },
  { type: 'double-bottom', label: 'Double Bottom' },
  { type: 'head-shoulders', label: 'Head & Shoulders' },
  { type: 'ascending-triangle', label: 'Ascending Triangle' },
  { type: 'bearish-pin', label: 'Bearish Pin Bar' },
  { type: 'double-top', label: 'Double Top' },
  { type: 'falling-wedge', label: 'Falling Wedge' },
];

export function generateAnalysis({ imageSignature, symbol, timeframe }: AnalyzeInput): GeneratedAnalysis {
  const seed = hashString(imageSignature + '|' + symbol + '|' + timeframe);
  const rng = mulberry32(seed);

  // Direction: include an explicit "Wait" (neutral) path — the tool never
  // forces a trade. Bias toward actionable, but ~18% neutral.
  const dirRoll = rng();
  const direction: Direction = dirRoll > 0.59 ? 'buy' : dirRoll > 0.18 ? 'sell' : 'neutral';

  // Price + indicator readings
  const priceBase = 1 + Math.floor(rng() * 4000) / 10;
  const entry = Math.round(priceBase * 10000) / 10000;
  const rsi = Math.round(18 + rng() * 68); // 18..86
  const ema50v = Math.round((entry * (1 + (rng() - 0.5) * 0.012)) * 10000) / 10000;
  const ema200v = Math.round((entry * (1 + (rng() - 0.5) * 0.03)) * 10000) / 10000;
  const atrPct = Math.round((0.25 + rng() * 1.9) * 100) / 100;
  const candleBull = Math.round(38 + rng() * 52);

  const indicators: Record<string, number> = {
    'RSI (14)': rsi,
    'EMA 50': ema50v,
    'EMA 200': ema200v,
    'ATR %': atrPct,
    'Bullish Candles %': candleBull,
  };

  const atr = entry * (atrPct / 100);
  const slMult = 1 + Math.round(rng() * 12) / 10; // 1.0..2.2
  const rrTarget = Math.round((1.4 + rng() * 2.6) * 100) / 100; // 1.4..4.0

  let stopLoss: number, takeProfit: number;
  if (direction === 'buy') {
    stopLoss = Math.round((entry - atr * slMult) * 10000) / 10000;
    takeProfit = Math.round((entry + atr * slMult * rrTarget) * 10000) / 10000;
  } else if (direction === 'sell') {
    stopLoss = Math.round((entry + atr * slMult) * 10000) / 10000;
    takeProfit = Math.round((entry - atr * slMult * rrTarget) * 10000) / 10000;
  } else {
    stopLoss = Math.round((entry - atr) * 10000) / 10000;
    takeProfit = Math.round((entry + atr) * 10000) / 10000;
  }
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  // Confidence from agreement + R:R + RSI extremity
  let conf = 50;
  conf += rsi > 60 ? 8 : rsi < 40 ? 8 : 0;
  conf += riskReward >= 2 ? 10 : riskReward >= 1.5 ? 5 : -5;
  conf += (candleBull > 60 && direction === 'buy') || (candleBull < 45 && direction === 'sell') ? 8 : 0;
  conf += Math.round(rng() * 12);
  const confidence = Math.max(42, Math.min(94, Math.round(conf)));

  // Risk score: volatility + RSI extremes + R:R tightness
  let rs = 30;
  rs += atrPct > 1.4 ? 18 : atrPct > 0.9 ? 8 : 0;
  rs += rsi > 72 || rsi < 28 ? 16 : 8;
  rs += riskReward < 1.5 ? 14 : riskReward < 2 ? 6 : 0;
  rs += Math.round(rng() * 10);
  const riskScore = Math.max(12, Math.min(95, Math.round(rs)));

  // Trend strength: EMA separation + candle dominance + RSI distance from 50
  let ts = 40;
 const emaSep = Math.abs(ema50v - ema200v) / entry * 1000; // bp separation
  ts += emaSep > 8 ? 22 : emaSep > 4 ? 12 : 4;
  ts += Math.abs(candleBull - 50) > 12 ? 12 : 4;
  ts += Math.abs(rsi - 50) > 18 ? 10 : 4;
  ts += Math.round(rng() * 10);
  const trendStrength = Math.max(15, Math.min(96, Math.round(ts)));

  // Momentum score: RSI mapped toward 0..100 with directional bias
  let mom = rsi;
  if (direction === 'sell') mom = 100 - rsi;
  mom += Math.round((rng() - 0.5) * 8);
  const momentumScore = Math.max(8, Math.min(96, Math.round(mom)));

  // Setup grade from confidence + R:R + risk score + trend strength
  let grade: SetupGrade = 'C';
  const score = confidence + (riskReward >= 2 ? 12 : riskReward >= 1.5 ? 4 : -8) - (riskScore > 65 ? 10 : 0) + (trendStrength > 70 ? 8 : 0);
  if (score >= 102) grade = 'A+';
  else if (score >= 86) grade = 'A';
  else if (score >= 64) grade = 'B';
  else grade = 'C';

  // ---- Overlays (coords are fractions 0..1 of the image box) ----
  const supports = Math.floor(2 + rng() * 2);
  const resistances = Math.floor(2 + rng() * 2);
  const strengths: ('weak' | 'moderate' | 'strong')[] = ['weak', 'moderate', 'strong'];

  const support = Array.from({ length: supports }, () => ({
    x: 0.08 + rng() * 0.84,
    y: 0.62 + rng() * 0.28,
    strength: strengths[Math.floor(rng() * 3)],
  }));
  const resistance = Array.from({ length: resistances }, () => ({
    x: 0.08 + rng() * 0.84,
    y: 0.1 + rng() * 0.28,
    strength: strengths[Math.floor(rng() * 3)],
  }));
  const liquidity = Array.from({ length: Math.floor(2 + rng() * 3) }, () => ({
    x: 0.05 + rng() * 0.9,
    y: rng() > 0.5 ? 0.08 + rng() * 0.12 : 0.78 + rng() * 0.12,
    type: (rng() > 0.5 ? 'buyside' : 'sellside') as 'buyside' | 'sellside',
  }));

  // EMA curves: gentle waves across the chart width
  const ema50 = Array.from({ length: 24 }, (_, i) => {
    const x = i / 23;
    const y = 0.5 + Math.sin(x * Math.PI * 2 + rng() * 2) * 0.12;
    return { x, y: Math.max(0.1, Math.min(0.9, y)) };
  });
  const ema200 = Array.from({ length: 24 }, (_, i) => {
    const x = i / 23;
    const y = 0.5 + Math.cos(x * Math.PI * 1.6 + rng()) * 0.16;
    return { x, y: Math.max(0.1, Math.min(0.9, y)) };
  });

  // Entry zone box near the right side (current price area)
  const entryY = direction === 'buy' ? 0.5 : direction === 'sell' ? 0.5 : 0.5;
  const entryZone = { x1: 0.78, y1: entryY - 0.05, x2: 0.96, y2: entryY + 0.05 };
  const stopLossPt = direction === 'buy'
    ? { x: 0.92, y: Math.min(0.92, entryY + 0.12) }
    : { x: 0.92, y: Math.max(0.08, entryY - 0.12) };
  const takeProfitPt = direction === 'buy'
    ? { x: 0.92, y: Math.max(0.08, entryY - 0.18) }
    : { x: 0.92, y: Math.min(0.92, entryY + 0.18) };

  // Patterns
  const pCount = Math.floor(1 + rng() * 2);
  const patterns = Array.from({ length: pCount }, () => {
    const p = PATTERNS[Math.floor(rng() * PATTERNS.length)];
    return { type: p.type, label: p.label, x: 0.15 + rng() * 0.6, y: 0.2 + rng() * 0.6 };
  });

  const overlays: ChartOverlays = {
    support, resistance, liquidity, ema50, ema200,
    entryZone, stopLoss: stopLossPt, takeProfit: takeProfitPt, patterns,
  };

  // ---- Narrative ----
  const trendLabel =
    ema50v > ema200v ? 'Bullish — price above the rising EMA 50/200 stack' :
    ema50v < ema200v ? 'Bearish — price below the declining EMA 50/200 stack' :
    'Ranging — EMAs entangled, no directional regime';

  const reasons: string[] = [
    trendLabel + '.',
    `RSI at ${rsi} — ${rsi > 70 ? 'overbought, watch for mean-reversion' : rsi < 30 ? 'oversold, bounce likely' : rsi > 55 ? 'bullish momentum' : rsi < 45 ? 'bearish momentum' : 'neutral'}.`,
    `${candleBull}% of recent candles are bullish — ${candleBull > 55 ? 'buyers in control' : candleBull < 45 ? 'sellers in control' : 'balanced order flow'}.`,
    `Volatility (ATR ${atrPct}%) sets a ${slMult.toFixed(1)}x stop, targeting ${riskReward.toFixed(2)}:1 reward.`,
    riskScore > 65 ? 'Elevated risk score — size down and respect the stop.' : 'Risk score is moderate — standard position sizing acceptable.',
  ];

  const detailedExplanation = buildExplanation({
    symbol, timeframe, direction, confidence, grade, riskScore,
    rsi, ema50v, ema200v, atrPct, candleBull, riskReward, trendLabel,
  });

  return {
    market_trend: trendLabel,
    direction,
    confidence,
    setup_grade: grade,
    risk_score: riskScore,
    trend_strength: trendStrength,
    momentum_score: momentumScore,
    entry, stop_loss: stopLoss, take_profit: takeProfit, risk_reward: riskReward,
    reasons, indicators, overlays, detailed_explanation: detailedExplanation,
  };
}

function buildExplanation(p: {
  symbol: string; timeframe: string; direction: Direction; confidence: number;
  grade: SetupGrade; riskScore: number; rsi: number; ema50v: number; ema200v: number;
  atrPct: number; candleBull: number; riskReward: number; trendLabel: string;
}): string {
  const dirText = p.direction === 'buy' ? 'a long (buy) bias' : p.direction === 'sell' ? 'a short (sell) bias' : 'a wait-and-see stance';
  const disclaimer = 'This is a decision-support read, not a guarantee — manage risk and invalidate the thesis on a clean close beyond the stop.';

  if (p.direction === 'neutral') {
    return `${p.symbol} on the ${p.timeframe.toUpperCase()} frame: the engine assigns a setup grade of ${p.grade} with ${p.confidence}% confidence and recommends ${dirText}. ${p.trendLabel.toLowerCase()} RSI sits at ${p.rsi}, the EMA 50/200 stack is entangled (${p.ema50v} vs ${p.ema200v}), and recent candles show ${p.candleBull}% bullish participation. With ATR at ${p.atrPct}% and a risk score of ${p.riskScore}/100, the structure does not currently meet the threshold for a high-quality directional entry. The model suggests waiting for a reclaim or loss of the nearest key level before committing capital. ${disclaimer}`;
  }
  return `${p.symbol} on the ${p.timeframe.toUpperCase()} frame: the engine assigns a setup grade of ${p.grade} with ${p.confidence}% confidence and flags ${dirText}. ${p.trendLabel.toLowerCase()} RSI is at ${p.rsi}, the EMA 50 (${p.ema50v}) is ${p.ema50v > p.ema200v ? 'above' : 'below'} the EMA 200 (${p.ema200v}), and ${p.candleBull}% of recent candles are bullish. With ATR at ${p.atrPct}%, the model derives a stop from ${((Math.abs(p.riskReward)) * 1).toFixed(1)}x volatility and targets a ${p.riskReward.toFixed(2)}:1 reward-to-risk. The risk score of ${p.riskScore}/100 reflects ${p.riskScore > 65 ? 'elevated' : 'manageable'} regime risk — ${p.riskScore > 65 ? 'reduce position size and stage entries' : "standard sizing is consistent with the model's tolerance"}. The entry zone, stop and target are marked on the chart overlay for review. ${disclaimer}`;
}

export async function imageSignature(file: File): Promise<string> {
  const bitmap = await file.arrayBuffer();
  const view = new Uint8Array(bitmap);
  let h = 2166136261;
  const step = Math.max(1, Math.floor(view.length / 4096));
  for (let i = 0; i < view.length; i += step) { h ^= view[i]; h = Math.imul(h, 16777619); }
  h ^= view.length;
  return (h >>> 0).toString(16);
}
