import { getServiceClient, paystackRequest, requireUser } from './_payments.js';

type VercelRequest = { method?: string; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status: (code: number) => { json: (body: unknown) => void } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    const { data: subscription, error } = await service
      .from('subscriptions')
      .select('subscription_code,status')
      .eq('user_id', user.id)
      .in('status', ['active', 'attention', 'non-renewing'])
      .maybeSingle();
    if (error) throw error;
    if (!subscription?.subscription_code) {
      return res.status(409).json({ error: 'Billing management is not available yet. Please contact support@nexoracharts.com.' });
    }

    const data = await paystackRequest<{ link: string }>(`/subscription/${encodeURIComponent(subscription.subscription_code)}/manage/link`);
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
