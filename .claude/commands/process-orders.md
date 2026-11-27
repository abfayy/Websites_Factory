---
description: Build every approved, payment-verified order (from the Build_Queue sheet tab or a CSV export) and open one PR per order
argument-hint: sheet:<spreadsheetId>   |   csv:<path-to-orders.csv>
---
<!-- Websites Factory | abdullah fayyaz -->
Run the order workflow for `$ARGUMENTS`. This command is used both by Abi (interactive) and by the scheduled cloud task
(unattended: nobody can answer questions, so choose the safest option, say which, and continue).

## 1. Get the queue (only allowlisted, non-payment fields ever reach the repo workspace)
**Sheet mode** (`sheet:<id>`, used by the cloud task):
1. With the Google Sheets connector, read the whole tab `Build_Queue` of that spreadsheet (`get_values`, range `Build_Queue`).
   That tab is a formula view that already excludes payment details and private e-mail. Do NOT read the `Orders` tab data.
2. Save the returned 2-D array (header row first) as JSON to `/tmp/queue-rows.json` (outside the repo).
3. Run `node scripts/orders-import.mjs --rows /tmp/queue-rows.json`.

**CSV mode** (`csv:<path>` or a bare path): run `node scripts/orders-import.mjs "<path>"`.

If no argument was given, ask Abi (interactive) or stop and report "no source given" (unattended).
Read `.orders/_queue.json`. Empty queue -> report "nothing to build" and stop. Process at most **5 orders per run**
(the rest are picked up next run).

## 2. Skip what is already done
Skip an order whose folder `tenants/<slug>/` already has the same `orderId` **unless** its status is `REVISION`
(then edit that tenant). Skip an order that already has an open pull request from branch `claude/order-<ORDER_ID>`.

## 3. Build, one order at a time
For each order:
1. (Sheet mode) set `status = BUILDING` in the Orders sheet (see "Sheet write-back" below).
2. Run the `starter-worker` agent with the order id. Never two orders in parallel on the same working tree; return to a
   clean `main` between orders.
3. Outcome:
   - PR opened and checks green locally -> `status = QA_REQUIRED`, `project_name = <slug>`, `qa_notes = <PR url>`.
   - Needs customer input -> `status = NEEDS_INFO`, `qa_notes = <the questions, one line>`.
   - Anything failed -> `status = NEEDS_INFO`, `qa_notes = "AUTO-BUILD FAILED: <short reason>"` (never leave an order
     stuck in BUILDING and never retry endlessly: a human looks at it).

## Sheet write-back (sheet mode only; strictly limited)
- Find the row: read `Orders!A:A` (order ids only). Find the column: read the header row `Orders!1:1`.
- Write single cells with `update_values`, **only** the columns `status`, `project_name`, `qa_notes`, and for `status` only
  the values `BUILDING`, `QA_REQUIRED`, `NEEDS_INFO`. Never write any other column or value (never APPROVED, VERIFIED,
  DEPLOYED, REJECTED, never payment columns). Never read other cells of the Orders tab.

## 4. Finish
Final report: ONE table (order id, brand, slug, PR link, result, questions). Remind Abi: review and merge the PRs you
approve (merging deploys automatically), then copy the production address from the deploy run summary into `live_url`
and set `DEPLOYED` / `DELIVERED`, and message the customer.

Never merge, deploy, edit workflows, touch secrets, or push to `main`.
