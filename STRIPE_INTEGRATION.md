# Checkout and licensing integration

Introductory personal license: **$14.95 USD, one time**, two installations.
Purchase → verified Stripe Session → email → paste into Sentire → installation-bound
activation → offline use. Recovery at `/license/` resends the original credential.

The selected hosted backend is the companion app’s `commerce/cloudflare` Worker,
using D1, Resend HTTPS and Ed25519/Web Crypto. It serves these built website assets
on the same origin as checkout, recovery and feedback. `npm run build` remains a
static website build; cloud assembly is performed from the Worker project.

The backend validates the configured catalog Price ID and amount. It supports
Stripe promotion codes including verified 100%-off orders. Browser redirects are
not payment proof. Signed webhook verification, server retrieval, idempotent
issuance/outbox and atomic two-slot claims are preserved. Tax/shipping additions
require an explicit implementation/review before enabling those Stripe options.

The live Price is configured server-side. Secret API/webhook/signing/Resend keys
belong only in Worker Secrets, never website variables or GitHub desktop builds.
Purchasing is closed by default and download links stay hidden until verified
artifacts are publicly hosted. The local website still proxies to the Flask lab
for development. No cloud resource or live payment is created by site builds.

Setup: `../sentire/docs/CLOUDFLARE_SETUP.md`. Current release gates and private
coupon guidance: `../sentire/docs/RELEASE_READINESS.md`.
