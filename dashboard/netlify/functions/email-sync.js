// ERA-SALES — Auto Email Sync (Netlify Scheduled Function)
// Jadwal: setiap hari 05:00 UTC = 12:00 WIB
// Alur: IMAP → baca email Melati → download Nextcloud → parse Excel → upload Supabase

const { schedule } = require('@netlify/functions');
const { ImapFlow }  = require('imapflow');
const { simpleParser } = require('mailparser');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// ─── KONSTANTA ───────────────────────────────────────────────
const LOB_NAMES = ['MARDIANSAH', 'ARIS FACHRUDIN', 'ANDI IRAWAN', 'RACHMAT'];
const MELATI_EMAIL   = 'melati.fitriyani@erajaya.com';
const SUBJECT_PREFIX = 'Sales vs Stock B2C Region 5';

// ─── MAIN HANDLER ────────────────────────────────────────────
const handler = async (event) => {
  const log = [];
  try {
    log.push(`[${new Date().toISOString()}] Email sync dimulai`);

    // 1. Baca email dari IMAP
    const emailData = await fetchEmailFromImap(log);
    if (!emailData) {
      log.push('Tidak ada email baru dari Melati. Sync dibatalkan.');
      return { statusCode: 200, body: JSON.stringify({ status: 'no_email', log }) };
    }

    const { link, password, periodLabel, subject } = emailData;
    log.push(`Email ditemukan: "${subject}"`);
    log.push(`Link: ${link}`);
    log.push(`Period: ${periodLabel}`);

    // 2. Download file Excel dari Nextcloud
    log.push('Mendownload file dari Nextcloud...');
    const excelBuffer = await downloadFromNextcloud(link, password, log);
    log.push(`File berhasil didownload (${Math.round(excelBuffer.length / 1024)} KB)`);

    // 3. Parse Excel (logic sama persis dengan upload.js)
    log.push('Memparse Excel...');
    const { records, periodStart, periodEnd, autoLabel } = parseExcelBuffer(excelBuffer, periodLabel, log);
    log.push(`Berhasil parse ${records.length} records`);

    if (records.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ status: 'parse_empty', log }) };
    }

    // 4. Upload ke Supabase
    log.push('Mengupload ke Supabase...');
    await uploadToSupabase(records, autoLabel, periodStart, periodEnd, log);
    log.push('Upload selesai! Dashboard sudah terupdate.');

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', records: records.length, period: autoLabel, log }),
    };

  } catch (err) {
    log.push(`ERROR: ${err.message}`);
    console.error('[email-sync] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', error: err.message, log }),
    };
  }
};

// ─── FETCH EMAIL VIA IMAP ────────────────────────────────────
async function fetchEmailFromImap(log) {
  const client = new ImapFlow({
    host:   process.env.IMAP_HOST || 'mail.erajaya.com',
    port:   parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS,
    },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    log.push('IMAP terhubung ke mail.erajaya.com');

    await client.mailboxOpen('INBOX');

    // Cari email dari Melati dengan subject Sales vs Stock
    const uids = await client.search({
      from: MELATI_EMAIL,
      subject: SUBJECT_PREFIX,
    }, { uid: true });

    if (!uids || uids.length === 0) {
      log.push('Tidak ada email dari Melati dengan subject tersebut');
      return null;
    }

    // Ambil email terbaru (UID tertinggi)
    const latestUid = Math.max(...uids);
    log.push(`Ditemukan ${uids.length} email, mengambil UID terbaru: ${latestUid}`);

    const msg = await client.fetchOne(String(latestUid), { source: true }, { uid: true });
    const parsed = await simpleParser(msg.source);

    // Gunakan plain text untuk ekstraksi link
    const body = parsed.text || '';

    // Ambil hanya bagian pertama (Sales vs Stock), sebelum bagian kedua (dashboard performance)
    const salesSection = body.split(/berikut update dashboard/i)[0] || body;

    // Ekstrak Link pertama dan Password pertama
    const linkMatch = salesSection.match(/Link\s*[:\-]\s*(https?:\/\/[^\s\r\n]+)/i);
    const passMatch = salesSection.match(/Password\s*[:\-]\s*([^\s\r\n]+)/i);

    if (!linkMatch || !passMatch) {
      log.push('Gagal ekstrak link/password dari email');
      log.push('Body sample: ' + body.substring(0, 300));
      return null;
    }

    // Ekstrak periode dari subject: "Sales vs Stock B2C Region 5 periode 01 - 29 April 2026"
    const subjectText = parsed.subject || '';
    const periodeMatch = subjectText.match(/periode\s+(.+)/i);
    const periodLabel = periodeMatch ? periodeMatch[1].trim() : subjectText;

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
async function downloadFromNextcloud(shareUrl, password, log) {
  const tokenMatch = shareUrl.match(/\/s\/([^\/\s?#]+)/);
  if (!tokenMatch) throw new Error('URL Nextcloud tidak valid: ' + shareUrl);

  const token   = tokenMatch[1];
  const baseUrl = 'https://drive.erajaya.com';
  log.push(`Token: ${token}, Password: ${password ? '***' + password.slice(-3) : 'KOSONG!'}`);

  // ── Strategy 1: Authenticate dulu via AJAX, lalu download pakai cookie ──
  try {
    log.push('Strategy 1: Nextcloud authenticate + download...');
    const authUrl = `${baseUrl}/index.php/s/${token}/authenticate/ajax`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: `password=${encodeURIComponent(password)}&requesttoken=`,
      redirect: 'follow',
    });
    log.push(`Auth status: ${authRes.status}`);

    // Kumpulkan semua cookie dari response
    const rawCookies = authRes.headers.raw?.()?.['set-cookie'] || [];
    const cookieStr  = Array.isArray(rawCookies)
      ? rawCookies.map(c => c.split(';')[0]).join('; ')
      : (authRes.headers.get('set-cookie') || '').split(';')[0];

    // Download dengan cookie
    const dlUrl = `${baseUrl}/index.php/s/${token}/download`;
    const dlHeaders = { 'User-Agent': 'Mozilla/5.0' };
    if (cookieStr) dlHeaders['Cookie'] = cookieStr;

    const dlRes = await fetch(dlUrl, { headers: dlHeaders, redirect: 'follow' });
    log.push(`Download status: ${dlRes.status}`);

    if (dlRes.ok) {
      const ct = dlRes.headers.get('content-type') || '';
      if (!ct.includes('text/html')) {
        log.push('Strategy 1 berhasil!');
        return Buffer.from(await dlRes.arrayBuffer());
      }
      log.push(`Strategy 1: content-type tidak valid: ${ct}`);
    }
  } catch (e) {
    log.push(`Strategy 1 error: ${e.message}`);
  }

  // ── Strategy 2: WebDAV Basic Auth (token:password) ──
  try {
    log.push('Strategy 2: WebDAV Basic Auth...');
    const credentials = Buffer.from(`${token}:${password}`).toString('base64');
    const webdavUrl   = `${baseUrl}/public.php/webdav/`;

    // PROPFIND untuk dapat nama file
    const propfind = await fetch(webdavUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization':    `Basic ${credentials}`,
        'Depth':            '1',
        'Content-Type':     'application/xml',
        'OCS-APIREQUEST':   'true',
      },
    });
    log.push(`PROPFIND status: ${propfind.status}`);

    if (propfind.ok) {
      const xml       = await propfind.text();
      const fileMatch = xml.match(/<d:href>[^<]*\/([^<\/]+\.xlsx?)<\/d:href>/i);
      const filename  = fileMatch ? decodeURIComponent(fileMatch[1]) : null;
      const fileUrl   = filename ? `${webdavUrl}${encodeURIComponent(filename)}` : webdavUrl;
      if (filename) log.push(`File WebDAV: ${filename}`);

      const getRes = await fetch(fileUrl, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });
      log.push(`WebDAV GET status: ${getRes.status}`);
      if (getRes.ok) {
        log.push('Strategy 2 berhasil!');
        return Buffer.from(await getRes.arrayBuffer());
      }
    }
  } catch (e) {
    log.push(`Strategy 2 error: ${e.message}`);
  }

  // ── Strategy 3: Direct POST /download dengan password di body ──
  try {
    log.push('Strategy 3: POST /download dengan password...');
    const dlUrl = shareUrl.replace(/\?.*$/, '').replace(/\/$/, '') + '/download';
    const res3  = await fetch(dlUrl, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:     `password=${encodeURIComponent(password)}`,
      redirect: 'follow',
    });
    log.push(`Strategy 3 status: ${res3.status}`);
    if (res3.ok) {
      const ct = res3.headers.get('content-type') || '';
      if (!ct.includes('text/html')) {
        log.push('Strategy 3 berhasil!');
        return Buffer.from(await res3.arrayBuffer());
      }
    }
  } catch (e) {
    log.push(`Strategy 3 error: ${e.message}`);
  }

  throw new Error('Download gagal: semua strategy gagal (WebDAV 403, Auth cookie, POST download)');
}

// ─── PARSE EXCEL (port dari upload.js) ──────────────────────
function parseExcelBuffer(buffer, periodLabel, log) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheets: ['SUM R5', 'BY STORE'] });

  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SUM R5');
  if (!sheetName) throw new Error('Sheet "SUM R5" tidak ditemukan dalam file Excel');

  log.push(`Sheet ditemukan: "${sheetName}"`);

  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  // Temukan baris header (mengandung "LOB")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (raw[i] && raw[i].some(c => c && String(c).toUpperCase().includes('LOB'))) {
      headerRow = i; break;
    }
  }
  if (headerRow === -1) headerRow = 3;
  log.push(`Header row: ${headerRow}`);

  // Ambil label periode dari baris judul (jika belum ada)
  let autoLabel = periodLabel || '';
  if (!autoLabel) {
    for (let i = 0; i < headerRow; i++) {
      const row = raw[i];
      if (row) {
        const text = row.filter(Boolean).join(' ');
        if (text.toLowerCase().includes('april') || text.toLowerCase().includes('periode')) {
          autoLabel = text.trim(); break;
        }
      }
    }
  }

  const headers  = raw[headerRow];
  const dataRows = raw.slice(headerRow + 1);
  const colMap   = mapColumns(headers);

  const records = [];
  let currentLob     = null;
  let currentSection = 'tsh';
  let seenBrandTotal = false;

  for (const row of dataRows) {
    if (!row || !row[colMap.name]) continue;
    const name      = String(row[colMap.name]).trim();
    if (!name || name === 'null') continue;
    const upperName = name.toUpperCase();

    if (upperName === 'CHANNEL' || upperName.startsWith('CHANNEL ')) { currentSection = 'channel'; seenBrandTotal = false; continue; }
    if (upperName === 'BRAND DEVICE' || upperName.startsWith('BRAND DEVICE ')) { currentSection = 'brand'; seenBrandTotal = false; continue; }
    if (upperName === 'LOB & TSH' || upperName.startsWith('LOB & TSH')) { currentSection = 'tsh'; continue; }
    if (upperName.includes('TOTAL') || upperName.includes('GRAND')) {
      if (currentSection === 'brand') seenBrandTotal = true;
      continue;
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
      lobName = null;
      tshName = name;
    }

    const dailySales = {};
    for (const [dateKey, colIdx] of Object.entries(colMap.daily || {})) {
      const v = parseNum(row[colIdx]);
      if (v !== null) dailySales[dateKey] = v;
    }

    records.push({
      row_type:     rowType,
      lob_name:     lobName,
      tsh_name:     tshName,
      baseline_yoy: parseNum(row[colMap.yoy_base]),
      baseline_mom: parseNum(row[colMap.mom_base]),
      target_april: parseNum(row[colMap.target]),
      daily_sales:  dailySales,
      mtd:          parseNum(row[colMap.mtd]),
      estimate:     parseNum(row[colMap.estimate]),
      pct_ach_mtd:  parsePct(row[colMap.pct_mtd]),
      pct_ach_est:  parsePct(row[colMap.pct_est]),
      mom_growth:   parsePct(row[colMap.mom]),
      yoy_growth:   parsePct(row[colMap.yoy]),
      ytd_2025:     parseNum(row[colMap.ytd_2025]),
      ytd_2026:     parseNum(row[colMap.ytd_2026]),
      ytd_growth:   parsePct(row[colMap.ytd_growth]),
    });
  }

  // Ach april dari sheet BY STORE
  const tshAchMap = parseByStoreAchievement(wb);
  for (const rec of records) {
    if (rec.row_type === 'TSH') {
      const key = (rec.tsh_name || '').toUpperCase();
      rec.ach_april = tshAchMap[key] != null ? tshAchMap[key] : null;
    }
  }
  for (const rec of records) {
    if (rec.row_type === 'LOB') {
      const vals = records.filter(r => r.row_type === 'TSH' && r.lob_name === rec.lob_name && r.ach_april != null).map(r => r.ach_april);
      rec.ach_april = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
  }

  // Deteksi tanggal periode
  const allDates   = records.flatMap(r => Object.keys(r.daily_sales || {})).sort();
  const periodStart = allDates[0] || null;
  const periodEnd   = allDates[allDates.length - 1] || null;
  if (!autoLabel) autoLabel = periodStart ? `Periode ${periodStart} s/d ${periodEnd}` : 'Auto Sync';

  log.push(`Period: ${periodStart} → ${periodEnd}`);
  return { records, periodStart, periodEnd, autoLabel };
}

// ─── COLUMN MAPPING (port dari upload.js) ───────────────────
function mapColumns(headers) {
  const map = { daily: {} };
  if (!headers) return map;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    const s = String(h).trim().toLowerCase();
    if (s.includes('lob') || s.includes('tsh') || s.includes('nama')) map.name = i;
    else if (s.includes('target'))                                       map.target = i;
    else if (s.match(/apr.*2025|2025.*apr|yoy.*base/i))                  map.yoy_base = i;
    else if (s.match(/mar.*2026|2026.*mar|mom.*base/i))                  map.mom_base = i;
    else if (s.match(/mtd/i) && !s.includes('%'))                        map.mtd = i;
    else if (s.match(/est(imasi|imat)?$/i))                              map.estimate = i;
    else if (s.match(/%.*mtd|mtd.*%|ach.*mtd|mtd.*ach/i))               map.pct_mtd = i;
    else if (s.match(/%.*est|est.*%|ach.*est|est.*ach/i))               map.pct_est = i;
    else if (s.match(/^mom$/i))                                          map.mom = i;
    else if (s.match(/^yoy$/i))                                          map.yoy = i;
    else if (s.match(/ytd.*2025|2025.*ytd/i))                            map.ytd_2025 = i;
    else if (s.match(/ytd.*2026|2026.*ytd/i))                            map.ytd_2026 = i;
    else if (s.match(/^ytd$/i))                                          map.ytd_growth = i;
    const dateKey = parseDateHeader(h);
    if (dateKey) map.daily[dateKey] = i;
  }
  return map;
}

function parseDateHeader(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear(), m = val.getMonth() + 1, d = val.getDate();
    if (y >= 2025 && y <= 2027) return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return null;
  }
  const s = String(val).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s);
    if (n > 40000 && n < 65000) {
      try {
        const d = XLSX.SSF.parse_date_code(n);
        if (d && d.y >= 2025 && d.y <= 2027) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
      } catch(e) {}
    }
    return null;
  }
  const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,mei:5,jun:6,jul:7,aug:8,agu:8,sep:9,oct:10,okt:10,nov:11,dec:12,des:12 };
  const dmMon = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/]?(\d{2,4})?$/i);
  if (dmMon) {
    const day = parseInt(dmMon[1]), month = monthMap[dmMon[2].toLowerCase()], rawY = dmMon[3];
    const year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027)
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  const monDm = s.match(/^([A-Za-z]{3})[\s\-\/](\d{1,2})[\s\-\/]?(\d{2,4})?$/i);
  if (monDm) {
    const month = monthMap[monDm[1].toLowerCase()], day = parseInt(monDm[2]), rawY = monDm[3];
    const year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027)
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  try {
    const dt = new Date(val);
    if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2025 && dt.getFullYear() <= 2027)
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  } catch(e) {}
  return null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function parsePct(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim();
  const pct = parseFloat(s.replace('%', '').replace(',', '.'));
  if (isNaN(pct)) return null;
  if (!s.includes('%') && Math.abs(pct) <= 2) return pct * 100;
  return pct;
}

function parseByStoreAchievement(wb) {
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'BY STORE');
  if (!sheetName || !wb.Sheets[sheetName]) return {};
  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const OT_COL = 409, TSH_COL = 4;
  const tshMap = {};
  for (let i = 3; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const tsh = row[TSH_COL], val = row[OT_COL];
    if (!tsh || val === null || val === undefined) continue;
    const tshKey = String(tsh).trim().toUpperCase();
    if (!tshKey || tshKey === 'TSH') continue;
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) continue;
    if (!tshMap[tshKey]) tshMap[tshKey] = [];
    tshMap[tshKey].push(num);
  }
  const result = {};
  for (const [tsh, vals] of Object.entries(tshMap)) {
    result[tsh] = (vals.reduce((a, b) => a + b, 0) / vals.length) * 100;
  }
  return result;
}

// ─── UPLOAD KE SUPABASE ──────────────────────────────────────
async function uploadToSupabase(records, periodLabel, periodStart, periodEnd, log) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  // Ambil daftar upload aktif untuk cleanup nanti
  const { data: prevActive } = await supabase.from('upload_history').select('id').eq('is_active', true);
  const prevIds = (prevActive || []).map(u => u.id);

  // Insert upload_history baru
  const { data: upload, error: uploadErr } = await supabase
    .from('upload_history')
    .insert({
      filename:     `auto_sync_${new Date().toISOString().split('T')[0]}.xlsx`,
      period_label: periodLabel,
      period_start: periodStart,
      period_end:   periodEnd,
      is_active:    true,
    })
    .select()
    .single();

  if (uploadErr) throw new Error('Gagal insert upload_history: ' + uploadErr.message);
  log.push(`Upload history ID: ${upload.id}`);

  // Insert sales_summary baru dalam batch
  const rows      = records.map(r => ({ ...r, upload_id: upload.id }));
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error: err } = await supabase.from('sales_summary').insert(batch);
    if (err) throw new Error(`Gagal insert sales_summary batch ${Math.floor(i/batchSize)+1}: ${err.message}`);
  }
  log.push(`${rows.length} records berhasil diinsert`);

  // Hapus data lama setelah insert baru berhasil
  if (prevIds.length > 0) {
    await supabase.from('sales_summary').delete().in('upload_id', prevIds);
    log.push(`${prevIds.length} upload lama dihapus`);
  }
}

// ─── EXPORT SCHEDULED ────────────────────────────────────────
// Jadwal: 05:00 UTC = 12:00 WIB setiap hari
exports.handler = schedule('0 5 * * *', handler);
