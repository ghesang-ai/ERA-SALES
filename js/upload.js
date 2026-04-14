// ============================================================
// ERA-SALES DASHBOARD — Excel Upload & Parser (SheetJS)
// ============================================================

let parsedData = null;
let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loading-overlay').classList.add('hidden');
  document.getElementById('admin-content').classList.remove('hidden');

  initDropZone();
  initFileInput();
  initSubmit();
  loadUploadHistory();
});

// ─── DROP ZONE ──────────────────────────────────────────────
function initDropZone() {
  const zone = document.getElementById('drop-zone');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

function initFileInput() {
  const input = document.getElementById('file-input');
  input.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  document.getElementById('remove-file-btn').addEventListener('click', () => {
    selectedFile = null;
    parsedData = null;
    document.getElementById('file-info').classList.add('hidden');
    document.getElementById('preview-card').classList.add('hidden');
    document.getElementById('submit-section').classList.add('hidden');
    document.getElementById('upload-error').classList.add('hidden');
    document.getElementById('upload-success').classList.add('hidden');
    input.value = '';
  });
}

// ─── FILE HANDLER ────────────────────────────────────────────
function handleFile(file) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    showUploadError('Format file tidak valid. Gunakan file .xlsx atau .xls');
    return;
  }

  selectedFile = file;
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent = sizeMB + ' MB';
  document.getElementById('file-info').classList.remove('hidden');
  document.getElementById('upload-error').classList.add('hidden');
  document.getElementById('upload-success').classList.add('hidden');

  parseExcel(file);
}

// ─── EXCEL PARSER ────────────────────────────────────────────
function parseExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, {
        type: 'array',
        cellDates: true,
        sheets: ['SUM R5', 'BY STORE']
      });

      // Cari sheet "SUM R5"
      const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SUM R5');
      if (!sheetName) {
        showUploadError('Sheet "SUM R5" tidak ditemukan dalam file ini. Pastikan file yang diupload sudah benar.');
        return;
      }

      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

      // Temukan baris header (cari baris yang mengandung "LOB" atau nama kolom)
      let headerRow = -1;
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        const row = raw[i];
        if (row && row.some(cell => cell && String(cell).toUpperCase().includes('LOB'))) {
          headerRow = i;
          break;
        }
      }
      if (headerRow === -1) headerRow = 3; // fallback ke baris ke-4

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

      // Mapping kolom
      const colMap = mapColumns(headers);

      // Parse setiap baris
      const records = [];
      let currentLob = null;
      let currentSection = 'tsh'; // 'tsh', 'channel', 'brand', 'vas'
      let seenBrandTotal = false;

      for (const row of dataRows) {
        if (!row || !row[colMap.name]) continue;
        const name = String(row[colMap.name]).trim();
        if (!name || name === '' || name === 'null') continue;

        const upperName = name.toUpperCase();

        // ── Deteksi pergantian seksi ──────────────────────────
        if (upperName === 'CHANNEL' || upperName.startsWith('CHANNEL ')) {
          currentSection = 'channel'; seenBrandTotal = false; continue;
        }
        if (upperName === 'BRAND DEVICE' || upperName.startsWith('BRAND DEVICE ')) {
          currentSection = 'brand'; seenBrandTotal = false; continue;
        }
        if (upperName === 'LOB & TSH' || upperName.startsWith('LOB & TSH')) {
          currentSection = 'tsh'; continue;
        }

        // ── Skip baris subtotal / grand total ────────────────
        if (upperName.includes('TOTAL') || upperName.includes('GRAND')) {
          if (currentSection === 'brand') seenBrandTotal = true;
          continue;
        }

        // ── Setelah Brand Total → masuk seksi VAS ────────────
        if (seenBrandTotal && currentSection === 'brand') {
          currentSection = 'vas';
          seenBrandTotal = false;
        }

        // ── Tentukan row_type & nama ──────────────────────────
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

        // ── Parse data harian ─────────────────────────────────
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
        showUploadError('Tidak ada data yang berhasil dibaca dari sheet "SUM R5". Periksa format file.');
        return;
      }

      // Baca ach_april dari sheet BY STORE kolom OT, agregasi per TSH
      const tshAchMap = parseByStoreAchievement(wb);

      // Isi ach_april untuk TSH rows
      for (const rec of records) {
        if (rec.row_type === 'TSH') {
          const key = (rec.tsh_name || '').toUpperCase();
          rec.ach_april = tshAchMap[key] != null ? tshAchMap[key] : null;
        }
      }
      // Untuk LOB rows: rata-rata ach_april dari TSH di bawahnya
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

      // Deteksi periode dari daily sales keys
      const allDates = records.flatMap(r => Object.keys(r.daily_sales || {})).sort();
      const periodStart = allDates[0] || null;
      const periodEnd   = allDates[allDates.length - 1] || null;
      const autoLabel   = periodLabel || (periodStart ? `Periode ${periodStart} s/d ${periodEnd}` : 'Periode tidak diketahui');

      parsedData = { records, periodLabel: autoLabel, periodStart, periodEnd, filename: file.name };

      renderPreview(records, autoLabel);

    } catch (err) {
      showUploadError('Gagal membaca file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ─── COLUMN MAPPING ──────────────────────────────────────────
function mapColumns(headers) {
  const map = { daily: {} };
  if (!headers) return map;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    const s = String(h).trim().toLowerCase();

    if (s.includes('lob') || s.includes('tsh') || s.includes('nama')) map.name = i;
    else if (s.includes('target')) map.target = i;
    else if (s.match(/apr.*2025|2025.*apr|yoy.*base/i))  map.yoy_base = i;
    else if (s.match(/mar.*2026|2026.*mar|mom.*base/i))  map.mom_base = i;
    else if (s.match(/mtd/i) && !s.includes('%'))        map.mtd = i;
    else if (s.match(/est(imasi|imat)?$/i))              map.estimate = i;
    else if (s.match(/%.*mtd|mtd.*%|ach.*mtd|mtd.*ach/i)) map.pct_mtd = i;
    else if (s.match(/%.*est|est.*%|ach.*est|est.*ach/i)) map.pct_est = i;
    else if (s === 'mom' || s.match(/^mom$/i))            map.mom = i;
    else if (s === 'yoy' || s.match(/^yoy$/i))            map.yoy = i;
    else if (s.match(/ytd.*2025|2025.*ytd/i))             map.ytd_2025 = i;
    else if (s.match(/ytd.*2026|2026.*ytd/i))             map.ytd_2026 = i;
    else if (s.match(/^ytd$/i))                           map.ytd_growth = i;

    // Deteksi kolom tanggal harian (format: YYYY-MM-DD atau tanggal Excel)
    const dateMatch = parseDateHeader(h);
    if (dateMatch) map.daily[dateMatch] = i;
  }

  return map;
}

function parseDateHeader(val) {
  if (!val) return null;

  // Jika sudah berupa JS Date object (cellDates: true di SheetJS)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear(), m = val.getMonth() + 1, d = val.getDate();
    if (y >= 2025 && y <= 2027) {
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    return null;
  }

  const s = String(val).trim();

  // Format ISO: "2026-04-01"
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

  // Excel date serial number (hanya integer murni, bukan angka kecil 1-31)
  if (/^\d+$/.test(s)) {
    const n = parseInt(s);
    if (n > 40000 && n < 65000) {
      try {
        const d = XLSX.SSF.parse_date_code(n);
        if (d && d.y >= 2025 && d.y <= 2027) {
          return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
        }
      } catch(e) {}
    }
    return null; // Angka kecil (1-31) bukan tanggal lengkap
  }

  // Peta nama bulan (Inggris + Indonesia)
  const monthMap = {
    jan:1, feb:2, mar:3, apr:4, may:5, mei:5,
    jun:6, jul:7, aug:8, agu:8,
    sep:9, oct:10, okt:10, nov:11, dec:12, des:12
  };

  // Format "1-Apr", "1-Apr-26", "01-Apr-2026", "1 Apr", "1 Apr 2026"
  const dmMon = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/]?(\d{2,4})?$/i);
  if (dmMon) {
    const day   = parseInt(dmMon[1]);
    const month = monthMap[dmMon[2].toLowerCase()];
    const rawY  = dmMon[3];
    const year  = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027) {
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Format "Apr-1", "Apr 1", "Apr-01-2026", "Apr/1"
  const monDm = s.match(/^([A-Za-z]{3})[\s\-\/](\d{1,2})[\s\-\/]?(\d{2,4})?$/i);
  if (monDm) {
    const month = monthMap[monDm[1].toLowerCase()];
    const day   = parseInt(monDm[2]);
    const rawY  = monDm[3];
    const year  = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY) : parseInt(rawY)) : new Date().getFullYear();
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2027) {
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Format D/M/YYYY atau M/D/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const y = parseInt(slash[3]);
    if (y >= 2025 && y <= 2027) {
      return `${y}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`;
    }
  }

  // Format D-M-YYYY atau M-D-YYYY
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const y = parseInt(dash[3]);
    if (y >= 2025 && y <= 2027) {
      return `${y}-${dash[1].padStart(2,'0')}-${dash[2].padStart(2,'0')}`;
    }
  }

  // Fallback: coba parse generic
  try {
    const dt = new Date(val);
    if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2025 && dt.getFullYear() <= 2027) {
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    }
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
  // Nilai sudah dalam persen (misal "85.2%") → simpan sebagai 85.2
  const pct = parseFloat(s.replace('%', '').replace(',', '.'));
  if (isNaN(pct)) return null;
  // Jika nilai < 2 dan tidak ada %, kemungkinan desimal (0.852 → 85.2)
  if (!s.includes('%') && Math.abs(pct) <= 2) return pct * 100;
  return pct;
}

// ─── RENDER PREVIEW ──────────────────────────────────────────
function renderPreview(records, periodLabel) {
  document.getElementById('preview-card').classList.remove('hidden');
  document.getElementById('submit-section').classList.remove('hidden');

  const dataRows = records.filter(r => r.row_type === 'LOB' || r.row_type === 'TSH');
  document.getElementById('preview-rows-count').textContent = dataRows.length + ' baris';
  document.getElementById('preview-period').textContent = '📅 ' + periodLabel;

  const tbody = document.getElementById('preview-tbody');
  tbody.innerHTML = '';

  for (const rec of records) {
    const tr = document.createElement('tr');
    if (rec.row_type === 'LOB') tr.className = 'row-lob';
    else tr.style.cssText = '';

    const achClass = achColor(rec.pct_ach_mtd);
    const momClass = trendColor(rec.mom_growth);
    const yoyClass = trendColor(rec.yoy_growth);

    tr.innerHTML = `
      <td>
        ${rec.row_type === 'TSH' ? '<span style="margin-right:0.5rem;opacity:.35;">└</span>' : ''}
        ${rec.tsh_name || rec.lob_name}
      </td>
      <td><span class="badge-${rec.row_type.toLowerCase()}">${rec.row_type}</span></td>
      <td class="col-num">${formatRupiah(rec.target_april)}</td>
      <td class="col-num">${formatRupiah(rec.mtd)}</td>
      <td class="col-pct ${achClass}">${rec.pct_ach_mtd != null ? rec.pct_ach_mtd.toFixed(1) + '%' : '—'}</td>
      <td class="col-num">${formatRupiah(rec.estimate)}</td>
      <td class="col-pct ${momClass}">${rec.mom_growth != null ? (rec.mom_growth >= 0 ? '+' : '') + rec.mom_growth.toFixed(1) + '%' : '—'}</td>
      <td class="col-pct ${yoyClass}">${rec.yoy_growth != null ? (rec.yoy_growth >= 0 ? '+' : '') + rec.yoy_growth.toFixed(1) + '%' : '—'}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ─── SUBMIT ──────────────────────────────────────────────────
function initSubmit() {
  document.getElementById('submit-btn').addEventListener('click', async () => {
    if (!parsedData) return;

    const btn = document.getElementById('submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoad = btn.querySelector('.btn-loading');
    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');
    btn.disabled = true;

    document.getElementById('upload-error').classList.add('hidden');

    let newUploadId = null;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();

      // 1. Ambil daftar upload aktif SEBELUM insert baru (untuk cleanup nanti)
      const { data: previousActive } = await supabaseClient
        .from('upload_history')
        .select('id')
        .eq('is_active', true);
      const previousIds = (previousActive || []).map(u => u.id);

      // 2. Insert upload_history baru
      const { data: upload, error: uploadErr } = await supabaseClient
        .from('upload_history')
        .insert({
          filename:     parsedData.filename,
          period_label: parsedData.periodLabel,
          period_start: parsedData.periodStart,
          period_end:   parsedData.periodEnd,
          uploaded_by:  user.id,
          is_active:    true
        })
        .select()
        .single();

      if (uploadErr) throw new Error('Gagal menyimpan info upload: ' + uploadErr.message);
      newUploadId = upload.id;
      // Trigger Supabase otomatis set is_active=false untuk upload lama

      // 3. Insert sales_summary baru DULU (sebelum hapus data lama)
      const rows = parsedData.records.map(r => ({ ...r, upload_id: upload.id }));
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error: insertErr } = await supabaseClient.from('sales_summary').insert(batch);
        if (insertErr) throw new Error(`Gagal menyimpan data sales (batch ${Math.floor(i/batchSize)+1}): ${insertErr.message}`);
      }

      // 4. Baru hapus data sales lama (hanya setelah insert baru sukses)
      if (previousIds.length > 0) {
        await supabaseClient.from('sales_summary').delete().in('upload_id', previousIds);
      }

      // Sukses
      document.getElementById('upload-success').classList.remove('hidden');
      document.getElementById('submit-section').classList.add('hidden');
      loadUploadHistory();

    } catch (err) {
      // Rollback: hapus upload_history baru jika insert sales gagal
      if (newUploadId) {
        await supabaseClient.from('sales_summary').delete().eq('upload_id', newUploadId);
        await supabaseClient.from('upload_history').delete().eq('id', newUploadId);
        // Aktifkan kembali upload sebelumnya
        const { data: prevUploads } = await supabaseClient
          .from('upload_history')
          .select('id')
          .eq('is_active', false)
          .order('uploaded_at', { ascending: false })
          .limit(1);
        if (prevUploads && prevUploads.length > 0) {
          await supabaseClient.from('upload_history')
            .update({ is_active: true })
            .eq('id', prevUploads[0].id);
        }
      }
      showUploadError(err.message);
    } finally {
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      btn.disabled = false;
    }
  });
}

// ─── UPLOAD HISTORY ──────────────────────────────────────────
async function loadUploadHistory() {
  const { data, error } = await supabaseClient
    .from('upload_history')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(10);

  const container = document.getElementById('upload-history-list');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="empty-text">Belum ada riwayat upload.</p>';
    return;
  }

  container.innerHTML = data.map(u => `
    <div class="history-item">
      <div class="history-dot ${u.is_active ? 'active' : ''}"></div>
      <div class="history-info">
        <div class="history-file">${u.filename}</div>
        <div class="history-meta">
          ${u.period_label} &bull;
          ${new Date(u.uploaded_at).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          ${u.is_active ? ' <strong style="color:var(--success)">• Aktif</strong>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ─── USER MANAGEMENT ─────────────────────────────────────────
function initUserManagement(currentUser) {
  loadUserList();

  const addBtn = document.getElementById('add-user-btn');
  const modal  = document.getElementById('add-user-modal');
  const cancelBtn = document.getElementById('cancel-user-btn');
  const closeOverlay = () => modal.classList.add('hidden');

  addBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  cancelBtn.addEventListener('click', closeOverlay);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeOverlay(); });

  // Tampilkan/sembunyikan field sesuai role
  const roleSelect = document.getElementById('new-user-role');
  const lobGroup   = document.getElementById('lob-select-group');
  const tshGroup   = document.getElementById('tsh-name-group');

  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'admin') {
      lobGroup.classList.add('hidden');
      tshGroup.classList.add('hidden');
    } else if (roleSelect.value === 'lob') {
      lobGroup.classList.remove('hidden');
      tshGroup.classList.add('hidden');
    } else {
      lobGroup.classList.remove('hidden');
      tshGroup.classList.remove('hidden');
    }
  });

  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveNewUser();
  });
}

async function saveNewUser() {
  const btn      = document.getElementById('save-user-btn');
  const btnText  = btn.querySelector('.btn-text');
  const btnLoad  = btn.querySelector('.btn-loading');
  const errorDiv = document.getElementById('add-user-error');

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;
  errorDiv.classList.add('hidden');

  const name  = document.getElementById('new-user-name').value.trim().toUpperCase();
  const email = document.getElementById('new-user-email').value.trim().toLowerCase();
  const role  = document.getElementById('new-user-role').value;
  const lob   = document.getElementById('new-user-lob').value;
  const tsh   = document.getElementById('new-user-tsh').value.trim().toUpperCase() || null;

  try {
    // Kirim magic link ke user baru (Supabase akan buat akun)
    const { error: authErr } = await supabaseClient.auth.admin
      ? supabaseClient.auth.admin.inviteUserByEmail(email)
      : supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: APP_URL + '/auth-callback.html' } });

    // Insert profil (akan di-link saat user pertama kali login)
    // Kita simpan dulu sebagai pending dengan placeholder UUID
    // Setelah user login via magic link, profile mereka akan otomatis terhubung

    // Simpan ke tabel sementara atau langsung ke user_profiles dengan trigger
    // Untuk simplisitas: admin kirim magic link, user login, lalu admin assign role

    // Untuk sekarang: simpan data profil ke local storage admin, tampilkan instruksi
    alert(`Magic link telah dikirim ke ${email}.\n\nSetelah ${name} login pertama kali, kembali ke halaman ini dan refresh untuk assign role mereka.`);

    document.getElementById('add-user-modal').classList.add('hidden');
    document.getElementById('add-user-form').reset();

  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}

async function loadUserList() {
  const { data, error } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .order('role')
    .order('full_name');

  const container = document.getElementById('user-list');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="empty-text">Belum ada user terdaftar.</p>';
    return;
  }

  container.innerHTML = data.map(u => `
    <div class="user-item">
      <div class="user-item-avatar">${getInitials(u.full_name)}</div>
      <div class="user-item-info">
        <div class="user-item-name">${u.full_name}</div>
        <div class="user-item-email">${u.email}</div>
        ${u.lob_name ? `<div style="font-size:0.7rem;color:var(--text-3);margin-top:0.2rem;">LOB: ${u.lob_name}</div>` : ''}
      </div>
      <span class="role-badge ${u.role}">${u.role.toUpperCase()}</span>
    </div>
  `).join('');
}

// ─── BY STORE: Ach April per TSH ─────────────────────────────
// Membaca sheet BY STORE, mengambil kolom OT (index 409, 0-based)
// dan mengagresi rata-rata per TSH sebagai persentase
function parseByStoreAchievement(wb) {
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'BY STORE');
  if (!sheetName || !wb.Sheets[sheetName]) return {};

  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const OT_COL = 409; // Kolom OT (0-based index)
  const TSH_COL = 4;  // Kolom TSH (0-based index)

  // Mulai dari baris ke-4 (index 3) — skip 3 header rows
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

  // Hitung rata-rata dan konversi ke persen
  const result = {};
  for (const [tsh, vals] of Object.entries(tshMap)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    result[tsh] = avg * 100; // 1.15 → 115%
  }
  return result;
}

// ─── ERROR HELPER ────────────────────────────────────────────
function showUploadError(msg) {
  const el = document.getElementById('upload-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
