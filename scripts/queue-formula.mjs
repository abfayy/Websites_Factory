#!/usr/bin/env node
// Prints the Google Sheets formula for the "Build_Queue" tab (paste into cell A1 of a new tab named Build_Queue).
// The tab shows ONLY allowlisted columns of payment-VERIFIED + APPROVED/REVISION orders, so the cloud agent
// never reads payment details. Re-run this if you ever add or reorder form questions.
// Author/watermark: abdullah fayyaz
import { buildQueueFormula } from './lib/orders.mjs';
console.log(buildQueueFormula());
