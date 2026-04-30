#!/usr/bin/env node
// ERA-SALES Auto Sync — Jalankan di Mac jam 12:00 WIB
// Download file Melati dari Nextcloud → parse Excel → upload Supabase

const { ImapFlow }    = require('imapflow');
const { simpleParser } = require('mailparser');
const XLSX            = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs              = require('fs');
const path            = require('path');

// ─── CONFIG (baca dari .env di folder ini) ───────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const CONFIG = {
  imap: {
    host:   process.env.IMAP_HOST || 'mail.erajaya.com',
    port:   parseInt(process.env.IMAP_PORT || '993'),
    user:   process.env.IMAP_USER,
    pass:   process.env.IMAP_PASS,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  },
};

const LOB_NAMES      = ['MARDIANSAH', 'ARIS FACHRUDIN', 'ANDI IRAWAN', 'RACHMAT'];
const MELATI_EMAIL   = 'melati.fitriyani@erajaya.com';
const SUBJECT_PREFIX = 'Sales vs Stock B2C Region 5';
const UA             = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36';

// ─── LOGGING ─────────────────────────────────────────────────
const logFile = path.join(__dirname, 'sync.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  log('=== ERA-SALES Sync dimulai ===');

  if (!CONFIG.imap.user || !CONFIG.imap.pass) {
    log('ERROR: IMAP_USER / IMAP_PASS belum diisi di .env'); process.exit(1);
  }
  if (!CONFIG.supabase.url || !CONFIG.supabase.key) {
    log('ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY belum diisi di .env'); process.exit(1);
  }

  // 1. Baca email Melati
  const emailData = await fetchEmailFromImap();
  if (!emailData) { log('Tidak ada email baru. Sync selesai.'); return; }

  const { link, password, periodLabel, subject } = emailData;
  log(`Email: "${subject}"`);
  log(`Link: ${link}`);
  log(`Period: ${periodLabel}`);

  // 2. Download dari Nextcloud (dari Mac langsung — tidak diblokir)
  log('Mendownload file dari Nextcloud...');
  const buffer = await downloadFromNextcloud(link, password);
  log(`File berhasil didownload (${Math.round(buffer.length / 1024)} KB)`);

  // 3. Parse Excel
  log('Memparse Excel...');
  const { records, periodStart, periodEnd, autoLabel } = parseExcelBuffer(buffer, periodLabel);
  log(`Parse selesai: ${records.length} records, period: ${autoLabel}`);

  if (records.length === 0) { log('Tidak ada data untuk diupload.'); return; }

  // 4. Upload ke Supabase
  log('Mengupload ke Supabase...');
  await uploadToSupabase(records, autoLabel, periodStart, periodEnd);
  log(`Upload selesai! ${records.length} records → Dashboard updated.`);
  log('=== Sync BERHASIL ===\n');
}

// ─── FETCH EMAIL VIA IMAP ────────────────────────────────────
async function fetchEmailFromImap() {
  const client = new ImapFlow({
    host:   CONFIG.imap.host,
    port:   CONFIG.imap.port,
    secure: true,
    auth:   { user: CONFIG.imap.user, pass: CONFIG.imap.pass },
    logger: false,
    tls:    { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    log('IMAP terhubung');
    await client.mailboxOpen('INBOX');

    const uids = await client.search({
      from: MELATI_EMAIL, subject: SUBJECT_PREFIX,
    }, { uid: true });

    if (!uids || uids.length === 0) {
      log('Tidak ada email dari Melati'); return null;
    }

    const latestUid = Math.max(...uids);
    log(`Ditemukan ${uids.length} email, UID terbaru: ${latestUid}`);

    const msg    = await client.fetchOne(String(latestUid), { source: true }, { uid: true });
    const parsed = await simpleParser(msg.source);

    const subjectText  = parsed.subject || '';
    const periodeMatch = subjectText.match(/periode\s+(.+)/i);
    const periodLabel  = periodeMatch ? periodeMatch[1].trim() : subjectText;

    const body         = parsed.text || '';
    const salesSection = body.split(/berikut update dashboard/i)[0] || body;
    const linkMatch    = salesSection.match(/Link\s*[:\-]\s*(https?:\/\/[^\s\r\n]+)/i);
    const passMatch    = salesSection.match(/Password\s*[:\-]\s*([^\s\r\n]+)/i);

    if (!linkMatch || !passMatch) {
      log('Gagal ekstrak link/password');
      log('Body sample: ' + body.substring(0, 300));
      return null;
    }

    return {
      link:        linkMatch[1].trim(),
      password:    passMatch[1].trim(),
      periodLabel,
      subject:     subjectText,
    };
  } finally {
    await client.logout().catch(() => {});
  }
}

// ─── DOWNLOAD DARI NEXTCLOUD ─────────────────────────────────
async function downloadFromNextcloud(shareUrl, password) {
  const tokenMatch = shareUrl.match(/\/s\/([^\/\s?#]+)/);
  if (!tokenMatch) throw new Error('URL tidak valid: ' + shareUrl);

  const token   = tokenMatch[1];
  const baseUrl = 'https://drive.erajaya.com';

  log(`Token: ${token}, Password: ***${password.slice(-3)}`);

  // Step 1: GET halaman share → ambil requesttoken CSRF
  let sessionCookie = '';
  let requesttoken  = '';

  const pageRes = await fetch(`${baseUrl}/index.php/s/${token}`, {
    headers: { 'User-Agent': UA }, redirect: 'follow',
  });
  log(`Page GET: ${pageRes.status}`);

  const allCookies = typeof pageRes.headers.getSetCookie === 'function'
    ? pageRes.headers.getSetCookie()
    : [pageRes.headers.get('set-cookie') || ''];
  sessionCookie = allCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');

  const html    = await pageRes.text();
  const rtMatch = html.match(/data-requesttoken="([^"]+)"/);
  if (rtMatch) {
    requesttoken = rtMatch[1];
    log(`requesttoken OK (${requesttoken.length} chars)`);
  }

  // Step 2: Authenticate
  const authRes = await fetch(`${baseUrl}/index.php/s/${token}/authenticate/ajax`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Requesttoken':     requesttoken,
      'User-Agent':       UA,
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    },
    body: `password=${encodeURIComponent(password)}&requesttoken=${encodeURIComponent(requesttoken)}`,
    redirect: 'follow',
  });

  const newCookies = typeof authRes.headers.getSetCookie === 'function'
    ? authRes.headers.getSetCookie()
    : [authRes.headers.get('set-cookie') || ''];
  const newCookie = newCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');
  if (newCookie) sessionCookie = [sessionCookie, newCookie].filter(Boolean).join('; ');

  const authText = await authRes.text();
  log(`Auth: ${authRes.status} — ${authText.substring(0, 80)}`);

  // Step 3: Download
  const dlRes = await fetch(`${baseUrl}/index.php/s/${token}/download`, {
    headers: {
      'User-Agent': UA,
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    },
    redirect: 'follow',
  });

  const ct = dlRes.headers.get('content-type') || '';
  log(`Download: ${dlRes.status}, CT: ${ct}`);

  if (!dlRes.ok || ct.includes('text/html')) {
    throw new Error(`Download gagal: HTTP ${dlRes.status}, CT: ${ct}`);
  }

  return Buffer.from(await dlRes.arrayBuffer());
}

// ─── PARSE EXCEL ─────────────────────────────────────────────
function parseExcelBuffer(buffer, periodLabel) {
  const wb       = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheets: ['SUM R5', 'BY STORE'] });
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SUM R5');
  if (!sheetName) throw new Error('Sheet "SUM R5" tidak ditemukan');

  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  let headerRow = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (raw[i] && raw[i].some(c => c && String(c).toUpperCase().includes('LOB'))) {
      headerRow = i; break;
    }
  }
  if (headerRow === -1) headerRow = 3;

  let autoLabel = periodLabel || '';
  if (!autoLabel) {
    for (let i = 0; i < headerRow; i++) {
      const text = (raw[i] || []).filter(Boolean).join(' ');
      if (text.toLowerCase().includes('april') || text.toLowerCase().includes('periode')) {
        autoLabel = text.trim(); break;
      }
    }
  }

  const headers  = raw[headerRow];
  const dataRows = raw.slice(headerRow + 1);
  const colMap   = mapColumns(headers);

  const records = [];
  let currentLob = null, currentSection = 'tsh', seenBrandTotal = false;

  for (const row of dataRows) {
    if (!row || !row[colMap.name]) continue;
    const name      = String(row[colMap.name]).trim();
    if (!name || name === 'null') continue;
    const upperName = name.toUpperCase();

    if (upperName.startsWith('CHANNEL'))       { currentSection = 'channel'; seenBrandTotal = false; continue; }
    if (upperName.startsWith('BRAND DEVICE'))  { currentSection = 'brand';   seenBrandTotal = false; continue; }
    if (upperName.startsWith('LOB & TSH'))     { currentSection = 'tsh'; continue; }
    if (upperName.includes('TOTAL') || upperName.includes('GRAND')) {
      if (currentSection === 'brand') seenBrandTotal = true; continue;
    }
    if (seenBrandTotal && currentSection === 'brand') { currentSection = 'vas'; seenBrandTotal = false; }

    let rowType, lobName, tshName;
    if (currentSection === 'tsh') {
      const isLob = LOB_NAMES.some(l => upperName.includes(l));
      if (isLob) currentLob = upperName;
      rowType = isLob ? 'LOB' : 'TSH';
      lobName = isLob ? name : currentLob;
      tshName = isLob ? null : name;
    } else {
      rowType = currentSection === 'channel' ? 'CHANNEL' : currentSection === 'brand' ? 'BRAND' : 'VAS';
      lobName = null; tshName = name;
    }

    const dailySales = {};
    for (const [dateKey, colIdx] of Object.entries(colMap.daily || {})) {
      const v = parseNum(row[colIdx]);
      if (v !== null) dailySales[dateKey] = v;
    }

    records.push({
      row_type: rowType, lob_name: lobName, tsh_name: tshName,
      baseline_yoy: parseNum(row[colMap.yoy_base]),
      baseline_mom: parseNum(row[colMap.mom_base]),
      target_april: parseNum(row[colMap.target]),
      daily_sales:  dailySales,
      mtd:          parseNum(row[colMap.mtd]),
      estimate:     parseNum(row[colMap.estimate]),
      ach_yoy:      parseNum(row[colMap.ach_yoy]),
      ach_mom:      parseNum(row[colMap.ach_mom]),
      ach_target:   parseNum(row[colMap.ach_target]),
    });
  }

  // Parse BY STORE sheet
  const storeSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'BY STORE');
  let storeData = null;
  if (storeSheetName) {
    storeData = parseByStoreSheet(wb.Sheets[storeSheetName]);
  }

  const dates = Object.keys(records[0]?.daily_sales || {}).sort();
  const periodStart = dates[0] || null;
  const periodEnd   = dates[dates.length - 1] || null;

  if (storeData) {
    records.forEach(r => { r.stores = storeData[r.tsh_name || r.lob_name] || null; });
  }

  return { records, periodStart, periodEnd, autoLabel };
}

function parseByStoreSheet(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  const result = {};
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (raw[i] && raw[i].some(c => c && String(c).toUpperCase().includes('STORE'))) {
      headerRow = i; break;
    }
  }
  if (headerRow === -1) return result;

  const headers = raw[headerRow];
  const nameIdx = headers.findIndex(h => h && String(h).toUpperCase().includes('TSH'));
  const storeIdx = headers.findIndex(h => h && String(h).toUpperCase().includes('STORE'));
  const mtdIdx  = headers.findIndex(h => h && String(h).toUpperCase().includes('MTD'));
  if (nameIdx === -1 || storeIdx === -1) return result;

  for (const row of raw.slice(headerRow + 1)) {
    if (!row || !row[nameIdx] || !row[storeIdx]) continue;
    const tsh   = String(row[nameIdx]).trim();
    const store = String(row[storeIdx]).trim();
    const mtd   = parseNum(row[mtdIdx]);
    if (!result[tsh]) result[tsh] = [];
    result[tsh].push({ store, mtd });
  }
  return result;
}

function mapColumns(headers) {
  const map = { daily: {} };
  if (!headers) return map;
  headers.forEach((h, i) => {
    if (!h) return;
    const s = String(h).toUpperCase().trim();
    if (s.includes('LOB') || s.includes('TSH') || s.includes('NAME')) map.name = i;
    else if (s.match(/^YOY\s*(BASE|BASELINE|TARGET)?$/)) map.yoy_base = i;
    else if (s.match(/^MOM\s*(BASE|BASELINE|TARGET)?$/)) map.mom_base = i;
    else if (s.match(/^(TARGET|TGT)\s*(APRIL|APR)?$/))  map.target   = i;
    else if (s === 'MTD')    map.mtd      = i;
    else if (s === 'EST' || s === 'ESTIMATE') map.estimate = i;
    else if (s.match(/ACH.*YOY/i) || s.match(/YOY.*ACH/i)) map.ach_yoy    = i;
    else if (s.match(/ACH.*MOM/i) || s.match(/MOM.*ACH/i)) map.ach_mom    = i;
    else if (s.match(/ACH.*TGT/i) || s.match(/TGT.*ACH/i) || s === 'ACH%') map.ach_target = i;
    else {
      // Kolom tanggal: angka 1-31
      const d = parseInt(s);
      if (!isNaN(d) && d >= 1 && d <= 31) {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year  = today.getFullYear();
        const key   = `${year}-${month}-${String(d).padStart(2, '0')}`;
        map.daily[key] = i;
      }
    }
  });
  return map;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

// ─── UPLOAD KE SUPABASE ──────────────────────────────────────
async function uploadToSupabase(records, label, periodStart, periodEnd) {
  const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key);

  // Hapus data lama untuk periode ini
  const { error: delErr } = await supabase
    .from('sales_data')
    .delete()
    .eq('period_label', label);
  if (delErr) log(`Warning delete: ${delErr.message}`);

  // Upload dalam batch 50
  const BATCH = 50;
  let uploaded = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map(r => ({
      ...r,
      period_label: label,
      period_start: periodStart,
      period_end:   periodEnd,
      updated_at:   new Date().toISOString(),
    }));
    const { error } = await supabase.from('sales_data').insert(batch);
    if (error) throw new Error(`Upload batch ${i}: ${error.message}`);
    uploaded += batch.length;
    log(`  Uploaded ${uploaded}/${records.length}`);
  }
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  log(err.stack || '');
  process.exit(1);
});
