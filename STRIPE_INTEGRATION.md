# Checkout and licensing integration

Introductory personal license: **$14.95 USD, one time**. The website links to
server-created Checkout; no secret keys or signing keys reach the browser.

Verified payment → automatic license email → paste into Sentire → automatic
installation claim → saved computer-bound activation checked offline.
One purchase includes two installations. `/license/` resends the same credential.

The local site uses `/checkout` → http://127.0.0.1:8860/buy. The service currently
supports only mock/Stripe sandbox and rejects live credentials/events. It verifies
webhook signatures and retrieves Sessions before fulfillment; redirect alone is
not proof. New orders snapshot 1495 cents; retained earlier orders snapshot 2900
cents. Later price changes do not alter earlier expected amounts. The price is
inline in Checkout, not a configured Stripe Product/Price ID.

For current setup, credential variable names, operator recovery and public launch
work, see the companion app docs/LOCAL_TESTING.md, docs/LICENSING_PORTAL.md,
docs/STRIPE_HANDOFF.md and docs/LAUNCH_CHECKLIST.md. Nothing in the static site
can enable live payments on its own. Public HTTPS commerce, trusted hosts, secure
cookies, live keys/signing identity, webhooks, email, tax/refund terms and tested
platform downloads must be configured and validated before real purchases open.
