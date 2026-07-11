import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getRequestOwner } from '../lib/request-context.js';
import { getSubscriptionSnapshot, isAuthenticatedOwner } from '../lib/entitlements.js';

export const subscriptionsRouter = new Hono();

const checkoutSchema = z.object({
  plan: z.enum(['plus', 'professional']),
});

subscriptionsRouter.get('/me', async (c) => {
  const owner = await getRequestOwner(c);
  return c.json(await getSubscriptionSnapshot(owner));
});

subscriptionsRouter.post('/checkout', zValidator('json', checkoutSchema), async (c) => {
  const owner = await getRequestOwner(c);
  if (!isAuthenticatedOwner(owner)) {
    return c.json({ code: 'AUTH_REQUIRED', error: 'Please sign in before choosing a paid plan.' }, 401);
  }

  return c.json(
    {
      code: 'BILLING_NOT_CONFIGURED',
      error: 'Paid checkout is not connected yet. Add Stripe credentials before upgrading.',
    },
    501
  );
});

subscriptionsRouter.post('/portal', async (c) => {
  const owner = await getRequestOwner(c);
  if (!isAuthenticatedOwner(owner)) {
    return c.json({ code: 'AUTH_REQUIRED', error: 'Please sign in to manage billing.' }, 401);
  }

  return c.json(
    {
      code: 'BILLING_NOT_CONFIGURED',
      error: 'The billing portal is not connected yet. Add Stripe credentials before managing billing.',
    },
    501
  );
});

subscriptionsRouter.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ code: 'WEBHOOK_SIGNATURE_REQUIRED', error: 'A valid Stripe signature is required.' }, 401);
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ code: 'BILLING_NOT_CONFIGURED', error: 'Stripe webhook verification is not configured.' }, 501);
  }

  return c.json({ code: 'BILLING_NOT_CONFIGURED', error: 'Stripe webhook processing is not enabled yet.' }, 501);
});
