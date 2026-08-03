import { PAYSTACK_PLANS, getServiceClient, paystackPlanCode, paystackRequest, requireUser, type PaidPlan } from './_payments.js';

type VercelRequest = { method?: string; body?: { reference?: string }; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (code: number) => { json: (body: unknown) => void } };
type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; paid_at?: string; metadata?: { user_id?: string; plan?: string }; plan?: { plan_code?: string } | string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const reference = req.body?.reference?.trim();
  if (!reference || reference.length > 160) return res.status(400).json({ error: 'Invalid payment reference.' });

  try {
    const { user } = await requireUser(req);
    const transaction = await paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const plan = transaction.metadata?.plan as PaidPlan;
    const expected = PAYSTACK_PLANS[plan];
    const transactionPlanCode = typeof transaction.plan === 'string' ? transaction.plan : transaction.plan?.plan_code;
    const valid = transaction.status === 'success' && transaction.reference === reference
      && transaction.metadata?.user_id === user.id && Boolean(expected)
      && transaction.amount === expected.amount && transaction.currency === expected.currency;
    if (!valid || transactionPlanCode !== paystackPlanCode(plan)) return res.status(400).json({ error: 'This payment could not be verified.' });

    const service = getServiceClient();
    const { error: paymentError } = await service.from('payments').upsert({
      reference, user_id: user.id, plan, amount: transaction.amount,
      currency: transaction.currency, status: transaction.status,
      paid_at: transaction.paid_at ?? new Date().toISOString(),
    }, { onConflict: 'reference' });
    if (paymentError) throw paymentError;
    const { error: profileError } = await service.from('profiles').update({ plan }).eq('id', user.id);
    if (profileError) throw profileError;
    return res.status(200).json({ verified: true, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed.';
    if (message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Please sign in again.' });
    console.error('Paystack verification failed:', message);
    return res.status(503).json({ error: 'We could not confirm the payment yet. Please try again.' });
  }
}
