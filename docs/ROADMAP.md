<!-- Websites Factory | abdullah fayyaz -->
# Roadmap

## Phase 1 - Foundation (this repository) - DONE when merged
Form + sheet script, schema, engine, QA gate, CI, Cloudflare deploy workflow, Claude Code agent + command, CSV bridge.
Manual steps: export CSV, run `/process-orders`, merge, paste live URL back into the sheet.

## Phase 2 - Pilot and hardening
- 3-5 real orders end to end; measure time per order and revision rate.
- Collect the first 3 niches' copy patterns into `docs/COPY-GUIDE.md`; add niche-specific section defaults.
- Logo/photo intake: standard file naming + a checklist for assets received on WhatsApp.
- GLBGPT MCP for generated hero images (only when the customer allowed stock/AI imagery); store under `assets/`.
- Bilingual (English + Urdu) layout in the engine (today `en`, `ur`, `roman-ur` are single-language).

## Phase 3 - Automation of the sheet bridge
- Apps Script **Orders API** (web app, secret token): `GET queue`, `POST status`. Replaces CSV export and writes
  `BUILDING / QA_REQUIRED / DEPLOYED / live_url` back automatically.
- Claude Code **scheduled task** (about twice a day) that runs `/process-orders` against the API (verify the schedule
  against the current plan limits before relying on it).
- Deploy workflow posts the production URL back to the sheet.

## Phase 4 - Scale
- Cloudflare Pages allows 100 projects per account. Before ~80 customers choose one: (a) second Cloudflare account,
  (b) one multi-tenant Worker serving sites from R2/KV (`slug.yourdomain.com`), (c) paid plan if limits differ by then.
- Custom domains (paid upgrade), paid add-ons (multi-page, SEO/AEO pack), monthly maintenance plan.
- Customer-facing status page and automatic WhatsApp/e-mail notifications.
