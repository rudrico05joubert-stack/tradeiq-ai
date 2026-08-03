import { createClient, type User } from '@supabase/supabase-js';

export type PaidPlan = 'pro' | 'elite';

export const PAYSTACK_PLANS: Record<PaidPlan, { amount: number; currency: 'ZAR' }> = {
  pro: { amount: 39_900, currency: 'ZAR' },
  elite: { amount: 79_900, currency: 'ZAR' },
};

export function paystackPlanCode(plan: PaidPlan): string {
  const code = plan === 'pro' ? process.env.PAYSTACK_PRO_PLAN_CODE : process.env.PAYSTACK_ELITE_PLAN_CODE;
  if (!code?.startsWith('PLN_')) throw new Error('PAYMENTS_UNAVAILABLE');
  return code;
}

type RequestLike = { headers: Record<string, string | string[] | undefined> };

export function getBearerToken(req: RequestLike): string {
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : '';
}

export async function requireUser(req: RequestLike): Promise<{ user: User; token: string }> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const token = getBearerToken(req);
  if (!url || !anonKey) throw new Error('AUTH_UNAVAILABLE');
  if (!token) throw new Error('UNAUTHORIZED');

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error('UNAUTHORIZED');
  return { user, token };
}

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('SERVICE_UNAVAILABLE');
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function paystackSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYMENTS_UNAVAILABLE');
  return key;
}

export async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json() as { status?: boolean; message?: string; data?: T };
  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || 'Paystack request failed');
  }
  return payload.data;
}
