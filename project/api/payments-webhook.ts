import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getServiceClient, paystackRequest, paystackSecret, planFromPaystackCode, type PaidPlan } from './_payments.js';

type VercelRequest = AsyncIterable<Uint8Array> & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type VercelResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

type PaystackCustomer = { customer_code?: string; email?: string };
type PaystackPlan = { plan_code?: string } | string;
type PaystackSubscription = {
  subscription_code?: string;
  status?: string;
  next_payment_date?: string | null;
  customer?: PaystackCustomer;
  plan?: PaystackPlan;
};
type PaystackEventData = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  metadata?: { user_id?: string; plan?: string };
  customer?: PaystackCustomer;
  plan?: PaystackPlan;
  subscription?: PaystackSubscription;
  subscription_code?: string;
  next_payment_date?: string | null;
};
type PaystackEvent = { event?: string; data?: PaystackEventData };
type PaystackCustomerDetails = {
  subscriptions?: Array<PaystackSubscription>;
};

export const config = { api: { bodyParser: false } };

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

async function readBody(req: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function validSignature(body: Buffer, signature: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', paystackSecret()).update(body).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function planCode(value?: PaystackPlan): string | undefined {
  return typeof value === 'string' ? value : value?.plan_code;
}

function validUserId(value?: string): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function findUserId(data: PaystackEventData, plan: PaidPlan): Promise<string | null> {
  if (validUserId(data.metadata?.user_id) && data.metadata?.plan === plan) return data.metadata.user_id;

  const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
  const customerCode = data.customer?.customer_code ?? data.subscription?.customer?.customer_code;
  const service = getServiceClient();
  let query = service.from('subscriptions').select('user_id').eq('plan', plan);
  if (subscriptionCode) query = query.eq('subscription_code', subscriptionCode);
  else if (customerCode) query = query.eq('customer_code', customerCode);
  else return null;
  const { data: record, error } = await query.maybeSingle();
  if (error) throw error;
  return record?.user_id ?? null;
}

async function saveSubscription(data: PaystackEventData, userId: string, plan: PaidPlan, status: string) {
  const subscription = data.subscription ?? data;
  const subscriptionCode = subscription.subscription_code;
  const customerCode = data.customer?.customer_code ?? subscription.customer?.customer_code;
  if (!subscriptionCode && !customerCode) return;

  const service = getServiceClient();
  const values = {
    user_id: userId,
    plan,
    status,
    subscription_code: subscriptionCode ?? null,
    customer_code: customerCode ?? null,
    next_payment_date: subscription.next_payment_date ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await service.from('subscriptions').upsert(values, { onConflict: 'user_id' });
  if (error) throw error;
}

async function activateCharge(data: PaystackEventData) {
  if (data.status !== 'success' || !data.reference) return;
  const plan = planFromPaystackCode(planCode(data.plan ?? data.subscription?.plan));
  if (!plan) return;
  const expectedAmount = plan === 'pro' ? 39_900 : 79_900;
  if (data.amount !== expectedAmount || data.currency !== 'ZAR') return;
  const userId = await findUserId(data, plan);
  if (!userId) return;

  const service = getServiceClient();
  const { error: paymentError } = await service.from('payments').upsert({
    reference: data.reference,
    user_id: userId,
    plan,
    amount: data.amount,
    currency: data.currency,
    status: 'success',
    paid_at: data.paid_at ?? new Date().toISOString(),
  }, { onConflict: 'reference' });
  if (paymentError) throw paymentError;
  const { error: profileError } = await service.from('profiles').update({ plan }).eq('id', userId);
  if (profileError) throw profileError;
  await saveSubscription(data, userId, plan, 'active');

  const customerCode = data.customer?.customer_code;
  const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
  if (customerCode && !subscriptionCode) {
    const customer = await paystackRequest<PaystackCustomerDetails>(`/customer/${encodeURIComponent(customerCode)}`);
    const matchingSubscription = customer.subscriptions?.find((item) =>
      planFromPaystackCode(planCode(item.plan)) === plan && item.status !== 'disabled');
    if (matchingSubscription) {
      await saveSubscription({ customer: data.customer, subscription: matchingSubscription }, userId, plan, matchingSubscription.status ?? 'active');
    }
  }
}

async function updateSubscription(eventName: string, data: PaystackEventData): Promise<boolean> {
  const subscription = data.subscription ?? data;
  const plan = planFromPaystackCode(planCode(subscription.plan ?? data.plan));
  if (!plan) return true;
  const userId = await findUserId(data, plan);
  if (!userId) return false;

  const status = eventName === 'subscription.disable'
    ? 'disabled'
    : eventName === 'subscription.not_renew'
      ? 'non-renewing'
      : eventName === 'invoice.payment_failed'
        ? 'attention'
        : subscription.status ?? 'active';
  await saveSubscription(data, userId, plan, status);

  if (eventName === 'subscription.disable') {
    const service = getServiceClient();
    const { error } = await service.from('profiles').update({ plan: 'free' }).eq('id', userId);
    if (error) throw error;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = await readBody(req);
    const signature = headerValue(req.headers['x-paystack-signature']);
    if (!validSignature(body, signature)) return res.status(401).json({ error: 'Invalid signature' });

    const event = JSON.parse(body.toString('utf8')) as PaystackEvent;
    if (!event.event || !event.data) return res.status(400).json({ error: 'Invalid event' });
    const eventHash = createHash('sha256').update(body).digest('hex');
    const service = getServiceClient();
    const { data: processed, error: lookupError } = await service
      .from('paystack_webhook_events')
      .select('event_hash')
      .eq('event_hash', eventHash)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (processed) return res.status(200).json({ received: true });

    if (event.event === 'charge.success') await activateCharge(event.data);
    else if (['subscription.create', 'subscription.disable', 'subscription.not_renew', 'invoice.payment_failed', 'invoice.update'].includes(event.event)) {
      const handled = await updateSubscription(event.event, event.data);
      if (!handled) throw new Error('RETRY_EVENT');
    }
    const { error: eventError } = await service.from('paystack_webhook_events').insert({
      event_hash: eventHash,
      event_type: event.event,
    });
    if (eventError?.code !== '23505' && eventError) throw eventError;
    return res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('Paystack webhook failed:', message);
    return res.status(message === 'PAYLOAD_TOO_LARGE' ? 413 : 500).json({ error: 'Webhook processing failed' });
  }
}
