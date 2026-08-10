import assert from 'node:assert/strict';
import { enforceAnalysisSafety } from './analysis-safety.js';
import type { GeneratedAnalysis } from '../src/lib/engine.js';

function fixture(overrides: Partial<GeneratedAnalysis> = {}): GeneratedAnalysis {
  return {
    market_trend: 'Bearish: strong impulsive crash candle followed by a small corrective move.',
    direction: 'sell', confidence: 64, setup_grade: 'B', risk_score: 6,
    trend_strength: 8, momentum_score: 7,
    entry: 5668, stop_loss: 5676, take_profit: 5646, risk_reward: 2.75,
    reasons: ['Large bearish displacement broke prior structure.', 'Price is correcting after the crash candle.', 'Short bias remains visible.'],
    indicators: {},
    overlays: { support: [], resistance: [], liquidity: [], ema50: [], ema200: [], entryZone: { x1: 0.7, y1: 0.5, x2: 0.8, y2: 0.55 }, stopLoss: { x: 0.8, y: 0.4 }, takeProfit: { x: 0.8, y: 0.8 }, patterns: [] },
    detailed_explanation: 'A sharp drop dominates the latest structure and the current bounce may retrace the drop.',
    ...overrides,
  };
}

const failedCrashTrade = enforceAnalysisSafety(fixture(), { symbol: 'Crash 1000 Index', timeframe: 'M1' });
assert.equal(failedCrashTrade.direction, 'neutral');
assert.equal(failedCrashTrade.setup_grade, 'C');
assert.ok(failedCrashTrade.confidence <= 59);
assert.equal(failedCrashTrade.overlays.entryZone, null);
assert.match(failedCrashTrade.reasons[0], /NO TRADE safety gate/);

const qualifiedSetup = enforceAnalysisSafety(fixture({
  market_trend: 'Bearish: established lower-high structure after a confirmed pullback rejection.',
  confidence: 82, setup_grade: 'A', trend_strength: 76, momentum_score: 72, risk_score: 34,
  reasons: ['Confirmed pullback rejection at resistance.', 'Momentum aligns with the established bearish structure.', 'Entry follows confirmation rather than displacement.'],
  detailed_explanation: 'Price completed a retracement and confirmed rejection before the entry.',
}), { symbol: 'EURUSD', timeframe: 'M15' });
assert.equal(qualifiedSetup.direction, 'sell');

const badLevels = enforceAnalysisSafety(fixture({
  confidence: 85, setup_grade: 'A', trend_strength: 80, momentum_score: 78, risk_score: 30,
  market_trend: 'Bearish: confirmed pullback rejection.', reasons: ['Confirmed pullback rejection.'],
  detailed_explanation: 'Retracement rejection confirmed.', stop_loss: 5650,
}), { symbol: 'EURUSD', timeframe: 'M15' });
assert.equal(badLevels.direction, 'neutral');

console.log('analysis safety regression tests passed');
