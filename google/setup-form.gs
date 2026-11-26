/**
 * AI Website Factory — Order Form + Orders Sheet setup (Google Apps Script)
 * Author/watermark: abdullah fayyaz
 *
 * HOW TO USE
 *  1. Open https://script.google.com  ->  New project  (name it "Website Factory Setup").
 *  2. Delete the default code, paste this whole file, edit CONFIG below, click Save.
 *  3. Pick function  setupAll  in the toolbar  ->  Run.  Approve the permissions (one time).
 *  4. Open  View > Logs  : you get the Form link, the Sheet link and the edit link.
 *  5. Pick function  addTestOrder  -> Run.  A sample order appears in the Orders sheet.
 *
 * What it creates
 *  - A Google Form (no file-upload questions on purpose -> customers do NOT need a Google login).
 *  - A Google Sheet with:  Orders (clean, fixed columns),  Form Responses 1 (raw log),  Lists,  README.
 *  - A trigger: on every new form response -> Order ID (WEB-0001...), unique subdomain,
 *    duplicate-transaction-ID check, amount check, e-mail to you and to the customer.
 *
 * Run setupAll ONCE. Running it again is blocked so you do not get duplicate forms.
 */

const CONFIG = {
  FORM_TITLE: 'Order Your Website - Starter Package (Rs. 972)',
  SHEET_TITLE: 'Website Factory - Orders',
  PACKAGE_PRICE_TEXT: 'Rs. 972',
  PACKAGE_PRICE_NUM: 972,
  ORDER_PREFIX: 'WEB-',
  ROOT_HOST: 'pages.dev',                       // final URL = <subdomain>.pages.dev
  PAYMENT_TEXT: 'JazzCash / Easypaisa: ACCOUNT TITLE 03XX-XXXXXXX  (EDIT THIS before sharing the form)',
  WHATSAPP_SUPPORT: '03XX-XXXXXXX',          // customers send logo/photos here after submitting
  ADMIN_EMAIL: '',                              // blank = the Google account that runs this script
  SEND_CUSTOMER_EMAIL: true
};

const _WM = 'abdullah fayyaz';

const STATUSES = ['NEW', 'PAYMENT_REVIEW', 'APPROVED', 'BUILDING', 'NEEDS_INFO', 'QA_REQUIRED', 'DEPLOYED', 'DELIVERED', 'REVISION', 'REJECTED', 'ON_HOLD'];
const PAYMENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE_TID'];
const STATUS_COLORS = {
  NEW: '#e8eaed', PAYMENT_REVIEW: '#fff2cc', APPROVED: '#d9ead3', BUILDING: '#cfe2f3', NEEDS_INFO: '#fce5cd',
  QA_REQUIRED: '#d9d2e9', DEPLOYED: '#b6d7a8', DELIVERED: '#93c47d', REVISION: '#ffe599', REJECTED: '#ea9999', ON_HOLD: '#cccccc'
};

const NICHES = ['Restaurant / Cafe / Bakery', 'Salon / Beauty / Spa', 'Retail shop / Boutique', 'Clinic / Pharmacy / Lab', 'Gym / Fitness',
  'School / Academy / Tutor', 'Real estate / Property', 'Construction / Home services', 'Photography / Events', 'Freelancer / Portfolio', 'Other'];
const THEMES = ['Clean & Modern', 'Bold & Dark', 'Warm & Friendly', 'Elegant & Premium', 'Minimal'];
const COLORS = ['Blue', 'Green', 'Red', 'Orange', 'Purple', 'Teal', 'Pink', 'Black & Gold', 'Let the designer choose'];
const TONES = ['Professional', 'Friendly', 'Premium', 'Fun & Youthful'];
const LANGS = ['English', 'Urdu', 'English + Urdu'];
const SHOW_CONTACT = ['WhatsApp button', 'Call button', 'Email', 'Google Maps location', 'Social media links'];
const ADDONS = ['Custom domain (yourbusiness.com)', 'Multi-page website', 'Advanced SEO', 'AEO (AI search visibility)', 'AI chatbot',
  'Booking system', 'Online store (e-commerce)', 'Customer login / signup', 'Monthly maintenance plan'];
const PAY_METHODS = ['JazzCash', 'Easypaisa', 'Bank transfer', 'Other'];

/* ---------------------------------------------------------------------------
 * THE FORM SPEC  (single source of truth: form questions + Orders columns + tenant.json keys)
 * key      -> column name in Orders sheet (and field name for Claude / tenant.json)
 * title    -> question text customers see (must stay unique)
 * ------------------------------------------------------------------------- */
const FIELDS = [
  { section: '1. Business basics', help: 'Starter package: one-page professional website, 5-7 sections, mobile friendly, WhatsApp/contact, basic SEO, free ' + CONFIG.ROOT_HOST + ' address, 1 minor revision, delivery within 24 hours after payment approval and complete details.\n\nNOT included (paid upgrades): online store, customer login, custom backend/database, payment gateway, booking system, AI chatbot.' },
  { key: 'brand_name', title: 'Business / brand name', type: 'text', required: true, help: 'e.g. Al-Noor Bakery' },
  { key: 'niche', title: 'Type of business', type: 'dropdown', required: true, choices: NICHES },
  { key: 'niche_other', title: 'If you chose "Other", tell us your business type', type: 'text' },
  { key: 'city', title: 'City / area', type: 'text', required: true, help: 'e.g. Lahore, Gulberg' },
  { key: 'address', title: 'Full address (optional)', type: 'paragraph' },
  { key: 'map_link', title: 'Google Maps link (optional)', type: 'text', help: 'Google Maps > your shop > Share > Copy link' },
  { key: 'business_hours', title: 'Business hours', type: 'text', help: 'e.g. Mon-Sat 10am-9pm, Sunday closed' },

  { section: '2. About your business', help: 'Yeh text website par use hoga. Jitni detail doge, website utni behtar banegi.' },
  { key: 'description', title: 'Describe your business', type: 'paragraph', required: true, minLen: 40, help: 'What do you do, how long, what makes you good? (at least 2-3 sentences)' },
  { key: 'target_customers', title: 'Who are your customers?', type: 'paragraph', required: true, help: 'e.g. Families, office workers, students in Lahore' },
  { key: 'usp', title: 'What makes you different? (optional)', type: 'paragraph' },
  { key: 'tagline', title: 'Tagline / slogan (optional)', type: 'text', help: 'Agar nahi hai to hum bana denge' },

  { section: '3. Services / products', help: 'Starter website par 3 se 8 items achi tarah dikhte hain.' },
  { key: 'services_list', title: 'List your services or products', type: 'paragraph', required: true, minLen: 10, help: 'One per line:  Name - short description - price (optional)\nExample:\nBirthday cake - 1 kg custom cake - Rs. 2500\nCupcakes box - 6 pieces - Rs. 900' },
  { key: 'show_prices', title: 'Show prices on the website?', type: 'choice', required: true, choices: ['Yes', 'No', 'Only some'] },

  { section: '4. Look & feel', help: 'Logo aur photos form mein upload nahi hote (taake aap ko Google login na karna pare). Form submit karne ke baad WhatsApp par bhejein: ' + CONFIG.WHATSAPP_SUPPORT },
  { key: 'logo_link', title: 'Logo (optional)', type: 'text', help: 'Paste a Google Drive link (sharing: "Anyone with the link"), OR type "WhatsApp" and send it to ' + CONFIG.WHATSAPP_SUPPORT + ', OR type "No logo" and we will make a simple text logo.' },
  { key: 'theme', title: 'Website style', type: 'choice', required: true, choices: THEMES },
  { key: 'brand_color', title: 'Main brand colour', type: 'choice', required: true, choices: COLORS, other: true },
  { key: 'tone', title: 'Tone of the text', type: 'choice', required: true, choices: TONES },
  { key: 'site_language', title: 'Website language', type: 'choice', required: true, choices: LANGS },

  { section: '5. Photos & extra content', help: 'Photos nahi hain? Koi masla nahi - hum free stock photos laga sakte hain.' },
  { key: 'photos_link', title: 'Photos (optional)', type: 'text', help: 'Google Drive / Google Photos link (sharing: "Anyone with the link"), OR type "WhatsApp" and send them to ' + CONFIG.WHATSAPP_SUPPORT },
  { key: 'stock_photos_ok', title: 'If you have no photos, may we use free stock photos?', type: 'choice', required: true, choices: ['Yes', 'No'] },
  { key: 'testimonials', title: 'Customer reviews / testimonials (optional)', type: 'paragraph', help: 'Paste 2-3 real reviews with the customer first name' },
  { key: 'faq', title: 'Common questions your customers ask (optional)', type: 'paragraph' },
  { key: 'video_link', title: 'YouTube / video link (optional)', type: 'text' },

  { section: '6. Contact details', help: 'Yeh details website par public hongi.' },
  { key: 'contact_name', title: 'Your name (contact person)', type: 'text', required: true },
  { key: 'whatsapp', title: 'WhatsApp number', type: 'text', required: true, pattern: '^\\+?[0-9][0-9 \\-]{8,17}[0-9]$', patternMsg: 'Digits only with country code, e.g. +923001234567 or 03001234567', help: 'e.g. +923001234567' },
  { key: 'phone', title: 'Phone number for calls (optional)', type: 'text' },
  { key: 'public_email', title: 'Business email shown on website (optional)', type: 'text', email: true },
  { key: 'order_email', title: 'Your email for order updates', type: 'text', required: true, email: true, help: 'We send your Order ID and the live link here' },
  { key: 'show_contact', title: 'What should the website show?', type: 'checkbox', required: true, choices: SHOW_CONTACT },
  { key: 'instagram', title: 'Instagram link (optional)', type: 'text' },
  { key: 'facebook', title: 'Facebook link (optional)', type: 'text' },
  { key: 'tiktok', title: 'TikTok link (optional)', type: 'text' },
  { key: 'linkedin', title: 'LinkedIn link (optional)', type: 'text' },

  { section: '7. Preferences & upgrades' },
  { key: 'reference_sites', title: 'Websites you like (optional)', type: 'paragraph', help: 'Paste 1-3 links and say what you like about them' },
  { key: 'special_notes', title: 'Anything else we should know? (optional)', type: 'paragraph' },
  { key: 'addons_interest', title: 'Interested in any paid upgrades? (optional)', type: 'checkbox', choices: ADDONS, help: 'Only to prepare a quote. Nothing is charged.' },

  { section: '8. Website address', help: 'Aap ki website ka address hoga  yourname.' + CONFIG.ROOT_HOST },
  { key: 'preferred_subdomain', title: 'Preferred address name (optional)', type: 'text', pattern: '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$', patternMsg: '3-30 characters: small letters, numbers and hyphens only (e.g. al-noor-bakery)', help: 'e.g. al-noor-bakery  ->  al-noor-bakery.' + CONFIG.ROOT_HOST + '   (agar naam le liya gaya ho to hum milta-julta naam denge)' },
  { key: 'own_domain', title: 'Do you already own a domain (like yourbusiness.com)?', type: 'choice', required: true, choices: ['No', 'Yes - I want to connect it (paid upgrade)'] },
  { key: 'own_domain_name', title: 'Your domain name (if yes)', type: 'text' },

  { section: '9. Payment', help: 'Pay ' + CONFIG.PACKAGE_PRICE_TEXT + ' to:\n' + CONFIG.PAYMENT_TEXT + '\n\nPayment ke baad neeche Transaction ID likhein. Work payment verify hone ke baad shuru hota hai.' },
  { key: 'payment_method', title: 'Payment method', type: 'choice', required: true, choices: PAY_METHODS },
  { key: 'payer_account', title: 'Sender account name / number', type: 'text', required: true, help: 'The account you paid from' },
  { key: 'transaction_id', title: 'Transaction ID (TID)', type: 'text', required: true },
  { key: 'amount_paid', title: 'Amount paid (Rs.)', type: 'text', required: true, pattern: '^[0-9][0-9,.]*$', patternMsg: 'Numbers only, e.g. 972' },
  { key: 'paid_at', title: 'Payment date', alt: ['Payment date & time'], type: 'date', required: true, help: 'Pick the date you sent the payment (same as in your JazzCash / Easypaisa message). Time is not needed.' },
  { key: 'payment_proof_link', title: 'Payment screenshot (optional)', type: 'text', help: 'Optional. Type "WhatsApp" and send the screenshot to ' + CONFIG.WHATSAPP_SUPPORT + ' with your business name.' },

  { section: '10. Confirm & submit' },
  { key: 'consent', title: 'Confirmation', type: 'checkbox', required: true, choices: ['I confirm my details are correct, I own the rights to the logo/photos/text I provide, and I understand the Starter package scope (one page, 1 minor revision, no store/login/booking/chatbot).'] }
];

const ADMIN_COLUMNS = ['subdomain', 'project_name', 'preview_url', 'live_url', 'revisions_used', 'qa_notes', 'admin_notes', 'delivered_at', 'updated_at'];
const FIELD_KEYS = FIELDS.filter(function (f) { return f.key; }).map(function (f) { return f.key; });
const ORDER_COLUMNS = ['order_id', 'created_at', 'status', 'payment_status'].concat(FIELD_KEYS).concat(ADMIN_COLUMNS);

const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'mail', 'app', 'dashboard', 'login', 'static', 'assets', 'cdn', 'sites', 'dev', 'staging', 'test'];

/* =========================  SETUP  ========================= */

function setupAll() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SHEET_ID')) {
    Logger.log('Setup was already done. Sheet: https://docs.google.com/spreadsheets/d/' + props.getProperty('SHEET_ID'));
    Logger.log('If you really want a fresh setup, run resetSetupFlag() first (old form/sheet stay in your Drive).');
    return;
  }

  let ss = null;
  let form = null;
  try {
    ss = SpreadsheetApp.create(CONFIG.SHEET_TITLE);
    ss.addDeveloperMetadata('created_by', _WM);          // hidden watermark (not visible in the sheet)

    const orders = ss.getSheets()[0];
    orders.setName('Orders');
    buildOrdersSheet_(orders);
    buildListsSheet_(ss.insertSheet('Lists'));
    buildReadmeSheet_(ss.insertSheet('README'));

    form = FormApp.create(CONFIG.FORM_TITLE);
    buildForm_(form);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());   // adds "Form Responses 1" (raw log)

    ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();

    props.setProperties({ SHEET_ID: ss.getId(), FORM_ID: form.getId(), ORDER_SEQ: '0' });
  } catch (err) {
    // Setup failed half-way: nothing was saved as "done", so you can fix the problem and run setupAll() again.
    // Delete the half-made files below from Google Drive first, otherwise you get duplicates.
    Logger.log('SETUP FAILED: ' + err);
    if (ss) { Logger.log('Half-made Sheet (delete it): ' + ss.getUrl()); }
    if (form) { Logger.log('Half-made Form  (delete it): ' + form.getEditUrl()); }
    throw err;
  }

  Logger.log('DONE.');
  Logger.log('Form (send this to customers): ' + form.getPublishedUrl());
  Logger.log('Form (edit):                    ' + form.getEditUrl());
  Logger.log('Orders sheet:                   ' + ss.getUrl());
  Logger.log('Next: edit CONFIG.PAYMENT_TEXT in the FORM description if you did not before running, then run addTestOrder().');
}

function resetSetupFlag() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('Flag cleared. Delete old triggers in the Triggers (clock) page before running setupAll() again.');
}

function buildForm_(form) {
  form.setDescription('Fill this form to order your professional website. Takes about 10 minutes. ' +
    'Form bharne ke baad payment verify hoti hai aur website 24 ghante ke andar tayyar ho jati hai.');
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage('Shukriya! Your order has been received. We will verify your payment (usually the same day) and then build your website. ' +
    'Your Order ID will arrive by email. Logo/photos: send them on WhatsApp ' + CONFIG.WHATSAPP_SUPPORT + '.');
  FIELDS.forEach(function (f, i) { addField_(form, f, i); });
  return form;
}

function addField_(form, f, idx) {
  if (f.section) {
    if (idx === 0) {
      form.addSectionHeaderItem().setTitle(f.section).setHelpText(f.help || '');
    } else {
      form.addPageBreakItem().setTitle(f.section).setHelpText(f.help || '');
    }
    return;
  }
  let item;
  switch (f.type) {
    case 'text': item = form.addTextItem(); break;
    case 'paragraph': item = form.addParagraphTextItem(); break;
    case 'choice':
      item = form.addMultipleChoiceItem();
      item.setChoiceValues(f.choices);
      if (f.other) { item.showOtherOption(true); }
      break;
    case 'dropdown':
      item = form.addListItem();
      item.setChoiceValues(f.choices);
      break;
    case 'checkbox':
      item = form.addCheckboxItem();
      item.setChoiceValues(f.choices);
      if (f.other) { item.showOtherOption(true); }
      break;
    case 'date': item = form.addDateItem(); break;
    case 'datetime': item = form.addDateTimeItem(); break;
    default: throw new Error('Unknown field type: ' + f.type + ' (' + f.key + ')');
  }
  item.setTitle(f.title);
  item.setHelpText(f.help || '');
  item.setRequired(!!f.required);

  if (f.type === 'text' && (f.email || f.pattern)) {
    const tv = FormApp.createTextValidation();
    if (f.email) { tv.requireTextIsEmail(); tv.setHelpText('Enter a valid email address'); }
    else { tv.requireTextMatchesPattern(f.pattern); tv.setHelpText(f.patternMsg || 'Invalid format'); }
    item.setValidation(tv.build());
  }
  if (f.type === 'paragraph' && f.minLen) {
    const pv = FormApp.createParagraphTextValidation();
    pv.requireTextLengthGreaterThanOrEqualTo(f.minLen);
    pv.setHelpText('Please write at least ' + f.minLen + ' characters');
    item.setValidation(pv.build());
  }
}

function buildOrdersSheet_(sheet) {
  const n = ORDER_COLUMNS.length;
  sheet.getRange(1, 1, 1, n).setValues([ORDER_COLUMNS]).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sheet.getRange(2, 1, 2000, n).setNumberFormat('@');   // plain text: keeps 0300... phone numbers and long TIDs intact
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);

  const statusCol = ORDER_COLUMNS.indexOf('status') + 1;
  const payCol = ORDER_COLUMNS.indexOf('payment_status') + 1;
  sheet.getRange(2, statusCol, 2000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  sheet.getRange(2, payCol, 2000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(PAYMENT_STATUSES, true).setAllowInvalid(false).build());

  const statusRange = sheet.getRange(2, statusCol, 2000, 1);
  const rules = Object.keys(STATUS_COLORS).map(function (s) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(STATUS_COLORS[s]).setRanges([statusRange]).build();
  });
  sheet.setConditionalFormatRules(rules);
  sheet.setColumnWidth(1, 90);
}

function buildListsSheet_(sheet) {
  sheet.getRange(1, 1, 1, 4).setValues([['STATUSES', 'PAYMENT_STATUSES', 'THEMES', 'NICHES']]).setFontWeight('bold');
  const rows = Math.max(STATUSES.length, PAYMENT_STATUSES.length, THEMES.length, NICHES.length);
  const data = [];
  for (let i = 0; i < rows; i++) {
    data.push([STATUSES[i] || '', PAYMENT_STATUSES[i] || '', THEMES[i] || '', NICHES[i] || '']);
  }
  sheet.getRange(2, 1, rows, 4).setValues(data);
}

function buildReadmeSheet_(sheet) {
  const lines = [
    ['Website Factory - how this sheet works'],
    [''],
    ['1. Customer submits the Google Form -> a new row appears in "Orders" (status NEW, payment_status PENDING).'],
    ['2. You check the real JazzCash/Easypaisa transaction (TID + amount). Set payment_status = VERIFIED and status = APPROVED. Never approve from a screenshot alone.'],
    ['3. Approved rows are picked up by the build step (Claude Code) -> status BUILDING -> QA_REQUIRED (preview_url filled).'],
    ['4. You review the preview, set status = DEPLOYED after go-live, then DELIVERED after you send the link (live_url, delivered_at).'],
    ['5. Customer asks for a change -> status REVISION (revisions_used +1). Starter includes 1 minor revision.'],
    ['6. Missing/unclear info -> status NEEDS_INFO and write what is missing in admin_notes.'],
    [''],
    ['Columns up to "consent" come from the form. The last 9 columns (subdomain ... updated_at) are admin/pipeline columns.'],
    ['Do not rename column headers: the pipeline reads them by name.'],
    ['"Form Responses 1" is the raw log from Google Forms. Do not edit it.']
  ];
  sheet.getRange(1, 1, lines.length, 1).setValues(lines);
  sheet.setColumnWidth(1, 900);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
}

/* =========================  ON EVERY NEW ORDER  ========================= */

function onFormSubmit(e) {
  try {
    const ss = (e && e.source) ? e.source : SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    const values = fromNamedValues_((e && e.namedValues) || {});
    processOrder_(ss, values, true);
  } catch (err) {
    try {
      const admin = CONFIG.ADMIN_EMAIL || Session.getEffectiveUser().getEmail();
      MailApp.sendEmail(admin, 'Website Factory: order processing ERROR', String(err && err.stack ? err.stack : err));
    } catch (e2) { /* ignore */ }
    throw err;
  }
}

function fromNamedValues_(nv) {
  const out = {};
  FIELDS.forEach(function (f) {
    if (!f.key) { return; }
    let raw = nv[f.title];
    if (raw === undefined && f.alt) {                       // older form versions used another question title
      for (let k = 0; k < f.alt.length && raw === undefined; k++) { raw = nv[f.alt[k]]; }
    }
    let v = '';
    if (Array.isArray(raw)) { v = raw.filter(function (x) { return x !== ''; }).join(', '); }
    else if (raw !== undefined && raw !== null) { v = String(raw); }
    out[f.key] = v.trim();
  });
  return out;
}

function processOrder_(ss, v, sendEmails) {
  const sheet = ss.getSheetByName('Orders');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let orderId, sub, notes;
  try {
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    const col = {};
    header.forEach(function (h, i) { col[h] = i; });

    const props = PropertiesService.getScriptProperties();
    const seq = Number(props.getProperty('ORDER_SEQ') || '0') + 1;
    props.setProperty('ORDER_SEQ', String(seq));
    orderId = CONFIG.ORDER_PREFIX + ('0000' + seq).slice(-4);

    const norm = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); };
    const tid = norm(v.transaction_id);
    let dup = false;
    const taken = {};
    for (let r = 1; r < data.length; r++) {
      if (tid && norm(data[r][col.transaction_id]) === tid) { dup = true; }
      const s = String(data[r][col.subdomain] || '').toLowerCase();
      if (s) { taken[s] = true; }
    }
    sub = pickSubdomain_(v, taken, seq);

    notes = [];
    if (dup) { notes.push('DUPLICATE transaction ID - check carefully before approving'); }
    const amt = Number(String(v.amount_paid || '').replace(/[^0-9.]/g, ''));
    if (!amt || amt < CONFIG.PACKAGE_PRICE_NUM) {
      notes.push('Amount paid (' + (v.amount_paid || 'blank') + ') is below ' + CONFIG.PACKAGE_PRICE_NUM);
    }
    if (/yes/i.test(v.own_domain)) { notes.push('Wants custom domain (paid upgrade)'); }

    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const rowObj = Object.assign({}, v, {
      order_id: orderId, created_at: now, status: 'NEW', payment_status: dup ? 'DUPLICATE_TID' : 'PENDING',
      subdomain: sub, project_name: sub, preview_url: '', live_url: '', revisions_used: '0',
      qa_notes: '', admin_notes: notes.join(' | '), delivered_at: '', updated_at: now
    });
    const row = header.map(function (h) { return rowObj[h] === undefined ? '' : rowObj[h]; });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  if (sendEmails) { notify_(ss, orderId, v, sub, notes); }
  return orderId;
}

function slugify_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pickSubdomain_(v, taken, seq) {
  let base = slugify_(v.preferred_subdomain) || slugify_(v.brand_name) || ('site-' + seq);
  if (base.length < 3) { base = base + '-site'; }
  base = base.slice(0, 30).replace(/-+$/, '');
  if (RESERVED_SUBDOMAINS.indexOf(base) >= 0) { base = base + '-site'; }
  let s = base;
  let n = 2;
  while (taken[s]) { s = base.slice(0, 26).replace(/-+$/, '') + '-' + n; n++; }
  return s;
}

function notify_(ss, orderId, v, sub, notes) {
  const admin = CONFIG.ADMIN_EMAIL || Session.getEffectiveUser().getEmail();
  try {
    MailApp.sendEmail(admin, 'New website order ' + orderId + ' - ' + (v.brand_name || ''),
      'Order: ' + orderId + '\nBusiness: ' + v.brand_name + ' (' + v.city + ')\nTID: ' + v.transaction_id + '   Amount: ' + v.amount_paid +
      '\nMethod: ' + v.payment_method + '\nSubdomain: ' + sub + '.' + CONFIG.ROOT_HOST +
      (notes && notes.length ? '\n\nFLAGS: ' + notes.join(' | ') : '') +
      '\n\nVerify the payment in your JazzCash/Easypaisa account, then set payment_status = VERIFIED and status = APPROVED.\n' + ss.getUrl());
  } catch (err) { Logger.log('Admin email failed: ' + err); }

  if (CONFIG.SEND_CUSTOMER_EMAIL && v.order_email) {
    try {
      MailApp.sendEmail(v.order_email, 'Your website order ' + orderId + ' is received',
        'Hi ' + (v.contact_name || '') + ',\n\nThank you! We received your order for ' + v.brand_name + '.\n\n' +
        'Order ID: ' + orderId + '\nYour website address will be: https://' + sub + '.' + CONFIG.ROOT_HOST + '\n\n' +
        'Next steps:\n1) We verify your payment (usually the same day).\n2) We build your website - delivery within 24 hours after approval and complete details.\n' +
        '3) You receive the live link by email.\n\nLogo/photos: please send them on WhatsApp ' + CONFIG.WHATSAPP_SUPPORT + ' and mention ' + orderId + '.\n\n' +
        'Shukriya! Order ID sambhal kar rakhein.');
    } catch (err) { Logger.log('Customer email failed: ' + err); }
  }
}

/* =========================  TEST HELPER  ========================= */

/** Adds a fake order (no e-mails sent) so you can see the Orders sheet working. */
function addTestOrder() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  const sample = {
    brand_name: 'Al-Noor Bakery', niche: 'Restaurant / Cafe / Bakery', niche_other: '', city: 'Lahore', address: 'Shop 12, Gulberg III',
    map_link: '', business_hours: 'Mon-Sat 10am-9pm', description: 'Family bakery serving fresh cakes, bread and cookies in Gulberg since 2012.',
    target_customers: 'Families and office workers', usp: 'Fresh daily, custom cakes', tagline: '', services_list: 'Birthday cake - 1kg - Rs. 2500\nCupcakes box - 6 pcs - Rs. 900',
    show_prices: 'Yes', logo_link: 'No logo', theme: 'Warm & Friendly', brand_color: 'Orange', tone: 'Friendly', site_language: 'English',
    photos_link: 'WhatsApp', stock_photos_ok: 'Yes', testimonials: '', faq: '', video_link: '', contact_name: 'Test User', whatsapp: '03001234567',
    phone: '', public_email: '', order_email: 'test@example.com', show_contact: 'WhatsApp button, Call button, Google Maps location',
    instagram: '', facebook: '', tiktok: '', linkedin: '', reference_sites: '', special_notes: '', addons_interest: 'Custom domain (yourbusiness.com)',
    preferred_subdomain: 'al-noor-bakery', own_domain: 'No', own_domain_name: '', payment_method: 'JazzCash', payer_account: '0300-0000000',
    transaction_id: 'TEST' + Date.now(), amount_paid: '972', paid_at: '2026-11-26 14:00', payment_proof_link: 'WhatsApp', consent: 'I confirm'
  };
  const id = processOrder_(ss, sample, false);
  Logger.log('Test order added: ' + id + '  ->  ' + ss.getUrl());
}
