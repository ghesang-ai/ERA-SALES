// ============================================================
// ERA-SALES DASHBOARD — Excel Upload & Parser (SheetJS)
// ============================================================

let parsedData = null;
let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard: hanya admin
  const user = await requireAdmin();
  if (!user) return;

  document.getElementById('loading-overlay').classList.add('hidden');
  document.getElementById('admin-content').classList.remove('hidden');

  initLogout();
  initDropZone();
  initFileInput();
  initSubmit();
  initUserManagement(user);
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
        sheets: ['SUM R5']  // Hanya baca sheet SUM R5, skip sheet besar lainnya
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

      for (const row of dataRows) {
        if (!row || !row[colMap.name]) continue;
        const name = String(row[colMap.name]).trim();
        if (!name || name === '' || name === 'null') continue;

        // Skip baris subtotal / grand total
        if (name.toUpperCase().includes('TOTAL') || name.toUpperCase().includes('GRAND')) continue;

        const isLob = LOB_NAMES.some(l => name.toUpperCase().includes(l));
        if (isLob) currentLob = name.toUpperCase();

        const rowType = isLob ? 'LOB' : 'TSH';

        // Parse daily sales
        const dailySales = {};
        for (const [dateKey, colIdx] of Object.entries(colMap.daily || {})) {
          const v = parseNum(row[colIdx]);
          if (v !== null) dailySales[dateKey] = v;
        }

        records.push({
          row_type:     rowType,
          lob_name:     isLob ? name : currentLob,
          tsh_name:     isLob ? null : name,
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
  const s = String(val).trim();

  // Format ISO: "2026-04-01"
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

  // Excel date serial number
  if (!isNaN(s) && parseInt(s) > 40000 && parseInt(s) < 60000) {
    try {
      const d = XLSX.SSF.parse_date_code(parseInt(s));
      if (d && d.y > 2020) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } catch(e) {}
  }

  // Format JS Date object atau string tanggal
  try {
    const dt = new Date(val);
    if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2025 && dt.getFullYear() <= 2027) {
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    }
  } catch(e) {}

  // Format M/D/YYYY atau D/M/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const y = slash[3], a = slash[1].padStart(2,'0'), b = slash[2].padStart(2,'0');
    if (parseInt(y) >= 2025) return `${y}-${a}-${b}`;
  }

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

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();

      // 1. Insert upload_history
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

      // 2. Delete data sales lama yang aktif (lewat trigger Supabase, tapi juga cleanup manual)
      const { data: oldUploads } = await supabaseClient
        .from('upload_history')
        .select('id')
        .eq('is_active', false);

      if (oldUploads && oldUploads.length > 0) {
        const oldIds = oldUploads.map(u => u.id);
        await supabaseClient.from('sales_summary').delete().in('upload_id', oldIds);
      }

      // 3. Insert sales_summary rows (batch per 50)
      const rows = parsedData.records.map(r => ({ ...r, upload_id: upload.id }));
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error: insertErr } = await supabaseClient.from('sales_summary').insert(batch);
        if (insertErr) throw new Error('Gagal menyimpan data sales: ' + insertErr.message);
      }

      // Sukses
      document.getElementById('upload-success').classList.remove('hidden');
      document.getElementById('submit-section').classList.add('hidden');
      loadUploadHistory();

    } catch (err) {
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

// ─── ERROR HELPER ────────────────────────────────────────────
function showUploadError(msg) {
  const el = document.getElementById('upload-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
