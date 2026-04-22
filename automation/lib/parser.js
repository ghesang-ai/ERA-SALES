// Port dari dashboard/js/upload.js — parse Excel SUM R5 + BY STORE ke Node.js
const XLSX = require('xlsx');
const fs = require('fs');

const LOB_NAMES = ['MARDIANSAH', 'ARIS FACHRUDIN', 'ANDI IRAWAN', 'RACHMAT'];

function parseExcel(filePath, filename) {
  const buffer = fs.readFileSync(filePath);

  const wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    sheets: ['SUM R5', 'BY STORE']
  });

  // ─── Sheet SUM R5 ───────────────────────────────────────────
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SUM R5');
  if (!sheetName) throw new Error('Sheet "SUM R5" tidak ditemukan dalam file ini.');

  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  // Temukan baris header (baris yang mengandung "LOB")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i];
    if (row && row.some(cell => cell && String(cell).toUpperCase().includes('LOB'))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) headerRow = 3;

  // Ambil label periode dari baris judul
  let periodLabel = '';
  for (let i = 0; i < headerRow; i++) {
    const row = raw[i];
    if (row) {
      const text = row.filter(Boolean).join(' ');
      if (text.toLowerCase().includes('april') || text.toLowerCase().includes('periode')) {
        periodLabel = text.trim();
        break;
      }
    }
  }

  const headers = raw[headerRow];
  const dataRows = raw.slice(headerRow + 1);
  const colMap = mapColumns(headers);

  const records = [];
  let currentLob = null;
  let currentSection = 'tsh';
  let seenBrandTotal = false;

  for (const row of dataRows) {
    if (!row || !row[colMap.name]) continue;
    const name = String(row[colMap.name]).trim();
    if (!name || name === 'null') continue;

    const upperName = name.toUpperCase();

    // Deteksi pergantian seksi
    if (upperName === 'CHANNEL' || upperName.startsWith('CHANNEL ')) {
      currentSection = 'channel'; seenBrandTotal = false; continue;
    }
    if (upperName === 'BRAND DEVICE' || upperName.startsWith('BRAND DEVICE ')) {
      currentSection = 'brand'; seenBrandTotal = false; continue;
    }
    if (upperName === 'LOB & TSH' || upperName.startsWith('LOB & TSH')) {
      currentSection = 'tsh'; continue;
    }

    // Skip baris total
    if (upperName.includes('TOTAL') || upperName.includes('GRAND')) {
      if (currentSection === 'brand') seenBrandTotal = true;
      continue;
    }
    if (seenBrandTotal && currentSection === 'brand') {
      currentSection = 'vas';
      seenBrandTotal = false;
    }

    // Tentukan row_type
    let rowType, lobName, tshName;
    if (currentSection === 'tsh') {
      const isLob = LOB_NAMES.some(l => upperName.includes(l));
      if (isLob) currentLob = upperName;
      rowType = isLob ? 'LOB' : 'TSH';
      lobName = isLob ? name : currentLob;
      tshName = isLob ? null : name;
    } else {
      rowType  = currentSection === 'channel' ? 'CHANNEL'
               : currentSection === 'brand'   ? 'BRAND'
               : 'VAS';
      lobName  = null;
      tshName  = name;
    }

    // Parse data harian
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

  if (records.length === 0) {
    throw new Error('Tidak ada data yang berhasil dibaca dari sheet "SUM R5".');
  }

  // ─── Sheet BY STORE: ach_april per TSH ──────────────────────
  const tshAchMap = parseByStoreAchievement(wb);

  for (const rec of records) {
    if (rec.row_type === 'TSH') {
      const key = (rec.tsh_name || '').toUpperCase();
      rec.ach_april = tshAchMap[key] != null ? tshAchMap[key] : null;
    }
  }
  for (const rec of records) {
    if (rec.row_type === 'LOB') {
      const tshVals = records
        .filter(r => r.row_type === 'TSH' && r.lob_name === rec.lob_name && r.ach_april != null)
        .map(r => r.ach_april);
      rec.ach_april = tshVals.length > 0
        ? tshVals.reduce((a, b) => a + b, 0) / tshVals.length
        : null;
    }
  }

  // Deteksi periode dari daily_sales keys
  const allDates = records.flatMap(r => Object.keys(r.daily_sales || {})).sort();
  const periodStart = allDates[0] || null;
  const periodEnd   = allDates[allDates.length - 1] || null;
  const autoLabel   = periodLabel || (periodStart ? `Periode ${periodStart} s/d ${periodEnd}` : 'Periode tidak diketahui');

  return { records, periodLabel: autoLabel, periodStart, periodEnd, filename };
}

// ─── Column Mapping ──────────────────────────────────────────
function mapColumns(headers) {
  const map = { daily: {} };
  if (!headers) return map;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    const s = String(h).trim().toLowerCase();

    if      (s.includes('lob') || s.includes('tsh') || s.includes('nama')) map.name = i;
    else if (s.includes('target'))                                           map.target = i;
    else if (s.match(/apr.*2025|2025.*apr|yoy.*base/i))                     map.yoy_base = i;
    else if (s.match(/mar.*2026|2026.*mar|mom.*base/i))                     map.mom_base = i;
    else if (s.match(/mtd/i) && !s.includes('%'))                           map.mtd = i;
    else if (s.match(/est(imasi|imat)?$/i))                                 map.estimate = i;
    else if (s.match(/%.*mtd|mtd.*%|ach.*mtd|mtd.*ach/i))                  map.pct_mtd = i;
    else if (s.match(/%.*est|est.*%|ach.*est|est.*ach/i))                   map.pct_est = i;
    else if (s.match(/^mom$/i))                                              map.mom = i;
    else if (s.match(/^yoy$/i))                                              map.yoy = i;
    else if (s.match(/ytd.*2025|2025.*ytd/i))                               map.ytd_2025 = i;
    else if (s.match(/ytd.*2026|2026.*ytd/i))                               map.ytd_2026 = i;
    else if (s.match(/^ytd$/i))                                              map.ytd_growth = i;

    const dateKey = parseDateHeader(h);
    if (dateKey) map.daily[dateKey] = i;
  }

  return map;
}

function parseDateHeader(val) {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear(), m = val.getMonth() + 1, d = val.getDate();
    if (y >= 2025 && y <= 2027)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return null;
  }

  const s = String(val).trim();

  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

  if (/^\d+$/.test(s)) {
    const n = parseInt(s);
    if (n > 40000 && n < 65000) {
      try {
        const dt = XLSX.SSF.parse_date_code(n);
        if (dt && dt.y >= 2025 && dt.y <= 2027)
          return `${dt.y}-${String(dt.m).padStart(2,'0')}-${String(dt.d).padStart(2,'0')}`;
      } catch(e) {}
    }
    return null;
  }

  const monthMap = {
    jan:1, feb:2, mar:3, apr:4, may:5, mei:5,
    jun:6, jul:7, aug:8, agu:8,
    sep:9, oct:10, okt:10, nov:11, dec:12, des:12
  };

  const dmMon = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/]?(\d{2,4})?$/i);
  if (dmMon) {
    const day = parseInt(dmMon[1]);
    const month = monthMap[dmMon[2].toLowerCase()];
    const rawY = dmMon[3];
    const year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027)
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  const monDm = s.match(/^([A-Za-z]{3})[\s\-\/](\d{1,2})[\s\-\/]?(\d{2,4})?$/i);
  if (monDm) {
    const month = monthMap[monDm[1].toLowerCase()];
    const day = parseInt(monDm[2]);
    const rawY = monDm[3];
    const year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027)
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const y = parseInt(slash[3]);
    if (y >= 2025 && y <= 2027)
      return `${y}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`;
  }

  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const y = parseInt(dash[3]);
    if (y >= 2025 && y <= 2027)
      return `${y}-${dash[1].padStart(2,'0')}-${dash[2].padStart(2,'0')}`;
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

  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const OT_COL  = 409;
  const TSH_COL = 4;

  const tshMap = {};
  for (let i = 3; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const tsh = row[TSH_COL];
    const val = row[OT_COL];
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
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    result[tsh] = avg * 100;
  }
  return result;
}

module.exports = { parseExcel };
