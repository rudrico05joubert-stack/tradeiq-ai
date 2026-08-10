import type { GeneratedAnalysis } from '../src/lib/engine.js';

export interface SafetyGateContext { symbol: string; timeframe: string; }

const IMPULSE_LANGUAGE = /\b(impulsive?|displacement|crash candle|spike|sharp (?:drop|break|move)|large (?:bearish|bullish) candle|oversized candle|break of structure)\b/i;
const CONFIRMATION_LANGUAGE = /\b(retest|retracement|pullback)\b[\s\S]{0,80}\b(reject(?:ion|ed)?|confirm(?:ation|ed)?|hold|failed)\b/i;
const LOW_TIMEFRAME = /^(?:M1|M2|M3|M4|M5)$/i;
const SYNTHETIC_SYMBOL = /\b(?:crash|boom|volatility|step|jump)\b/i;
const CRASH_SYMBOL = /\bcrash\b/i;
const BOOM_SYMBOL = /\bboom\b/i;

function noTrade(analysis: GeneratedAnalysis, reasons: string[]): GeneratedAnalysis {
  const gateReason = `NO TRADE safety gate: ${reasons.join(' ')}`;
  return {
    ...analysis,
    direction: 'neutral',
    confidence: Math.min(59, analysis.confidence),
    setup_grade: 'C',
    reasons: [gateReason, ...analysis.reasons].slice(0, 6),
    overlays: { ...analysis.overlays, entryZone: null, stopLoss: null, takeProfit: null },
    detailed_explanation: `${gateReason} Wait for stronger agreement and a confirmed entry structure. ${analysis.detailed_explanation}`,
  };
}

export function enforceAnalysisSafety(analysis: GeneratedAnalysis, { symbol, timeframe }: SafetyGateContext): GeneratedAnalysis {
  if (analysis.direction === 'neutral') return noTrade(analysis, ['The model did not identify a sufficiently safe directional entry.']);

  const failures: string[] = [];
  const synthetic = SYNTHETIC_SYMBOL.test(symbol);
  // AUTO is not a safety escape hatch. Synthetic products are commonly shown on
  // M1 charts and carry abrupt tail-event risk even when the UI omits timeframe.
  const strictShortHorizon = LOW_TIMEFRAME.test(timeframe) || synthetic;
  const combinedText = `${analysis.market_trend} ${analysis.reasons.join(' ')} ${analysis.detailed_explanation}`;

  const confidenceFloor = synthetic ? 80 : strictShortHorizon ? 75 : 70;
  if (analysis.confidence < confidenceFloor) failures.push(`Confidence ${analysis.confidence}% is below the ${confidenceFloor}% directional threshold.`);
  if (analysis.trend_strength < (strictShortHorizon ? 55 : 45)) failures.push(`Trend strength ${analysis.trend_strength}/100 is too weak.`);
  if (analysis.momentum_score < (strictShortHorizon ? 55 : 45)) failures.push(`Momentum ${analysis.momentum_score}/100 is too weak.`);
  if (analysis.risk_score > 65) failures.push(`Risk score ${analysis.risk_score}/100 is elevated.`);
  if (analysis.risk_reward < (strictShortHorizon ? 1.8 : 1.5)) failures.push(`Reward-to-risk ${analysis.risk_reward.toFixed(2)} is below the required minimum.`);

  if (CRASH_SYMBOL.test(symbol) && analysis.direction === 'buy') failures.push('Crash indices can drop abruptly; a static screenshot cannot safely authorize a long entry.');
  if (BOOM_SYMBOL.test(symbol) && analysis.direction === 'sell') failures.push('Boom indices can spike abruptly; a static screenshot cannot safely authorize a short entry.');

  const levelsValid = analysis.direction === 'buy'
    ? analysis.stop_loss < analysis.entry && analysis.take_profit > analysis.entry
    : analysis.stop_loss > analysis.entry && analysis.take_profit < analysis.entry;
  if (!levelsValid) failures.push('Entry, stop and target are not internally consistent with the suggested direction.');

  const unconfirmedImpulse = IMPULSE_LANGUAGE.test(combinedText) && !CONFIRMATION_LANGUAGE.test(combinedText);
  if (unconfirmedImpulse) failures.push('The latest impulse has no confirmed retracement or rejection; entering now would chase the move.');
  if (synthetic && unconfirmedImpulse) failures.push('Synthetic-index impulses require confirmation before any directional setup.');

  return failures.length > 0 ? noTrade(analysis, failures) : analysis;
}
