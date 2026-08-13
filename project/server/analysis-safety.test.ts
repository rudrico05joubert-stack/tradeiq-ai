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
assert.equal(failedCrashTrade.direction, 'sell');
assert.equal(failedCrashTrade.indicators['Entry Ready'], 0);
assert.equal(failedCrashTrade.setup_grade, 'C');
assert.notEqual(failedCrashTrade.confidence, 59);
assert.equal(failedCrashTrade.overlays.entryZone, null);
assert.match(failedCrashTrade.reasons[0], /ENTRY WAIT/);

const autoCrashBuyBeforeDrop = enforceAnalysisSafety(fixture({
  market_trend: 'Bullish: staircase rise is visible after the prior crash.',
  direction: 'buy', confidence: 72, setup_grade: 'A', trend_strength: 82,
  momentum_score: 74, risk_score: 25, entry: 5668.5, stop_loss: 5662,
  take_profit: 5676, risk_reward: 1.15,
  reasons: ['Price is forming a staircase of small bullish candles.'],
  detailed_explanation: 'The short-term staircase is rising, but another abrupt crash remains possible.',
}), { symbol: 'Crash 1000 Index', timeframe: 'AUTO' });
assert.equal(autoCrashBuyBeforeDrop.direction, 'sell');
assert.equal(autoCrashBuyBeforeDrop.indicators['Entry Ready'], 0);
assert.equal(autoCrashBuyBeforeDrop.setup_grade, 'C');
assert.notEqual(autoCrashBuyBeforeDrop.confidence, 59);
assert.match(autoCrashBuyBeforeDrop.reasons[0], /SELL entry/i);

const qualifiedSetup = enforceAnalysisSafety(fixture({
  market_trend: 'Bearish: established lower-high structure after a confirmed pullback rejection.',
  confidence: 82, setup_grade: 'A', trend_strength: 76, momentum_score: 72, risk_score: 34,
  reasons: ['Confirmed pullback rejection at resistance.', 'Momentum aligns with the established bearish structure.', 'Entry follows confirmation rather than displacement.'],
  detailed_explanation: 'Price completed a retracement and confirmed rejection before the entry.',
}), { symbol: 'EURUSD', timeframe: 'M15' });
assert.equal(qualifiedSetup.direction, 'sell');
assert.equal(qualifiedSetup.indicators['Entry Ready'], 1);
assert.ok(qualifiedSetup.confidence >= 65);

const validCrashContinuation = enforceAnalysisSafety(fixture({
  market_trend: 'Bearish: lower highs continue after a confirmed pullback rejection.',
  confidence: 76, trend_strength: 72, momentum_score: 70, risk_score: 38,
  reasons: ['Confirmed pullback rejection below resistance.', 'Bearish structure and momentum agree.'],
  detailed_explanation: 'A retracement completed and rejection confirmed before entry.',
}), { symbol: 'Crash 1000 Index', timeframe: 'M1' });
assert.equal(validCrashContinuation.direction, 'sell');
assert.equal(validCrashContinuation.indicators['Entry Ready'], 1);

const badLevels = enforceAnalysisSafety(fixture({
  confidence: 85, setup_grade: 'A', trend_strength: 80, momentum_score: 78, risk_score: 30,
  market_trend: 'Bearish: confirmed pullback rejection.', reasons: ['Confirmed pullback rejection.'],
  detailed_explanation: 'Retracement rejection confirmed.', stop_loss: 5650,
}), { symbol: 'EURUSD', timeframe: 'M15' });
assert.equal(badLevels.direction, 'sell');
assert.equal(badLevels.indicators['Entry Ready'], 0);

const inferredBearishBias = enforceAnalysisSafety(fixture({ direction: 'neutral' }), { symbol: 'Crash 1000 Index', timeframe: 'M1' });
assert.equal(inferredBearishBias.direction, 'sell');
assert.equal(inferredBearishBias.indicators['Entry Ready'], 0);

const genuineNoBias = enforceAnalysisSafety(fixture({ direction: 'neutral', market_trend: 'Ranging: price is moving sideways without structure.' }), { symbol: 'EURUSD', timeframe: 'M15' });
assert.equal(genuineNoBias.direction, 'neutral');
assert.equal(genuineNoBias.indicators['Entry Ready'], 0);

const crashBuyBlocked = enforceAnalysisSafety(fixture({
  direction: 'buy', market_trend: 'Bullish: a short staircase recovery is visible.',
  confidence: 80, trend_strength: 80, momentum_score: 75, risk_score: 25,
  entry: 5668, stop_loss: 5660, take_profit: 5684, risk_reward: 2,
  reasons: ['Short-term candles are rising after a drop.'], detailed_explanation: 'A bullish recovery is visible.',
}), { symbol: 'Crash 1000 Index', timeframe: 'M1' });
assert.equal(crashBuyBlocked.direction, 'sell');
assert.equal(crashBuyBlocked.indicators['Entry Ready'], 0);
assert.match(crashBuyBlocked.reasons[0], /ENTRY WAIT.*SELL entry/i);

const boomSellBlocked = enforceAnalysisSafety(fixture({ direction: 'sell' }), { symbol: 'Boom 1000 Index', timeframe: 'M1' });
assert.equal(boomSellBlocked.direction, 'buy');
assert.equal(boomSellBlocked.indicators['Entry Ready'], 0);

console.log('analysis safety regression tests passed');
