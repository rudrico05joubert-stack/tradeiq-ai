import { useState } from 'react';
import { Upload, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { IconBadge, GlassCard } from '../components/ui';
import { Dropzone } from '../components/Dropzone';
import { AnalysisTerminal } from '../components/AnalysisTerminal';
import { generateAnalysis, imageSignature } from '../lib/engine';
import { uploadChart, insertAnalysis, bumpUsage, getUsageRemaining } from '../lib/api';

export function NewAnalysisView({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('auto');
  const [error, setError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<{ imageUrl: string } | null>(null);

  const run = async () => {
    if (!file || !user || !profile) return;
    setError(null);
    const { remaining } = await getUsageRemaining(profile);
    if (remaining <= 0) {
      setError("You've used all 3 free analyses today. Upgrade to Pro for unlimited analyses.");
      return;
    }
    setTerminal({ imageUrl: URL.createObjectURL(file) });
  };

  const onTerminalComplete = async () => {
    console.log("========== ANALYSIS START ==========");
  
    if (!file || !user || !profile) {
      console.log("❌ Missing data");
      console.log({
        file: !!file,
        user: !!user,
        profile: !!profile,
      });
      return;
    }
  
    try {
      console.log("1️⃣ Creating image signature...");
      const sig = await imageSignature(file);
      console.log("✅ Signature created");
  
      console.log("2️⃣ Generating analysis...");
      const gen = generateAnalysis({
        imageSignature: sig,
        symbol: symbol || "AUTO",
        timeframe,
      });
      console.log("✅ Analysis generated");
  
      console.log("3️⃣ Uploading chart...");
      const imageUrl = await uploadChart(file, user.id);
      console.log("✅ Upload complete");
      console.log(imageUrl);
  
      console.log("4️⃣ Saving analysis...");
      const saved = await insertAnalysis({
        user_id: user.id,
        symbol: symbol || "AUTO",
        timeframe,
        image_url: imageUrl,
        market_trend: gen.market_trend,
        direction: gen.direction,
        confidence: gen.confidence,
        entry: gen.entry,
        stop_loss: gen.stop_loss,
        take_profit: gen.take_profit,
        risk_reward: gen.risk_reward,
        reasons: gen.reasons,
        indicators: gen.indicators,
        notes: "",
        status: "completed",
        setup_grade: gen.setup_grade,
        risk_score: gen.risk_score,
        trend_strength: gen.trend_strength,
        momentum_score: gen.momentum_score,
        overlays: gen.overlays,
        detailed_explanation: gen.detailed_explanation,
      });
  
      console.log("✅ Analysis saved");
      console.log(saved);
  
      console.log("5️⃣ Updating usage...");
      await bumpUsage(profile);
      console.log("✅ Usage updated");
  
      console.log("6️⃣ Refreshing profile...");
      await refreshProfile();
      console.log("✅ Profile refreshed");
  
      if (terminal?.imageUrl) {
        URL.revokeObjectURL(terminal.imageUrl);
      }
  
      setTerminal(null);
  
      console.log("7️⃣ Navigating...");
      navigate({
        name: "analysis",
        id: saved.id,
      });
  
      console.log("========== SUCCESS ==========");
    } catch (err) {
      console.error("========== ERROR ==========");
      console.error(err);
  
      if (terminal?.imageUrl) {
        URL.revokeObjectURL(terminal.imageUrl);
      }
  
      setTerminal(null);
  
      const message =
        err instanceof Error
          ? err.message
          : JSON.stringify(err);
  
      alert(message);
  
      setError(message);
    }
  };

  if (terminal) {
    return (
      <AnalysisTerminal
        symbol={symbol || 'AUTO'}
        timeframe={timeframe}
        imageUrl={terminal.imageUrl}
        onComplete={onTerminalComplete}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <IconBadge icon={Upload} accent />
          <div>
            <h2 className="font-display text-lg font-600 text-white">Upload a chart</h2>
            <p className="text-xs text-ink-400">Drop your MT5 / TradingView screenshot and let the AI analyze it.</p>
          </div>
        </div>
        <Dropzone onFile={setFile} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Symbol (optional)</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="e.g. EURUSD" className="input" maxLength={12} />
          </div>
          <div>
            <label className="field-label">Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="input">
              <option value="auto">Auto-detect</option>
              <option value="m5">M5</option>
              <option value="m15">M15</option>
              <option value="h1">H1</option>
              <option value="h4">H4</option>
              <option value="d1">D1</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-bear-500/30 bg-bear-500/10 px-3 py-2.5 text-xs text-bear-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button onClick={run} disabled={!file} className="btn-neon mt-5 w-full">
          <Sparkles size={16} /> Analyze chart
        </button>
        <p className="mt-3 text-center text-[11px] text-ink-500">
          You'll see a full-screen AI analysis sequence, then your terminal results.
        </p>
      </GlassCard>
    </div>
  );
}
