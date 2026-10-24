# Sentire tutorial media provenance

Captured on 2026-10-22 from the actual Sentire application UI at version 0.2.0 using `scripts/capture-tutorial.py` in the website repository.

Every name, date, clinic, threshold, speech result, source report, and backup shown is a fictional tutorial fixture. No personal medical record, uploaded user report, existing user database, production signing key or payment credential was accessed. The source PDF was generated using `sentire/tests/synthetic_report.py`.

The capture process uses a fresh temporary directory, fresh in-memory Ed25519 signing key and process-local verification configuration. The fixture license is not valid in the distributed app. The actual app source and bundled license configuration are unchanged. Temporary workspaces and raw recordings are removed on exit. No purchase was initiated.

Screenshots are actual UI renders, saved as WebP. Videos are actual Playwright UI recordings, transcoded to H.264 MP4, 1280 × 900, 15 fps, silent, with optional English WebVTT descriptions. They are demonstrations of the local desktop interface rendered in a browser for recording, not a claim that a browser edition is available.

The import demonstration intentionally ends at review rather than automatically saving a guessed result. The backup demonstration stops at preview and does not confirm replacement.

Recreate with `../sentire/.venv/bin/python scripts/capture-tutorial.py` from the website repository. Requires local Sentire Python dependencies, Playwright, installed Chromium and ffmpeg. This development helper is not shipped as a website runtime dependency.

The activation screenshot was refreshed on 2026-10-23 using
`sentire/scripts/check-license-portal.py --capture-guide` with isolated fictional
keys/data. It shows the email-verified computer activation workflow. No purchase
was initiated, and the test email was written only to a private temporary preview.

The activation screenshot was refreshed after adding the Field guide sidebar link.
The guide’s import chapter now documents conservative colored bone-symbol detection
and review requirements. The example videos remain fictional demonstrations, not
a guarantee that every source symbol will be recognized.
