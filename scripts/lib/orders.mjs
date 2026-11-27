// Which Orders-sheet columns may leave the sheet, and which orders are ready to build.
// PRIVACY RULE: payment details and the customer's private e-mail NEVER go into .orders/ or the repo.
// Author/watermark: abdullah fayyaz

/** Allowlist: the only columns copied into .orders/<id>.json (everything else is dropped). */
export const ORDER_PUBLIC_FIELDS = [
  'order_id', 'created_at', 'status', 'payment_status',
  'brand_name', 'niche', 'niche_other', 'city', 'address', 'map_link', 'business_hours',
  'description', 'target_customers', 'usp', 'tagline', 'services_list', 'show_prices',
  'logo_link', 'theme', 'brand_color', 'tone', 'site_language',
  'photos_link', 'stock_photos_ok', 'testimonials', 'faq', 'video_link',
  'whatsapp', 'phone', 'public_email', 'show_contact', 'instagram', 'facebook', 'tiktok', 'linkedin',
  'reference_sites', 'special_notes', 'addons_interest',
  'preferred_subdomain', 'own_domain', 'own_domain_name',
  'subdomain', 'project_name', 'revisions_used', 'qa_notes'
];

/** Columns that must never appear in an exported record (asserted by tests). */
export const ORDER_PRIVATE_FIELDS = [
  'order_email', 'contact_name', 'payer_account', 'transaction_id', 'amount_paid', 'paid_at',
  'payment_method', 'payment_proof_link', 'consent', 'admin_notes'
];

/** Build queue gate: payment verified by a human AND the order approved (or sent back for a revision). */
export function isBuildReady(row) {
  return String(row.payment_status).toUpperCase() === 'VERIFIED'
    && ['APPROVED', 'REVISION'].includes(String(row.status).toUpperCase());
}

export function toOrderRecord(row) {
  const rec = {};
  for (const k of ORDER_PUBLIC_FIELDS) if (k in row) rec[k] = row[k];
  return rec;
}

/**
 * The Orders sheet header row, in order (must equal ORDER_COLUMNS in google/setup-form.gs; a test enforces it).
 * Used to build the Build_Queue formula and to locate columns when the agent writes a status back.
 */
export const ORDERS_SHEET_COLUMNS = [
  "order_id", "created_at", "status", "payment_status", "brand_name", "niche", "niche_other", "city", "address", "map_link", "business_hours", "description", "target_customers", "usp", "tagline", "services_list", "show_prices", "logo_link", "theme", "brand_color", "tone", "site_language", "photos_link", "stock_photos_ok", "testimonials", "faq", "video_link", "contact_name", "whatsapp", "phone", "public_email", "order_email", "show_contact", "instagram", "facebook", "tiktok", "linkedin", "reference_sites", "special_notes", "addons_interest", "preferred_subdomain", "own_domain", "own_domain_name", "payment_method", "payer_account", "transaction_id", "amount_paid", "paid_at", "payment_proof_link", "consent", "subdomain", "project_name", "preview_url", "live_url", "revisions_used", "qa_notes", "admin_notes", "delivered_at", "updated_at"
];

/** The ONLY cells an automated run may write back to the Orders sheet, and the values it may use. */
export const WRITEBACK_FIELDS = ['status', 'project_name', 'qa_notes'];
export const WRITEBACK_STATUSES = ['BUILDING', 'QA_REQUIRED', 'NEEDS_INFO'];

/** 1 -> A, 27 -> AA */
export function columnLetter(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * Google Sheets formula for a "Build_Queue" tab: ONLY the allowlisted columns of orders that are
 * payment VERIFIED and APPROVED/REVISION. The cloud agent reads this tab and never sees payment columns.
 */
export function buildQueueFormula(columns = ORDERS_SHEET_COLUMNS) {
  const idx = (name) => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error('unknown column ' + name);
    return i + 1;
  };
  const select = ORDER_PUBLIC_FIELDS.map((f) => 'Col' + idx(f)).join(', ');
  const where = `Col${idx('payment_status')} = 'VERIFIED' and (Col${idx('status')} = 'APPROVED' or Col${idx('status')} = 'REVISION')`;
  return `=QUERY(Orders!A:${columnLetter(columns.length)}, "select ${select} where ${where}", 1)`;
}
