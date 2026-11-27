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

## Phase 3 - Hands-off bridge (started: see docs/AUTOMATION.md)
- DONE: `Build_Queue` tab + Google Sheets connector + Claude Code cloud scheduled task (twice a day / Run now); status
  write-back (`BUILDING`, `QA_REQUIRED`, `NEEDS_INFO`).
- Next: API trigger so an order is built the moment it is APPROVED (Apps Script `UrlFetchApp` -> routine `/fire`).
- Next: deploy workflow reports the production URL back to the sheet (`live_url`, `DEPLOYED`).
- Auto-merge of clean order PRs with green CI: enabled 2026-11-27 (CLAUDE.md rule 5).

## Phase 4 - Scale
- Cloudflare Pages allows 100 projects per account. Before ~80 customers choose one: (a) second Cloudflare account,
  (b) one multi-tenant Worker serving sites from R2/KV (`slug.yourdomain.com`), (c) paid plan if limits differ by then.
- Custom domains (paid upgrade), paid add-ons (multi-page, SEO/AEO pack), monthly maintenance plan.
- Customer-facing status page and automatic WhatsApp/e-mail notifications.
