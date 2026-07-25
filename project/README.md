# NEXORA AI

AI-assisted chart analysis, trading journal, watchlist, and performance coaching.

## Launch setup

1. Copy `.env.example` to `.env` and add the Supabase and OpenAI values.
2. Apply the SQL files in `supabase/migrations` to the target Supabase project in filename order.
3. In Supabase Auth, configure the production site URL and allowed redirect URLs.
4. Deploy this `project` directory to Vercel and add the same environment values there.
5. Confirm email/password sign-up, chart upload, one full analysis, journal save, and sign-out in production.

## Local development

```bash
npm ci
npm run dev
```

The local AI endpoint runs separately:

```bash
npm run server
```

## Release checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Required server secrets

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

`OPENAI_API_KEY` must never use a `VITE_` prefix or be exposed to browser code.

## Product safety

NEXORA is decision-support software, not financial advice. The AI can return a neutral result when a chart is unclear, and users should independently validate every setup and control their own risk.
