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
