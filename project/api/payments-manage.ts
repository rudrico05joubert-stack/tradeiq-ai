import { getServiceClient, paystackPlanCode, paystackRequest, planFromPaystackCode, requireUser, type PaidPlan } from './_payments.js';

type VercelRequest = { method?: string; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (code: number) => { json: (body: unknown) => void } };
type PaystackSubscription = {
  subscription_code?: string;
  status?: string;
  next_payment_date?: string | null;
  plan?: { plan_code?: string } | string;
};
type PaystackCustomer = { id?: number; subscriptions?: PaystackSubscription[] };

function planCode(value?: PaystackSubscription['plan']): string | undefined {
  return typeof value === 'string' ? value : value?.plan_code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    const { data: existingSubscription, error } = await service
      .from('subscriptions')
      .select('subscription_code,customer_code,plan,status')
      .eq('user_id', user.id)
      .in('status', ['active', 'attention', 'non-renewing'])
      .maybeSingle();
    if (error) throw error;
    if (!existingSubscription) {
      return res.status(409).json({ error: 'Billing management is not available yet. Please contact support@nexoracharts.com.' });
    }
    if (existingSubscription.plan !== 'pro' && existingSubscription.plan !== 'elite') {
      throw new Error('INVALID_SUBSCRIPTION_PLAN');
    }
    const paidPlan = existingSubscription.plan as PaidPlan;

    let subscriptionCode = existingSubscription.subscription_code as string | null;
    if (!subscriptionCode && existingSubscription.customer_code) {
      const customer = await paystackRequest<PaystackCustomer>(`/customer/${encodeURIComponent(existingSubscription.customer_code)}`);
      let matching = customer.subscriptions?.find((item) =>
        planFromPaystackCode(planCode(item.plan)) === paidPlan && item.status !== 'disabled');
      if (!matching && customer.id) {
        const subscriptions = await paystackRequest<PaystackSubscription[]>(`/subscription?perPage=100&customer=${customer.id}`);
        matching = subscriptions.find((item) =>
          planFromPaystackCode(planCode(item.plan)) === paidPlan && item.status !== 'disabled');
      }
      if (!matching) {
        matching = await paystackRequest<PaystackSubscription>('/subscription', {
          method: 'POST',
          body: JSON.stringify({
            customer: existingSubscription.customer_code,
            plan: paystackPlanCode(paidPlan),
          }),
        });
      }
      if (matching?.subscription_code) {
        subscriptionCode = matching.subscription_code;
        const { error: updateError } = await service.from('subscriptions').update({
          subscription_code: subscriptionCode,
          status: matching.status ?? existingSubscription.status,
          next_payment_date: matching.next_payment_date ?? null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        if (updateError) throw updateError;
      }
    }
    if (!subscriptionCode) {
      return res.status(409).json({ error: 'Billing management is not available yet. Please contact support@nexoracharts.com.' });
    }

    const data = await paystackRequest<{ link: string }>(`/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`);
    let link: URL;
    try { link = new URL(data.link); }
    catch { throw new Error('INVALID_MANAGE_LINK'); }
    if (link.protocol !== 'https:' || link.hostname !== 'paystack.com' || !link.pathname.startsWith('/manage/subscriptions/')) {
      throw new Error('INVALID_MANAGE_LINK');
    }
    return res.status(200).json({ link: link.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manage subscription.';
    if (message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Please sign in again.' });
    console.error('Paystack management failed:', message);
    return res.status(503).json({ error: 'Billing management is temporarily unavailable.' });
  }
}
