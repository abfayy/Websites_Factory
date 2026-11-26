// STRICT mock of the Google Apps Script runtime used to test website-factory-setup.gs.
//
// Why strict: the first harness used Proxies that accepted ANY method name, so the typo
// pv.requireLengthGreaterThanOrEqualTo() passed here and then failed on the real Google runtime.
// Now every mock object exposes ONLY methods that were verified in Google's official reference
// (or that already ran successfully on the real runtime). Anything else is "not a function" - exactly
// like the real thing. A negative control (Abi's failing script) must still fail with his exact error.
//
// usage: node google/test-form-script.cjs [path-to-script.gs]   (default: google/setup-form.gs)
const vm = require('vm');
const fs = require('fs');
const assert = require('assert');

const path = require('path');
const os = require('os');
const FIXED = process.argv[2] || path.join(__dirname, 'setup-form.gs');
const SRC = fs.readFileSync(FIXED, 'utf8');
// Negative control is built from the script itself: re-introduce the typo that once broke the real run
// (pv.requireLengthGreaterThanOrEqualTo instead of requireTextLengthGreaterThanOrEqualTo).
const ORIGINAL_BUGGY = path.join(os.tmpdir(), 'setup-form.buggy.gs');
fs.writeFileSync(ORIGINAL_BUGGY, SRC.replace(/requireTextLengthGreaterThanOrEqualTo/g, 'requireLengthGreaterThanOrEqualTo'));
const cfg = (k) => { const m = new RegExp(k + ":\\s*'([^']*)'").exec(SRC); assert.ok(m, 'CONFIG.' + k + ' not found'); return m[1]; };

function makeEnv(opts) {
  opts = opts || {};
  const log = [], mails = [], forms = [], sheetsByName = {}, props = {}, triggers = [];
  const env = { log, mails, forms, sheetsByName, props, triggers, ss: null, lockHeld: false, lockMaxHeld: 0 };

  // ---------- Spreadsheet service ----------
  function makeRange(sh, r, c, nr, nc) {
    nr = nr || 1; nc = nc || 1;
    const rg = {
      setValues(vals) {
        assert.ok(Array.isArray(vals) && vals.length === nr, 'setValues: row count ' + (vals && vals.length) + ' != range rows ' + nr);
        vals.forEach((rv, i) => {
          assert.ok(Array.isArray(rv) && rv.length === nc, 'setValues: column count ' + (rv && rv.length) + ' != range cols ' + nc);
          sh._rows[r - 1 + i] = sh._rows[r - 1 + i] || [];
          rv.forEach((x, j) => { sh._rows[r - 1 + i][c - 1 + j] = x; });
        });
        return rg;
      },
      setValue(v) { sh._rows[r - 1] = sh._rows[r - 1] || []; sh._rows[r - 1][c - 1] = v; return rg; },
      getValues() { return sh._grid().slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)); },
      setFontWeight(w) { assert.ok(typeof w === 'string'); return rg; },
      setFontSize(n) { assert.ok(typeof n === 'number'); return rg; },
      setFontColor(x) { assert.ok(typeof x === 'string'); return rg; },
      setBackground(x) { assert.ok(typeof x === 'string'); return rg; },
      setNumberFormat(f) { assert.ok(typeof f === 'string'); sh._numFmt.push(f); return rg; },
      setDataValidation(rule) { assert.ok(rule && rule.__rule === 'validation', 'setDataValidation needs a built DataValidation'); sh._validations++; return rg; }
    };
    return rg;
  }
  function makeSheet(name) {
    const sh = {
      _rows: [], _numFmt: [], _validations: 0, _cf: 0, name,
      _grid() { const w = Math.max(0, ...sh._rows.map(x => (x || []).length)); return sh._rows.map(x => { const y = (x || []).slice(); while (y.length < w) y.push(''); return y; }); },
      setName(n) { assert.ok(!sheetsByName[n] || sheetsByName[n] === sh, 'sheet name exists: ' + n); delete sheetsByName[sh.name]; sh.name = n; sheetsByName[n] = sh; return sh; },
      getRange(r, c, nr, nc) { return makeRange(sh, r, c, nr, nc); },
      getDataRange() { const g = sh._grid(); return { getValues: () => g.map(x => x.slice()) }; },
      appendRow(row) { assert.ok(Array.isArray(row)); sh._rows.push(row.slice()); },
      getLastRow() { return sh._rows.length; },
      setFrozenRows(n) { assert.ok(Number.isInteger(n)); },
      setFrozenColumns(n) { assert.ok(Number.isInteger(n)); },
      setColumnWidth(c, w) { assert.ok(Number.isInteger(c) && typeof w === 'number'); },
      setConditionalFormatRules(rules) { assert.ok(Array.isArray(rules) && rules.every(x => x.__rule === 'cf')); sh._cf = rules.length; }
    };
    sheetsByName[name] = sh;
    return sh;
  }
  const SpreadsheetApp = {
    create(title) {
      assert.ok(typeof title === 'string');
      const first = makeSheet('Sheet1');
      const ss = {
        _sheets: [first], _meta: null,
        getId: () => 'SS_ID',
        getUrl: () => 'https://docs.google.com/spreadsheets/d/SS_ID',
        addDeveloperMetadata(k, v) { assert.ok(typeof k === 'string' && typeof v === 'string'); ss._meta = [k, v]; },
        getSheets: () => ss._sheets.slice(),
        insertSheet(n) { assert.ok(!sheetsByName[n], 'insertSheet: name exists ' + n); const s = makeSheet(n); ss._sheets.push(s); return s; },
        getSheetByName: (n) => sheetsByName[n] || null
      };
      env.ss = ss;
      return ss;
    },
    openById(id) { assert.strictEqual(id, 'SS_ID'); return env.ss; },
    newDataValidation() {
      let list = null;
      const b = {
        requireValueInList(l, show) { assert.ok(Array.isArray(l) && l.length && typeof show === 'boolean'); list = l; return b; },
        setAllowInvalid(x) { assert.ok(typeof x === 'boolean'); return b; },
        build() { assert.ok(list, 'validation needs a rule'); return { __rule: 'validation' }; }
      };
      return b;
    },
    newConditionalFormatRule() {
      let cond = false, bg = false, ranges = false;
      const b = {
        whenTextEqualTo(t) { assert.ok(typeof t === 'string'); cond = true; return b; },
        setBackground(c) { assert.ok(typeof c === 'string'); bg = true; return b; },
        setRanges(rs) { assert.ok(Array.isArray(rs) && rs.length); ranges = true; return b; },
        build() { assert.ok(cond && bg && ranges, 'cf rule incomplete'); return { __rule: 'cf' }; }
      };
      return b;
    }
  };

  // ---------- Forms service ----------
  function item(kind, allowed) {
    const rec = { kind, title: null, help: null, required: null, choices: null, validation: null, other: false };
    const impl = {
      setTitle(t) { assert.ok(typeof t === 'string' && t.length, 'title must be a non-empty string'); rec.title = t; return it; },
      setHelpText(h) { assert.ok(typeof h === 'string'); rec.help = h; return it; },
      setRequired(r) { assert.ok(typeof r === 'boolean'); rec.required = r; return it; },
      setChoiceValues(c) { assert.ok(Array.isArray(c) && c.length > 0 && c.every(x => typeof x === 'string' && x.length), 'setChoiceValues: empty/invalid array throws on the real runtime'); rec.choices = c; return it; },
      showOtherOption(b) { assert.ok(typeof b === 'boolean'); rec.other = b; return it; },
      setValidation(v) {
        const need = kind === 'TEXT' ? 'text' : 'para';
        assert.ok(v && v.__validation === need, 'setValidation: ' + kind + ' item needs a ' + need + ' validation, got ' + JSON.stringify(v));
        rec.validation = v; return it;
      }
    };
    const it = {};
    allowed.forEach(m => { it[m] = impl[m]; });
    it.__rec = rec;
    return it;
  }
  const KINDS = {
    SECTION: ['setTitle', 'setHelpText'],
    PAGE: ['setTitle', 'setHelpText'],
    TEXT: ['setTitle', 'setHelpText', 'setRequired', 'setValidation'],
    PARAGRAPH: ['setTitle', 'setHelpText', 'setRequired', 'setValidation'],
    CHOICE: ['setTitle', 'setHelpText', 'setRequired', 'setChoiceValues', 'showOtherOption'],
    DROPDOWN: ['setTitle', 'setHelpText', 'setRequired', 'setChoiceValues'],          // ListItem has NO showOtherOption
    CHECKBOX: ['setTitle', 'setHelpText', 'setRequired', 'setChoiceValues', 'showOtherOption'],
    DATE: ['setTitle', 'setHelpText', 'setRequired'],
    DATETIME: ['setTitle', 'setHelpText', 'setRequired']
  };
  const FormApp = {
    DestinationType: { SPREADSHEET: 'SPREADSHEET' },
    create(title) {
      assert.ok(typeof title === 'string');
      const rec = { title, items: [], dest: null, settings: {} };
      const add = (kind) => () => { const it = item(kind, KINDS[kind]); rec.items.push(it.__rec); return it; };
      const setting = (k) => (v) => { rec.settings[k] = v; return f; };
      const f = {
        setDescription: setting('description'), setProgressBar: setting('progressBar'), setShowLinkToRespondAgain: setting('respondAgain'),
        setAllowResponseEdits: setting('allowEdits'), setConfirmationMessage: setting('confirmation'),
        addSectionHeaderItem: add('SECTION'), addPageBreakItem: add('PAGE'), addTextItem: add('TEXT'), addParagraphTextItem: add('PARAGRAPH'),
        addMultipleChoiceItem: add('CHOICE'), addListItem: add('DROPDOWN'), addCheckboxItem: add('CHECKBOX'), addDateItem: add('DATE'), addDateTimeItem: add('DATETIME'),
        setDestination(type, id) {
          assert.strictEqual(type, 'SPREADSHEET'); assert.strictEqual(id, 'SS_ID');
          rec.dest = [type, id];
          const rs = makeSheet('Form Responses 1'); env.ss._sheets.push(rs);   // Google adds the raw-log sheet
          return f;
        },
        getPublishedUrl: () => 'https://docs.google.com/forms/d/e/PUBLISHED/viewform',
        getEditUrl: () => 'https://docs.google.com/forms/d/FORM_ID/edit',
        getId: () => 'FORM_ID'
      };
      forms.push(rec);
      return f;
    },
    createTextValidation() {
      const v = { __validation: 'text' }; const rules = [];
      const b = {
        requireTextIsEmail() { v.email = true; rules.push('email'); return b; },
        requireTextMatchesPattern(p) { assert.ok(typeof p === 'string'); new RegExp(p); v.pattern = p; rules.push('pattern'); return b; },
        setHelpText(h) { assert.ok(typeof h === 'string'); v.help = h; return b; },
        build() { assert.ok(rules.length, 'TextValidation without a rule'); return v; }
      };
      return b;
    },
    createParagraphTextValidation() {
      const v = { __validation: 'para' }; const rules = [];
      const b = {
        requireTextLengthGreaterThanOrEqualTo(n) { assert.ok(Number.isInteger(n) && n > 0); v.min = n; rules.push('min'); return b; },
        setHelpText(h) { assert.ok(typeof h === 'string'); v.help = h; return b; },
        build() { assert.ok(rules.length, 'ParagraphTextValidation without a rule'); return v; }
      };
      if (opts.dropParagraphMin) { delete b.requireTextLengthGreaterThanOrEqualTo; }   // failure-path simulation
      return b;
    }
  };

  // ---------- Script / Properties / Lock / Mail / Utilities / Session ----------
  let ctx;
  const ScriptApp = {
    newTrigger(fn) {
      assert.strictEqual(typeof ctx[fn], 'function', 'trigger handler must exist as a global function: ' + fn);
      return { forSpreadsheet(ss) { assert.strictEqual(ss, env.ss); return { onFormSubmit() { return { create() { triggers.push(fn); return {}; } }; } }; } };
    }
  };
  const PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null),
    setProperty: (k, v) => { assert.ok(typeof v === 'string', 'property values must be strings'); props[k] = v; },
    setProperties: o => { Object.keys(o).forEach(k => assert.ok(typeof o[k] === 'string', 'property ' + k + ' must be a string')); Object.assign(props, o); },
    deleteAllProperties: () => { Object.keys(props).forEach(k => delete props[k]); }
  }) };
  const LockService = { getScriptLock: () => {
    const l = { waitLock(ms) { assert.ok(typeof ms === 'number'); assert.ok(!env.lockHeld, 'lock already held'); env.lockHeld = true; },
                releaseLock() { env.lockHeld = false; } };
    return l;
  } };
  const MailApp = { sendEmail(to, subject, body) {
    assert.ok(typeof to === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to), 'Invalid email: ' + to);
    assert.ok(typeof subject === 'string' && typeof body === 'string');
    mails.push({ to, subject, body });
  } };
  const Utilities = { formatDate(d, tz, fmt) { assert.ok(d instanceof Date && typeof tz === 'string' && fmt === 'yyyy-MM-dd HH:mm'); return d.toISOString().slice(0, 16).replace('T', ' '); } };
  const Session = { getScriptTimeZone: () => 'Asia/Karachi', getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) };

  ctx = {
    console, Logger: { log: (m) => log.push(String(m)) },
    Object, Array, Number, String, Math, Date, Error, JSON, RegExp, Set,
    SpreadsheetApp, FormApp, ScriptApp, PropertiesService, LockService, MailApp, Utilities, Session
  };
  vm.createContext(ctx);
  env.ctx = ctx;
  env.load = (path) => vm.runInContext(fs.readFileSync(path, 'utf8').replace(/\r/g, ''), ctx, { filename: path });
  env.run = (code) => vm.runInContext(code, ctx);
  return env;
}

let passed = 0;
function ok(name) { passed++; console.log('  PASS  ' + name); }

// =====================================================================================
console.log('\n[1] NEGATIVE CONTROL - Abi\'s failing script must fail with the real error (proves the harness is strict)');
if (fs.existsSync(ORIGINAL_BUGGY)) {
  const e0 = makeEnv();
  e0.load(ORIGINAL_BUGGY);
  let msg = '';
  try { e0.run('setupAll()'); } catch (err) { msg = String(err && err.message || err); }
  assert.ok(/requireLengthGreaterThanOrEqualTo is not a function/.test(msg), 'expected the real TypeError, got: ' + msg);
  ok('old script -> "' + msg + '"');
} else {
  console.log('  (skipped: original attachment not found)');
}

// =====================================================================================
console.log('\n[2] FIXED SCRIPT - full setup');
const env = makeEnv();
env.load(FIXED);
env.run('setupAll()');
const form = env.forms[0];
assert.strictEqual(env.forms.length, 1); ok('exactly one form created');
const questions = form.items.filter(i => !['SECTION', 'PAGE'].includes(i.kind));
const titles = questions.map(q => q.title);
assert.strictEqual(new Set(titles).size, titles.length, 'question titles must be unique'); ok('question titles unique (namedValues keys cannot collide)');
assert.deepStrictEqual(env.triggers, ['onFormSubmit']); ok('exactly one onFormSubmit trigger');
assert.deepStrictEqual(form.dest, ['SPREADSHEET', 'SS_ID']); ok('form linked to the sheet');
assert.deepStrictEqual(env.ss._meta, ['created_by', 'abdullah fayyaz']); ok('hidden watermark in sheet developer metadata');
assert.ok(env.props.SHEET_ID === 'SS_ID' && env.props.FORM_ID === 'FORM_ID' && env.props.ORDER_SEQ === '0'); ok('setup flags saved only at the end');
questions.forEach(q => { if (['CHOICE', 'DROPDOWN', 'CHECKBOX'].includes(q.kind)) assert.ok(q.choices && q.choices.length, 'choices for ' + q.title); }); ok('every choice question has choices');
const para = questions.filter(q => q.kind === 'PARAGRAPH' && q.validation);
assert.ok(para.length >= 2 && para.every(q => q.validation.min > 0)); ok('paragraph min-length validations applied: ' + para.map(q => q.title + '>=' + q.validation.min).join(', '));
const pats = questions.filter(q => q.validation && q.validation.pattern).map(q => q.validation.pattern);
pats.forEach(p => assert.ok(!/\(\?[=!<]|\\[1-9]/.test(p), 'regex must be RE2-compatible (no lookaround/backrefs): ' + p)); ok('regex patterns are RE2-compatible: ' + pats.length);
const required = questions.filter(q => q.required).length;
console.log('  info  ' + form.items.length + ' items | ' + questions.length + ' questions | ' + required + ' required | ' + form.items.filter(i => ['SECTION', 'PAGE'].includes(i.kind)).length + ' sections');
const PAY = cfg('PAYMENT_TEXT'), WA = cfg('WHATSAPP_SUPPORT');
assert.ok(JSON.stringify(form.items.map(i => i.help)).includes(JSON.stringify(PAY).slice(1, -1)), 'payment text from CONFIG is on the form'); ok('CONFIG.PAYMENT_TEXT reaches the payment section');
assert.ok(form.items.some(i => (i.help || '').includes(WA)) && (form.settings.confirmation || '').includes(WA)); ok('CONFIG.WHATSAPP_SUPPORT reaches the form');

const orders = env.sheetsByName['Orders'];
assert.ok(orders && env.sheetsByName['Lists'] && env.sheetsByName['README'] && env.sheetsByName['Form Responses 1']); ok('Orders / Lists / README / Form Responses 1 sheets exist');
const header = orders._rows[0];
assert.strictEqual(new Set(header).size, header.length); ok('Orders has ' + header.length + ' unique columns');
assert.ok(orders._validations === 2 && orders._cf === 11 && orders._numFmt.length === 1); ok('status dropdowns (2), colour rules (11), plain-text format applied');
const FIELDS_ = env.run('FIELDS');
FIELDS_.filter(f => f.key).forEach(f => assert.ok(header.includes(f.key), 'column for ' + f.key)); ok('every form field has an Orders column');

// second run must be a no-op
const formsBefore = env.forms.length;
env.run('setupAll()');
assert.strictEqual(env.forms.length, formsBefore); assert.ok(env.log.some(l => /already done/.test(l))); ok('running setupAll() twice does not create duplicates');

// ---- orders
env.run('addTestOrder()');
env.run('addTestOrder()');
const nv = (o) => { const out = {}; FIELDS_.forEach(f => { if (f.key) out[f.title] = [o[f.key] === undefined ? '' : o[f.key]]; }); out['Timestamp'] = ['11/26/2026 15:00:00']; return out; };
const base = { brand_name: 'Test Clinic', niche: 'Clinic / Pharmacy / Lab', city: 'Karachi', description: 'x'.repeat(50), target_customers: 'Patients', services_list: 'Checkup - 30 min', show_prices: 'No', theme: 'Minimal', brand_color: 'Blue', tone: 'Professional', site_language: 'English', stock_photos_ok: 'Yes', contact_name: 'Dr A', whatsapp: '03001234567', order_email: 'a@b.com', show_contact: 'WhatsApp button', own_domain: 'Yes - I want to connect it (paid upgrade)', payment_method: 'Easypaisa', payer_account: '0345', transaction_id: ' tid 999 ', amount_paid: '500', paid_at: '11/26/2026', consent: 'ok' };
env.ctx.__e1 = { source: env.ss, namedValues: nv(base) };
env.run('onFormSubmit(__e1)');
env.ctx.__e2 = { source: env.ss, namedValues: nv(Object.assign({}, base, { brand_name: 'النور', transaction_id: 'TID999', amount_paid: '972' })) };
env.run('onFormSubmit(__e2)');
// a trigger event WITHOUT e.source (falls back to SHEET_ID) and with a checkbox answer joined by comma
env.ctx.__e3 = { namedValues: nv(Object.assign({}, base, { brand_name: 'Zed Gym', transaction_id: 'Z-1', amount_paid: '972', show_contact: 'WhatsApp button, Call button', own_domain: 'No' })) };
env.run('onFormSubmit(__e3)');

const col = (n) => header.indexOf(n);
console.log('\n  ORDERS:');
orders._rows.slice(1).forEach(r => console.log('   ', r[col('order_id')], '|', r[col('status')], '|', r[col('payment_status')], '| sub=' + r[col('subdomain')], '| wa=' + r[col('whatsapp')], '| notes=' + r[col('admin_notes')]));
const r = orders._rows.slice(1);
assert.deepStrictEqual(r.map(x => x[col('order_id')]), ['WEB-0001', 'WEB-0002', 'WEB-0003', 'WEB-0004', 'WEB-0005']); ok('order ids sequential WEB-0001..0005');
assert.strictEqual(r[0][col('subdomain')], 'al-noor-bakery');
assert.strictEqual(r[1][col('subdomain')], 'al-noor-bakery-2'); ok('same subdomain requested twice -> unique (-2)');
assert.strictEqual(r[2][col('subdomain')], 'test-clinic');
assert.strictEqual(r[2][col('payment_status')], 'PENDING');
assert.ok(/below 972/.test(r[2][col('admin_notes')]) && /custom domain/i.test(r[2][col('admin_notes')])); ok('low amount + custom-domain flags');
assert.strictEqual(r[3][col('payment_status')], 'DUPLICATE_TID'); ok('duplicate TID detected despite spaces/case');
assert.strictEqual(r[3][col('subdomain')], 'site-4'); ok('non-latin brand name falls back to site-N');
assert.strictEqual(r[0][col('whatsapp')], '03001234567'); ok('leading zero preserved');
assert.strictEqual(r[4][col('show_contact')], 'WhatsApp button, Call button'); ok('checkbox answers kept; handler works without e.source');
assert.strictEqual(env.mails.length, 6, 'admin+customer mails for the 3 real submissions only'); ok('e-mails: 2 per real order, none for test orders');
assert.strictEqual(env.lockHeld, false); ok('script lock always released');

// payment date: date-only picker (no "Time invalid" error), old title still understood
const payQ = questions.find(q => q.title === 'Payment date');
assert.ok(payQ && payQ.kind === 'DATE' && payQ.required === true); ok('"Payment date" is a required date-only question (no time part)');
assert.ok(!questions.some(q => q.kind === 'DATETIME')); ok('no date+time question left in the form');
assert.strictEqual(r[2][col('paid_at')], '11/26/2026'); ok('paid_at saved from the new question');
const oldNv = nv(Object.assign({}, base, { brand_name: 'Old Form Shop', transaction_id: 'OLD-1', amount_paid: '972' }));
oldNv['Payment date & time'] = ['11/25/2026 10:00']; delete oldNv['Payment date'];
env.ctx.__e4 = { source: env.ss, namedValues: oldNv };
env.run('onFormSubmit(__e4)');
assert.strictEqual(orders._rows[orders._rows.length - 1][col('paid_at')], '11/25/2026 10:00'); ok('answers from the old question title still land in paid_at');

// =====================================================================================
console.log('\n[3] FAILURE PATH - a failing setup must log the half-made files and must NOT mark setup as done');
const envF = makeEnv({ dropParagraphMin: true });
envF.load(FIXED);
let failed = '';
try { envF.run('setupAll()'); } catch (err) { failed = String(err && err.message || err); }
assert.ok(/requireTextLengthGreaterThanOrEqualTo is not a function/.test(failed), 'sabotage should trigger the TypeError, got: ' + failed); ok('simulated Google error is raised: ' + failed);
assert.ok(envF.log.some(l => /Half-made Sheet/.test(l) && /docs\.google\.com\/spreadsheets/.test(l))); ok('log shows the half-made Sheet URL');
assert.ok(envF.log.some(l => /Half-made Form/.test(l) && /docs\.google\.com\/forms/.test(l))); ok('log shows the half-made Form URL');
assert.strictEqual(envF.props.SHEET_ID, undefined); ok('SHEET_ID not saved -> setupAll() can be re-run after cleanup');
assert.strictEqual(envF.triggers.length, 0); ok('no trigger left behind');

console.log('\nALL ' + passed + ' CHECKS PASSED');
