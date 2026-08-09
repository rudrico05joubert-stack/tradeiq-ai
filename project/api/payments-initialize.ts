import { PAYSTACK_PLANS, allowServerAction, getServiceClient, paystackPlanCode, paystackRequest, requireUser, type PaidPlan } from './_payments.js';

type VercelRequest = { method?: string; body?: { plan?: string }; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (code: number) => { json: (body: unknown) => void } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const plan = req.body?.plan as PaidPlan;
  if (!(plan in PAYSTACK_PLANS)) return res.status(400).json({ error: 'Choose a valid paid plan.' });

  try {
    const { user } = await requireUser(req);
    if (!await allowServerAction(user.id, 'payment_initialize')) return res.status(429).json({ error: 'Too many checkout attempts. Please wait a few minutes.' });
    if (!user.email) return res.status(400).json({ error: 'Your account needs an email address.' });
    const service = getServiceClient();
    const { data: subscription, error: subscriptionError } = await service
      .from('subscriptions')
      .select('plan,status')
      .eq('user_id', user.id)
      .in('status', ['active', 'attention', 'non-renewing'])
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (subscription) {
      return res.status(409).json({
        error: subscription.plan === plan
          ? 'This plan is already active. Use Manage subscription for billing changes.'
          : 'Manage your current subscription before changing plans.',
      });
    }
    const selected = PAYSTACK_PLANS[plan];
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || 'https://www.nexoracharts.com/?payment=callback';
    const data = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        amount: selected.amount,
        currency: selected.currency,
        plan: paystackPlanCode(plan),
        callback_url: callbackUrl,
        metadata: { user_id: user.id, plan, product: 'NEXORA AI' },
      }),
    });
    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start checkout.';
    if (message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Please sign in again.' });
    console.error('Paystack initialization failed:', message);
    return res.status(503).json({ error: 'Checkout is temporarily unavailable.' });
  }
}
