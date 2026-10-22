# Stripe and license integration

The marketing site is a storefront, not a card form or license-signing service.
The existing `../sentire/commerce/` service owns purchases and signed licenses.
Keep those responsibilities separate when preparing production hosting.

## Available now

```text
Sentire marketing page ($29 USD, one time)
  → local /checkout redirect
  → Sentire purchase service (simulator or Stripe test mode)
  → confirmed test purchase
  → receipt page with signed test license
  → paste into Sentire → verify offline
```

The website's local purchase button uses a fixed URL and passes no amount,
hearing data, customer data, signing key or Stripe credentials. The service
fixes the price at 2900 USD cents. Simulator transactions never collect card
numbers. Stripe test mode sends the customer to Stripe-hosted Checkout.

The existing service verifies webhook signatures and retrieves the Checkout
Session before fulfillment. It checks payment status, amount, currency, product,
mode and order identity, and persists one license per order even when webhook
deliveries repeat. A success-page redirect alone never grants a license.

For Stripe credentials, local webhook forwarding, and fake card details, use
[Sentire's local setup guide](../sentire/docs/LOCAL_TESTING.md). No secret belongs
in `site.config.json`, browser JavaScript, the static build, or a repository.

## Production wiring, when ready

1. Deploy a production-ready HTTPS purchase service on the chosen domain. The
   current service is loopback-only and deliberately rejects live payments;
   it needs the production work listed in [Sentire's release plan](../sentire/docs/STORE_RELEASE.md).
2. Use a separate live Stripe environment and Ed25519 signing key. Ship only
   the live verification key in the production app; reject test licenses there.
3. Register the production webhook. Fulfill verified completed purchases with
   the same idempotency guarantees. Add license email delivery and secure
   recovery; local test receipts currently provide copy/paste only.
4. Confirm taxes, purchase/refund terms, personal-license terms and support.
   Keep the base price server-controlled; marketing text is not trusted pricing.
5. Set the site's real `origin` and the purchase service's HTTPS `checkoutUrl`.
   The call to action becomes **Buy Sentire — $29**. Update preview/release copy
   and add verified store links only when those releases exist.
6. Validate an end-to-end Stripe sandbox purchase on the intended infrastructure,
   including declined cards, authentication, canceled checkout, webhook retries,
   recovery, and offline activation. Enable real charges only after that passes.

A static checkout link can hand off to the purchase service. If the production
host uses a same-origin `/api/checkout` endpoint instead, keep order creation,
Stripe credentials, amount validation, signing and fulfillment on the server.
Do not substitute an unverified generic payment link that bypasses license
fulfillment.

Sources:
[Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment),
[test cards](https://docs.stripe.com/testing),
[webhooks](https://docs.stripe.com/webhooks).
