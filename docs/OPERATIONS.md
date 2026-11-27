<!-- Websites Factory | abdullah fayyaz -->
# Operations runbook (for Abi)

## One-time setup
1. **Google**: paste `google/setup-form.gs` into a new Apps Script project, edit `CONFIG.PAYMENT_TEXT` and
   `CONFIG.WHATSAPP_SUPPORT`, run `setupAll` once. Delete any half-made Sheets/Forms from failed attempts.
2. **GitHub**: Settings -> Secrets and variables -> Actions -> add `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Pages",
   or custom permission *Account - Cloudflare Pages - Edit*) and `CLOUDFLARE_ACCOUNT_ID`. Type them yourself; never paste them in chat.
3. **GitHub**: make the repository **private** (Settings -> General -> Danger zone). Also enable branch protection on `main`:
   require a pull request and the `CI / check` status.
4. Optional: Settings -> Environments -> `production` -> add yourself as *Required reviewer* for a manual approval before every deploy.

## Daily routine (about 10 minutes, twice a day)
Automatic build setup: see `docs/AUTOMATION.md` (one-time, 15 minutes). After that:
1. **Payments**: open the Orders sheet. For every `NEW`/`PAYMENT_REVIEW` row compare TID, amount (Rs. 972) and date with your
   JazzCash/Easypaisa messages. Match -> `payment_status = VERIFIED`, `status = APPROVED`. No match -> `REJECTED` or `ON_HOLD`.
   Rows flagged `DUPLICATE_TID` need extra care.
2. **Build**: nothing to do. The cloud scheduled task (10:00 and 20:00) picks up every VERIFIED + APPROVED order, builds it and
   opens a pull request; the row becomes `QA_REQUIRED` (or `NEEDS_INFO` with the questions in `qa_notes`).
   In a hurry? claude.ai/code/routines -> your task -> **Run now**.
3. **Review** each PR (a small `tenant.json` diff + green CI). Preview locally if you want: `node scripts/preview.mjs <slug>`.
4. **Merge** -> the *Deploy* workflow publishes the site. Open the run summary: it shows the production address.
5. **Close the loop**: paste the address into `live_url`, set `status = DEPLOYED`, message the customer on WhatsApp/e-mail,
   later `DELIVERED`. Logo/photos that arrive on WhatsApp: save them as `tenants/<slug>/assets/<file>` (max 1 MB each,
   png/jpg/webp), reference them in `tenant.json`, PR again.

Manual fallback (no cloud task): download the Orders tab as CSV and run `/process-orders csv:<path>` in Claude Code.

## Revisions (1 minor revision is included)
Put the change request in `special_notes`, set the row to `REVISION` (the next scheduled run, or **Run now**, picks it up).
The agent edits the existing `tenants/<slug>/tenant.json` and opens a PR. Increase `revisions_used`.

## Rollback / removal
- Bad deploy: revert the PR on GitHub (a new deploy runs) or use Cloudflare dashboard -> Pages -> project -> Deployments -> *Rollback*.
- Customer cancels / non-payment: delete the folder `tenants/<slug>` in a PR (the site stays up until you delete the Pages
  project in the Cloudflare dashboard).

## When something fails
| Symptom | Likely cause | Fix |
| --- | --- | --- |
| CI red on `validate` | tenant.json breaks the schema (message names the field) | edit that field |
| CI red on `qa` | built page violates a rule (message says which) | fix content; never weaken QA |
| Deploy: authentication error | token missing/expired/wrong permission | re-create token, update secret |
| Deploy: project limit | 100 Pages projects reached | see ROADMAP Phase 4 |
| Site looks unstyled | CSP hash mismatch (QA catches it before deploy) | rebuild; do not edit `_headers` by hand |
