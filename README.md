# Sentire website and field guide

Static HTML/CSS/JavaScript for **Sentire** by Seravio. Intended public domain:
**getsentire.io**. Introductory price: **$14.95 USD, one time**, two computer activations.
No beta labels, free-access bypass or signup are active. Feedback is retained.

## Local preview

Requires Node.js 22+. Run `npm run dev` and open http://127.0.0.1:8791.
The server binds to loopback and proxies `/license/*` and `/community/*` to the
commerce service on port 8860. `/checkout` redirects to that service's local
purchase page. Its modes are mock or Stripe sandbox; no real charges are enabled.
Restart the preview after changes to scripts/serve.mjs. Static edits need a rebuild.

## Pages and configuration

- `/`: product tour, $14.95 pricing, checkout and platform availability.
- `/downloads/`: verified platform links when ready; `/beta/` redirects here.
- `/guide/`: 18 searchable chapters, fictional screenshots and captioned videos,
  including emailed-license activation and recovery.
- `/support/`: text-only feedback, troubleshooting and support contact.
- `/privacy/`, `/terms/`: customer-facing data-flow and personal-license policies;
  review actual operator/hosting and purchase details before publishing.

`site.config.json` contains public URLs only. `origin` enables public canonical
links/indexing. `checkoutUrl` is the real HTTPS service URL once deployed; until
then public checkout stays unavailable. `linuxDownloadUrl` and `windowsDownloadUrl`
remain empty until real tested releases exist. No Stripe/SMTP/private signing key
belongs in this repo. Website price is display metadata; the service fixes 1495
cents and validates retained per-order amounts.

The local site enables an explicitly labeled $14.95 sandbox checkout. Configure
and validate production commerce separately before real sales. A static site alone
cannot issue licenses, recover emails or receive feedback. Public hosting needs
same-origin backend routing with HTTPS and secure session/proxy handling.

## Feedback and email

Forward `support@getsentire.io` through Cloudflare Email Routing to your verified
private inbox; no catch-all or invitation alias is needed. Preserve Resend outgoing
records under mail.getsentire.io. Set `SENTIRE_SUPPORT_NOTIFY_TO` server-side for
operator alerts. Default development delivery is private .eml previews. Feedback
is stored privately even if notification fails. No medical attachments are accepted.
See [launch operations](../sentire/docs/LAUNCH_CHECKLIST.md) and
[licensing/email](../sentire/docs/LICENSING_PORTAL.md).

## Validation and assets

```sh
npm run check
npm run build
PLAYWRIGHT_BROWSERS_PATH=../sentire/desktop/.cache/playwright \
  ../sentire/.venv/bin/python scripts/check-launch.py
PLAYWRIGHT_BROWSERS_PATH=../sentire/desktop/.cache/playwright \
  ../sentire/.venv/bin/python scripts/check-guide.py
```

Browser tests use disposable data and private mail previews, not real Stripe or
external messages. Product-tour checks are in scripts/check-browser.py. Media uses
fictional records; provenance is in public/assets/SCREENSHOTS.md and tutorial/.
The SVG wordmark has a transparent 920×256 PNG at public/assets/sentire-logo.png.
Do not commit private reports, orders, keys or mail previews.

Linux has a live-only release candidate. Windows build execution/acceptance and
public hosting/downloads remain outstanding. Customer builds use public HTTPS
purchase/guide/recovery URLs. Nothing is published or charged by building this website.

## Release preparation — October 26, 2026

Customer copy and tutorial media now match the simplified point-and-click editor.
The source-tools chapter shows selecting an existing point and changing Air/Bone
in its row; it does not ask users to calibrate/crop the source image.

The companion app has a Linux live-only release candidate and a manual Windows
build workflow. Public hosting, live Price ID and Windows acceptance still need
completion. Keep download links hidden until verified artifacts are publicly
hosted. See [release readiness](../sentire/docs/RELEASE_READINESS.md) for production
routes, environment names and private promotion-code setup. Coupon codes are
configured in Stripe and never included in public website copy.

Hosting target confirmed: Cloudflare for both the website and commerce. The Workers/D1/Resend-HTTP backend is implemented and locally validated in the
companion app repository. Deploy staging first using its docs/CLOUDFLARE_SETUP.md;
the Flask reference is not deployed through static Pages settings. Windows will use the companion
repository’s GitHub Actions workflow. See the Cloudflare section of release readiness.
