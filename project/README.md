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
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PRO_PLAN_CODE`
- `PAYSTACK_ELITE_PLAN_CODE`
- `PAYSTACK_CALLBACK_URL`

## Required browser configuration

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Paystack test and live environments use different secret keys and plan codes. After Paystack approves the business, create the Pro and Elite plans in Live Mode, replace the three Paystack values in Vercel, and configure the live webhook URL as `https://www.nexoracharts.com/api/payments-webhook` before accepting real customers.

`OPENAI_API_KEY` must never use a `VITE_` prefix or be exposed to browser code.

## Product safety

NEXORA is decision-support software, not financial advice. The AI can return a neutral result when a chart is unclear, and users should independently validate every setup and control their own risk.
