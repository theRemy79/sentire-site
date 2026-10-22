# Sentire marketing site

A separate, single-page product site for Sentire, using the app's original teal
wordmark, serif typography, warm paper background and sound-contour artwork.
Built with static HTML, CSS and JavaScript; no npm dependencies or framework.

## Local preview

Requires Node.js 22 or newer.

```sh
cd /home/jwilliams/Projects/sentire-site
npm run dev
```

Open **http://127.0.0.1:8791**. This local mode enables a clearly labeled test
purchase link to the existing Sentire commerce service at **127.0.0.1:8860**.
It does not collect payment details or serve any hearing records.

If the purchase simulator is stopped, start it in a separate terminal:

```sh
cd /home/jwilliams/Projects/sentire
.venv/bin/python -m commerce.server --mode mock
```

The site links to checkout, the purchase service issues the test license, and
the user copies it into Sentire's **License & purchase** screen. Switching the
commerce service to `--mode stripe-test` uses the same website button with actual
Stripe-hosted sandbox Checkout. See [Sentire's setup guide](../sentire/docs/LOCAL_TESTING.md).

To view the public-release behavior with purchasing still marked upcoming:

```sh
PORT=8792 npm run preview
```

Re-run `npm run build` after source edits; the running preview reads the current
`dist/` files. The dev server binds to loopback only. All methods except GET/HEAD
are rejected. Local previews send no-cache and security headers.

## Page contents

- Product-led hero with a real Sentire screenshot.
- Four keyboard-accessible product-tour tabs, with enlarged screenshot dialogs.
- A real exported PDF report, import/review workflow and privacy details.
- $29 USD one-time personal-license pricing and release availability.
- Honest Linux preview / planned Snap Store / future Windows Store status.
- FAQs, Seravio attribution, responsive mobile navigation and no-JavaScript fallbacks.
- Reduced-motion support, local assets and a 1200 × 630 social-sharing image.

No analytics, tracking cookies, external fonts, contact form, account system or
payment secrets are included. This site does not read the app's private data.

## Screenshots

All images show actual Sentire screens populated with **entirely fictional**
Alex Morgan / Example Hearing Centre records. Screenshots are generated in a
temporary workspace, without opening or changing existing app databases.
`public/assets/SCREENSHOTS.md` records their provenance.

To regenerate with the Sentire Python environment (requires Playwright Chromium
and Poppler's pdftoppm):

```sh
../sentire/.venv/bin/python scripts/capture-app.py
npm run build
# Keep the local site running for the social card's assets:
../sentire/.venv/bin/python scripts/capture-site-assets.py
npm run build
```

On this workstation, the installed Chromium is in the Sentire build cache. Prefix
browser commands with:

```sh
export PLAYWRIGHT_BROWSERS_PATH=/home/jwilliams/Projects/sentire/desktop/.cache/playwright
```

## Build and verify

```sh
npm run check
npm run build
../sentire/.venv/bin/python scripts/check-browser.py
```

The browser check expects the local site and commerce simulator to be running.
It covers desktop/tablet/mobile overflow, image loading, keyboard tabs, screenshot
zoom and focus restoration, mobile navigation, FAQs, no-JavaScript behavior, and
opening the simulator. It does not submit a purchase or send messages.

## Preparing a public release

`site.config.json` contains only public configuration:

| Field | Default | Purpose |
| --- | --- | --- |
| `origin` | Empty | Real HTTPS site origin; enables canonical URL, sitemap and indexing. |
| `checkoutUrl` | Empty | HTTPS URL of the production purchase service once ready. |
| `linuxDownloadUrl` | Empty | Verified public Linux download/store URL. |
| `windowsDownloadUrl` | Empty | Verified public Windows download/store URL. |

Until configured, the static build is non-indexable and has no live checkout or
invented Store links. `npm run dev` adds the local `/checkout` redirect only in
its server process; the built `dist/api/config.json` always uses release settings.
The browser also refuses to enable local checkout on a hosted domain.

The output is a standalone `dist/` folder suitable for static hosting. `_headers`
contains the intended CSP and privacy/security headers for compatible hosts;
configure equivalent headers if the selected host does not read that file.
No domain has been assumed and nothing has been published. Confirm the final
name/domain and host, update release copy/terms and actual download availability,
then configure the origin and production purchase service before deploying.

See [STRIPE_INTEGRATION.md](STRIPE_INTEGRATION.md) for the purchase/fulfillment plan.

## Current app and purchase-service integration

The companion app now requires a valid test license and a local profile name.
Its purchase receipt delivers the complete offline activation token and displays
Sentire's internal order ID; new Stripe payment metadata also includes `order_id`.
A local sandbox purchase and activation have been exercised. Production checkout,
license email and customer recovery are still unfinished. The app includes an
operator-only sandbox recovery script; its keys, orders and licenses stay outside
this static website repository.

For actual Stripe sandbox testing, start the companion service with its hidden-input
launcher instead of the mock command above:

```sh
cd ../sentire
.venv/bin/python scripts/start-stripe-sandbox.py
```

Keep Stripe CLI forwarding to `http://127.0.0.1:8860/webhook` running. The website
local preview hands off to that same service; it never receives Stripe secret keys
or hearing records. Public `origin` and `checkoutUrl` remain unconfigured. Existing
website release/FAQ copy needs a release review before public purchasing is enabled.

The existing vector wordmark is `public/assets/sentire-logo.svg`. A matching
**920 × 256 transparent PNG** is available at `public/assets/sentire-logo.png` for
services such as Stripe that do not accept SVG uploads.
