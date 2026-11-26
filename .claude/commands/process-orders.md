---
description: Process the approved orders from an Orders-sheet CSV export (import, build each site, open PRs)
argument-hint: <path-to-orders.csv>
---
<!-- Websites Factory | abdullah fayyaz -->
Run the order workflow for `$ARGUMENTS`.

1. If no path was given, ask Abi to download the **Orders** tab (File > Download > CSV) and give the path. Stop until then.
2. Run `node scripts/orders-import.mjs "$ARGUMENTS"`. Read `.orders/_queue.json`.
3. Remove orders from the queue that already have a folder `tenants/<slug>/` whose tenant.json has the same `orderId`
   (already built), unless the order status is `REVISION` (then update the existing tenant instead of creating a new one).
4. For each remaining order, one at a time, run the `starter-worker` agent with the order id. Never run two in parallel on the
   same working tree. Return to `main` (clean) between orders.
5. Finish with ONE summary table: order id, brand, slug, PR link, QA result, questions/NEEDS_INFO items.
   Remind Abi: merge the PRs you approve (deploy runs automatically on main), then copy the production URL from the deploy
   summary into the sheet (`live_url`, status DEPLOYED) and message the customer.

Never merge, deploy, edit workflows or touch secrets in this command.
