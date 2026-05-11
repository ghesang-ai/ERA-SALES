// ERA-SALES — Sync From File (dipanggil oleh Google Apps Script)
// POST /.netlify/functions/sync-from-file
// Body: { fileBase64: string, periodLabel: string, secret: string }

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const LOB_NAMES = ['MARDIANSAH', 'ARIS FACHRUDIN', 'ANDI IRAWAN', 'RACHMAT'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const log = [];
  try {
    const { fileBase64, periodLabel, secret } = JSON.parse(event.body || '{}');

    // Validasi secret
    if (secret !== process.env.SYNC_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ status: 'unauthorized' }) };
    }

    if (!fileBase64) {
      return { statusCode: 400, body: JSON.stringify({ status: 'error', error: 'fileBase64 diperlukan' }) };
    }

    log.push(`[${new Date().toISOString()}] sync-from-file dimulai, period: ${periodLabel}`);

    const buffer = Buffer.from(fileBase64, 'base64');
    log.push(`File diterima: ${Math.round(buffer.length / 1024)} KB`);

    const { records, periodStart, periodEnd, autoLabel } = parseExcelBuffer(buffer, periodLabel, log);
    log.push(`Parse selesai: ${records.length} records`);

    if (records.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ status: 'parse_empty', log }) };
    }

    await uploadToSupabase(records, autoLabel, periodStart, periodEnd, log);
    log.push('Upload ke Supabase selesai!');

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', records: records.length, period: autoLabel, log }),
    };

  } catch (err) {
    log.push('ERROR: ' + err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', error: err.message, log }),
    };
  }
};

// ─── PARSE EXCEL ─────────────────────────────────────────────
function parseExcelBuffer(buffer, periodLabel, log) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheets: ['SUM R5', 'BY STORE'] });

  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SUM R5');
  if (!sheetName) throw new Error('Sheet "SUM R5" tidak ditemukan');
  log.push(`Sheet: "${sheetName}"`);

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

    if (upperName === 'CHANNEL' || upperName.startsWith('CHANNEL '))       { currentSection = 'channel'; seenBrandTotal = false; continue; }
    if (upperName === 'BRAND DEVICE' || upperName.startsWith('BRAND DEVICE ')) { currentSection = 'brand'; seenBrandTotal = false; continue; }
    if (upperName === 'LOB & TSH' || upperName.startsWith('LOB & TSH'))    { currentSection = 'tsh'; continue; }
    if (upperName.includes('TOTAL') || upperName.includes('GRAND'))        { if (currentSection === 'brand') seenBrandTotal = true; continue; }
    if (seenBrandTotal && currentSection === 'brand')                      { currentSection = 'vas'; seenBrandTotal = false; }

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
      baseline_yoy: parseNum(row[colMap.yoy_base]), baseline_mom: parseNum(row[colMap.mom_base]),
      target_april: parseNum(row[colMap.target]),   daily_sales: dailySales,
      mtd: parseNum(row[colMap.mtd]),               estimate: parseNum(row[colMap.estimate]),
      pct_ach_mtd: parsePct(row[colMap.pct_mtd]),   pct_ach_est: parsePct(row[colMap.pct_est]),
      mom_growth: parsePct(row[colMap.mom]),         yoy_growth: parsePct(row[colMap.yoy]),
      ytd_2025: parseNum(row[colMap.ytd_2025]),      ytd_2026: parseNum(row[colMap.ytd_2026]),
      ytd_growth: parsePct(row[colMap.ytd_growth]),
    });
  }

  const tshAchMap = parseByStoreAchievement(wb);
  for (const rec of records) {
    if (rec.row_type === 'TSH') rec.ach_april = tshAchMap[(rec.tsh_name || '').toUpperCase()] ?? null;
  }
  for (const rec of records) {
    if (rec.row_type === 'LOB') {
      const vals = records.filter(r => r.row_type === 'TSH' && r.lob_name === rec.lob_name && r.ach_april != null).map(r => r.ach_april);
      rec.ach_april = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
  }

  const allDates  = records.flatMap(r => Object.keys(r.daily_sales || {})).sort();
  const periodStart = allDates[0] || null;
  const periodEnd   = allDates[allDates.length - 1] || null;
  if (!autoLabel) autoLabel = periodStart ? `Periode ${periodStart} s/d ${periodEnd}` : 'GAS Sync';

  log.push(`Period: ${periodStart} → ${periodEnd}`);
  return { records, periodStart, periodEnd, autoLabel };
}

function mapColumns(headers) {
  const map = { daily: {} };
  if (!headers) return map;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]; if (!h) continue;
    const s = String(h).trim().toLowerCase();
    if (s.includes('lob') || s.includes('tsh') || s.includes('nama')) map.name = i;
    else if (s.includes('target'))                                      map.target = i;
    else if (s.match(/apr.*2025|2025.*apr|yoy.*base/i))                 map.yoy_base = i;
    else if (s.match(/mar.*2026|2026.*mar|mom.*base/i))                 map.mom_base = i;
    else if (s.match(/mtd/i) && !s.includes('%'))                       map.mtd = i;
    else if (s.match(/est(imasi|imat)?$/i))                             map.estimate = i;
    else if (s.match(/%.*mtd|mtd.*%|ach.*mtd|mtd.*ach/i))              map.pct_mtd = i;
    else if (s.match(/%.*est|est.*%|ach.*est|est.*ach/i))              map.pct_est = i;
    else if (s.match(/^mom$/i))                                         map.mom = i;
    else if (s.match(/^yoy$/i))                                         map.yoy = i;
    else if (s.match(/ytd.*2025|2025.*ytd/i))                           map.ytd_2025 = i;
    else if (s.match(/ytd.*2026|2026.*ytd/i))                           map.ytd_2026 = i;
    else if (s.match(/^ytd$/i))                                         map.ytd_growth = i;
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
      try { const d = XLSX.SSF.parse_date_code(n); if (d && d.y >= 2025 && d.y <= 2027) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; } catch(e) {}
    }
    return null;
  }
  const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,mei:5,jun:6,jul:7,aug:8,agu:8,sep:9,oct:10,okt:10,nov:11,dec:12,des:12 };
  const dmMon = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/]?(\d{2,4})?$/i);
  if (dmMon) {
    const day = parseInt(dmMon[1]), month = monthMap[dmMon[2].toLowerCase()], rawY = dmMon[3];
    const year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027) return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
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
    const row = raw[i]; if (!row) continue;
    const tsh = row[TSH_COL], val = row[OT_COL];
    if (!tsh || val === null || val === undefined) continue;
    const tshKey = String(tsh).trim().toUpperCase();
    if (!tshKey || tshKey === 'TSH') continue;
    const num = parseFloat(val); if (isNaN(num) || num === 0) continue;
    if (!tshMap[tshKey]) tshMap[tshKey] = [];
    tshMap[tshKey].push(num);
  }
  const result = {};
  for (const [tsh, vals] of Object.entries(tshMap)) result[tsh] = (vals.reduce((a,b)=>a+b,0)/vals.length)*100;
  return result;
}

// ─── UPLOAD KE SUPABASE ──────────────────────────────────────
async function uploadToSupabase(records, periodLabel, periodStart, periodEnd, log) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: prevActive } = await supabase.from('upload_history').select('id').eq('is_active', true);
  const prevIds = (prevActive || []).map(u => u.id);

  const { data: upload, error: uploadErr } = await supabase
    .from('upload_history')
    .insert({
      filename:     `gas_sync_${new Date().toISOString().split('T')[0]}.xlsx`,
      period_label: periodLabel, period_start: periodStart, period_end: periodEnd, is_active: true,
    })
    .select().single();

  if (uploadErr) throw new Error('Gagal insert upload_history: ' + uploadErr.message);
  log.push('Upload history ID: ' + upload.id);

  const rows = records.map(r => ({ ...r, upload_id: upload.id }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('sales_summary').insert(rows.slice(i, i + 50));
    if (error) throw new Error('Gagal insert sales_summary: ' + error.message);
  }
  log.push(rows.length + ' records inserted');

  if (prevIds.length > 0) {
    await supabase.from('sales_summary').delete().in('upload_id', prevIds);
    await supabase.from('upload_history').update({ is_active: false }).in('id', prevIds);
    log.push(prevIds.length + ' upload lama dinonaktifkan');
  }
}
