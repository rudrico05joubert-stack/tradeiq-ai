import cors from 'cors';
import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { analyzeChart } from './analysis';

function loadLocalEnv() {
  try {
    for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Hosted environments supply secrets directly through process.env.
  }
}

loadLocalEnv();

const app = express();
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '12mb' }));

app.get('/', (_req, res) => {
    res.json({
      status: "THIS IS THE NEW SERVER",
      openaiConfigured: Boolean(openai),
      time: new Date().toISOString(),
    });
  });

app.post('/api/analyze-chart', async (req, res) => {
  if (!openai) return res.status(500).json({ error: 'OPENAI_API_KEY is missing from project/.env.' });

  try {
    const analysis = await analyzeChart(openai, req.body);
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Chart analysis failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to analyze this chart.';
    return res.status(500).json({ error: message });
  }
});

app.listen(3001, () => {
  console.log(`AI server running on http://localhost:3001 (OpenAI key: ${openai ? 'loaded' : 'missing'})`);
});
