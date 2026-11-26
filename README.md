<!-- Websites Factory | abdullah fayyaz -->
# Websites Factory

Automated one-page "Starter" websites: **Google Form -> Google Sheet -> human payment check -> Claude Code writes
`tenant.json` -> template engine renders -> CI gates -> Cloudflare Pages `https://<slug>.pages.dev`.**

Zero running cost: free Google tools, GitHub Actions and Cloudflare Pages; no paid AI API (the AI step is Claude Code).

```bash
npm run check          # tests + form-script test + validate + build + QA (Node 22, no dependencies)
node scripts/preview.mjs _example-al-noor-bakery   # http://localhost:4173
```

| Read this | For |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | rules and commands for Claude Code |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | how it fits together and why |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | setup and the daily routine |
| [`docs/SECURITY.md`](docs/SECURITY.md) | threat model and rules |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | phases |

**Keep this repository private** and never commit customer data, payment details or secrets.
