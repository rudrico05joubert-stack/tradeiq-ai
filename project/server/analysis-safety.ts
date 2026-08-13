import type { GeneratedAnalysis } from '../src/lib/engine.js';

export interface SafetyGateContext { symbol: string; timeframe: string; }

const IMPULSE_LANGUAGE = /\b(impulsive?|displacement|crash candle|spike|sharp (?:drop|break|move)|large (?:bearish|bullish) candle|oversized candle|break of structure)\b/i;
const CONFIRMATION_LANGUAGE = /\b(retest|retracement|pullback)\b[\s\S]{0,80}\b(reject(?:ion|ed)?|confirm(?:ation|ed)?|hold|failed)\b/i;
const LOW_TIMEFRAME = /^(?:M1|M2|M3|M4|M5)$/i;
const SYNTHETIC_SYMBOL = /\b(?:crash|boom|volatility|step|jump)\b/i;
const CRASH_SYMBOL = /\bcrash\b/i;
const BOOM_SYMBOL = /\bboom\b/i;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function calibrateConfidence(analysis: GeneratedAnalysis): GeneratedAnalysis {
  const trend = clamp(analysis.trend_strength, 0, 100);
  const momentum = clamp(analysis.momentum_score, 0, 100);
  const risk = clamp(analysis.risk_score, 0, 100);
  const rewardQuality = clamp((analysis.risk_reward - 1) * 18, 0, 24);
  const confidence = analysis.direction === 'neutral'
    ? clamp(24 + trend * 0.14 + Math.abs(momentum - 50) * 0.12 + (100 - risk) * 0.08, 20, 55)
    : clamp(18 + trend * 0.3 + momentum * 0.2 + (100 - risk) * 0.16 + rewardQuality, 30, 95);

  return { ...analysis, confidence, trend_strength: trend, momentum_score: momentum, risk_score: risk };
}

function inferBias(analysis: GeneratedAnalysis): GeneratedAnalysis['direction'] {
  if (analysis.direction !== 'neutral') return analysis.direction;
  if (/^Bearish:/i.test(analysis.market_trend)) return 'sell';
  if (/^Bullish:/i.test(analysis.market_trend)) return 'buy';
  return 'neutral';
}

function entryWait(analysis: GeneratedAnalysis, reasons: string[]): GeneratedAnalysis {
  const direction = inferBias(analysis);
  const gateReason = `ENTRY WAIT: ${reasons.join(' ')}`;
  return {
    ...analysis,
    direction,
    confidence: analysis.confidence,
    setup_grade: 'C',
    indicators: { ...analysis.indicators, 'Entry Ready': 0 },
    reasons: [gateReason, ...analysis.reasons].slice(0, 6),
    overlays: { ...analysis.overlays, entryZone: null, stopLoss: null, takeProfit: null },
    detailed_explanation: `${gateReason} Wait for stronger agreement and a confirmed entry structure. ${analysis.detailed_explanation}`,
  };
}

export function enforceAnalysisSafety(analysis: GeneratedAnalysis, { symbol, timeframe }: SafetyGateContext): GeneratedAnalysis {
  const restrictedDirection = CRASH_SYMBOL.test(symbol) ? 'sell' : BOOM_SYMBOL.test(symbol) ? 'buy' : null;
  const oppositeSideBlocked = restrictedDirection !== null && analysis.direction !== restrictedDirection;
  const policyAdjusted: GeneratedAnalysis = oppositeSideBlocked
    ? {
        ...analysis,
        direction: restrictedDirection,
        reasons: [`${CRASH_SYMBOL.test(symbol) ? 'Crash' : 'Boom'} strategy only allows ${restrictedDirection.toUpperCase()}-side setups; the opposite-side signal was blocked.`, ...analysis.reasons],
        detailed_explanation: `Instrument policy blocked the opposite-side recommendation. ${analysis.detailed_explanation}`,
      }
    : analysis;
  const calibrated = calibrateConfidence(policyAdjusted);
  if (calibrated.direction === 'neutral') {
    const bias = inferBias(calibrated);
    const reason = bias === 'neutral'
      ? 'The chart does not show a reliable directional bias.'
      : `The chart is ${bias === 'sell' ? 'bearish' : 'bullish'}, but the entry is not confirmed yet.`;
    return entryWait(calibrated, [reason]);
  }

  const failures: string[] = [];
  const synthetic = SYNTHETIC_SYMBOL.test(symbol);
  // AUTO is not a safety escape hatch. Synthetic products are commonly shown on
  // M1 charts and carry abrupt tail-event risk even when the UI omits timeframe.
  const strictShortHorizon = LOW_TIMEFRAME.test(timeframe) || synthetic;
  const combinedText = `${calibrated.market_trend} ${calibrated.reasons.join(' ')} ${calibrated.detailed_explanation}`;

  if (oppositeSideBlocked) failures.push(`Wait for a confirmed ${restrictedDirection!.toUpperCase()} entry; opposite-side trades are disabled for this instrument.`);

  const confidenceFloor = synthetic ? 70 : strictShortHorizon ? 68 : 65;
  if (calibrated.confidence < confidenceFloor) failures.push(`Confidence ${calibrated.confidence}% is below the ${confidenceFloor}% directional threshold.`);
  if (calibrated.trend_strength < (strictShortHorizon ? 45 : 40)) failures.push(`Trend strength ${calibrated.trend_strength}/100 is too weak.`);
  if (calibrated.momentum_score < (strictShortHorizon ? 45 : 40)) failures.push(`Momentum ${calibrated.momentum_score}/100 is too weak.`);
  if (calibrated.risk_score > 72) failures.push(`Risk score ${calibrated.risk_score}/100 is elevated.`);
  if (calibrated.risk_reward < (strictShortHorizon ? 1.5 : 1.3)) failures.push(`Reward-to-risk ${calibrated.risk_reward.toFixed(2)} is below the required minimum.`);

  const levelsValid = calibrated.direction === 'buy'
    ? calibrated.stop_loss < calibrated.entry && calibrated.take_profit > calibrated.entry
    : calibrated.stop_loss > calibrated.entry && calibrated.take_profit < calibrated.entry;
  if (!levelsValid) failures.push('Entry, stop and target are not internally consistent with the suggested direction.');

  const unconfirmedImpulse = IMPULSE_LANGUAGE.test(combinedText) && !CONFIRMATION_LANGUAGE.test(combinedText);
  if (unconfirmedImpulse) failures.push('The latest impulse has no confirmed retracement or rejection; entering now would chase the move.');
  if (synthetic && unconfirmedImpulse) failures.push('Synthetic-index impulses require confirmation before any directional setup.');

  return failures.length > 0
    ? entryWait(calibrated, failures)
    : { ...calibrated, indicators: { ...calibrated.indicators, 'Entry Ready': 1 } };
}
