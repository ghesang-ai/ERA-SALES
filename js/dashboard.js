// ============================================================
// ERA-SALES DASHBOARD — Main Dashboard Logic
// ============================================================

let allRecords  = [];
let userProfile = null;
let activeLob   = 'SEMUA';

document.addEventListener('DOMContentLoaded', async () => {
  // Pastikan Supabase client sudah siap
  await new Promise(r => setTimeout(r, 100));

  // Tidak perlu login — dashboard bisa diakses siapa saja
  initBottomNav();
  initDesktopNav();

  await loadDashboardData();
});

// ─── LOAD DATA ───────────────────────────────────────────────
async function loadDashboardData() {
  showLoading(true);

  try {
    // Ambil upload aktif
    const { data: uploads, error: uploadErr } = await supabaseClient
      .from('upload_history')
      .select('*')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (uploadErr || !uploads || uploads.length === 0) {
      showLoading(false);
      showNoData(true);
      return;
    }

    const activeUpload = uploads[0];

    // Ambil data sales untuk upload aktif
    const { data: salesData, error: salesErr } = await supabaseClient
      .from('sales_summary')
      .select('*')
      .eq('upload_id', activeUpload.id)
      .order('row_type')
      .order('lob_name')
      .order('tsh_name');

    if (salesErr || !salesData || salesData.length === 0) {
      showLoading(false);
      showNoData(true);
      return;
    }

    allRecords = salesData;

    // Update header periode
    document.getElementById('header-period').textContent = activeUpload.period_label || 'Region 5';
    document.getElementById('period-label').textContent = activeUpload.period_label;
    document.getElementById('last-updated').textContent =
      'Update: ' + new Date(activeUpload.uploaded_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

    const visibleRecords = filterByRole(allRecords);

    showLoading(false);
    showNoData(false);
    document.getElementById('dashboard-content').classList.remove('hidden');

    buildLobTabs(visibleRecords);
    renderDashboard(visibleRecords, 'SEMUA');

  } catch (err) {
    showLoading(false);
    showNoData(true);
    console.error('Error loading dashboard:', err);
  }
}

// ─── ROLE-BASED FILTER ───────────────────────────────────────
function filterByRole(records) {
  // Semua data tampil tanpa filter — akses publik
  return records;
}

// ─── BUILD LOB TABS ──────────────────────────────────────────
function buildLobTabs(records) {
  const tabBar = document.getElementById('lob-tabs');
  const lobs = [...new Set(records.filter(r => r.row_type === 'LOB').map(r => r.lob_name))];

  // Hapus tab selain "Semua"
  while (tabBar.children.length > 1) tabBar.removeChild(tabBar.lastChild);

  lobs.forEach(lob => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.lob = lob;
    btn.textContent = lob.split(' ')[0]; // Nama pendek: MARDIANSAH → MARDIANSAH
    tabBar.appendChild(btn);
  });

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeLob = btn.dataset.lob;

    const filtered = filterByRole(allRecords);
    renderDashboard(filtered, activeLob);
  });
}

// ─── RENDER DASHBOARD ────────────────────────────────────────
function renderDashboard(records, selectedLob) {
  let viewRecords;

  if (selectedLob === 'SEMUA') {
    viewRecords = records;
  } else {
    viewRecords = records.filter(r => r.lob_name === selectedLob);
  }

  renderKPIs(viewRecords, selectedLob);
  renderRanking(viewRecords, selectedLob);
  renderDetailTable(viewRecords, selectedLob);

  // Update chart labels
  document.getElementById('chart-lob-label').textContent =
    selectedLob === 'SEMUA' ? 'Semua LOB' : selectedLob;
  document.getElementById('ranking-lob-label').textContent =
    selectedLob === 'SEMUA' ? 'Semua LOB' : selectedLob;

  renderDailyChart(viewRecords, selectedLob);

  // Channel / Brand / VAS selalu tampil data region (tidak difilter LOB)
  renderSectionList('CHANNEL', 'channel-list');
  renderSectionList('BRAND',   'brand-list');
  renderSectionList('VAS',     'vas-list');

  initTableToggle();
}

// ─── KPI CARDS ───────────────────────────────────────────────
function renderKPIs(records, selectedLob) {
  let lobRows;
  if (selectedLob === 'SEMUA') {
    lobRows = records.filter(r => r.row_type === 'LOB');
  } else {
    lobRows = records.filter(r => r.row_type === 'LOB' && r.lob_name === selectedLob);
  }

  const totalMtd    = sum(lobRows, 'mtd');
  const totalTarget = sum(lobRows, 'target_april');
  const pctAch      = totalTarget > 0 ? (totalMtd / totalTarget * 100) : null;
  const avgYoy      = avg(lobRows, 'yoy_growth');
  const avgMom      = avg(lobRows, 'mom_growth');

  // MTD
  setKPI('kpi-mtd', formatRupiah(totalMtd), '', null);

  // Target
  setKPI('kpi-target', formatRupiah(totalTarget), '', null);

  // % Pencapaian
  const achClass = pctAch != null
    ? (pctAch >= 100 ? 'positive' : pctAch >= 80 ? 'warning' : 'negative')
    : '';
  setKPI('kpi-ach', pctAch != null ? pctAch.toFixed(1) + '%' : '—', 'vs ROFO', achClass);

  // YoY
  const yoyClass = avgYoy != null ? (avgYoy >= 0 ? 'positive' : 'negative') : '';
  setKPI(
    'kpi-yoy',
    avgYoy != null ? (avgYoy >= 0 ? '+' : '') + avgYoy.toFixed(1) + '%' : '—',
    'vs April 2025',
    yoyClass
  );
}

function setKPI(id, value, sub, colorClass) {
  const valEl = document.getElementById(id);
  const subEl = document.getElementById(id + '-sub');
  if (valEl) {
    valEl.textContent = value;
    valEl.className = 'kpi-value' + (colorClass ? ' ' + colorClass : '');
  }
  if (subEl && sub !== null) subEl.textContent = sub;
}

// ─── RANKING LIST ────────────────────────────────────────────
function renderRanking(records, selectedLob) {
  const container = document.getElementById('ranking-list');
  container.innerHTML = '';

  let rows;
  if (selectedLob === 'SEMUA') {
    // Tampilkan semua LOB diurutkan by % ach
    rows = records.filter(r => r.row_type === 'LOB');
  } else {
    // Tampilkan LOB header + semua TSH
    rows = records.filter(r => r.lob_name === selectedLob);
  }

  // Urutkan TSH by % ach desc, LOB tetap di atas
  const lobRows = rows.filter(r => r.row_type === 'LOB');
  const tshRows = rows.filter(r => r.row_type === 'TSH')
    .sort((a, b) => (b.pct_ach_mtd || 0) - (a.pct_ach_mtd || 0));

  const ordered = selectedLob === 'SEMUA'
    ? lobRows.sort((a, b) => (b.pct_ach_mtd || 0) - (a.pct_ach_mtd || 0))
    : [...lobRows, ...tshRows];

  if (ordered.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  const maxMtd = Math.max(...ordered.map(r => r.mtd || 0), 1);

  ordered.forEach((r, idx) => {
    const name     = r.tsh_name || r.lob_name || '—';
    const pct      = r.pct_ach_mtd;
    const mtd      = r.mtd;
    const isLob    = r.row_type === 'LOB';
    const rankNum  = isLob ? '' : (tshRows.indexOf(r) + 1);
    const rankClass = rankNum === 1 ? 'top-1' : rankNum === 2 ? 'top-2' : rankNum === 3 ? 'top-3' : '';

    // Bar fill color
    let barColor = '#CBD5E0';
    if (pct != null) {
      barColor = pct >= 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
    }
    const barWidth = mtd != null ? Math.min((mtd / maxMtd) * 100, 100).toFixed(1) : 0;

    const div = document.createElement('div');
    div.className = 'ranking-item' + (isLob ? ' is-lob' : '');
    div.innerHTML = `
      <div class="ranking-rank ${rankClass}">${isLob ? '▸' : rankNum}</div>
      <div class="ranking-info">
        <div class="ranking-name">${name}</div>
        <div class="ranking-bar-wrap">
          <div class="ranking-bar-bg">
            <div class="ranking-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <span class="ranking-pct ${achColor(pct)}">
            ${pct != null ? pct.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>
      <div class="ranking-mtd">${formatRupiah(mtd)}</div>
    `;
    container.appendChild(div);
  });
}

// ─── DETAIL TABLE ────────────────────────────────────────────
function renderDetailTable(records, selectedLob) {
  const tbody = document.getElementById('detail-tbody');
  tbody.innerHTML = '';

  let rows;
  if (selectedLob === 'SEMUA') {
    rows = records;
  } else {
    rows = records.filter(r => r.lob_name === selectedLob);
  }

  // Group: LOB dulu lalu TSH-nya
  const grouped = [];
  const lobs = [...new Set(rows.filter(r => r.row_type === 'LOB').map(r => r.lob_name))];
  lobs.forEach(lob => {
    const lobRow = rows.find(r => r.row_type === 'LOB' && r.lob_name === lob);
    if (lobRow) grouped.push(lobRow);
    rows.filter(r => r.row_type === 'TSH' && r.lob_name === lob).forEach(t => grouped.push(t));
  });

  grouped.forEach(r => {
    const isLob  = r.row_type === 'LOB';
    const name   = r.tsh_name || r.lob_name || '—';
    const pctAch = r.pct_ach_mtd;
    const mom    = r.mom_growth;
    const yoy    = r.yoy_growth;

    const tr = document.createElement('tr');
    tr.className = isLob ? 'row-lob' : 'row-tsh';
    tr.innerHTML = `
      <td class="col-name">
        ${!isLob ? '<span style="margin-right:0.5rem;opacity:.3;font-size:.75rem;">└</span>' : ''}
        ${name}
      </td>
      <td class="col-num">${formatRupiah(r.target_april)}</td>
      <td class="col-num">${formatRupiah(r.mtd)}</td>
      <td class="col-pct ${achColor(pctAch)}">${pctAch != null ? pctAch.toFixed(1) + '%' : '—'}</td>
      <td class="col-num">${formatRupiah(r.estimate)}</td>
      <td class="col-pct ${trendColor(mom)}">${mom != null ? (mom >= 0 ? '+' : '') + mom.toFixed(1) + '%' : '—'}</td>
      <td class="col-pct ${trendColor(yoy)}">${yoy != null ? (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '%' : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── CHANNEL / BRAND / VAS LIST ──────────────────────────
function renderSectionList(rowType, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = allRecords
    .filter(r => r.row_type === rowType)
    .sort((a, b) => (b.pct_ach_mtd || 0) - (a.pct_ach_mtd || 0));

  if (rows.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  container.innerHTML = '';
  const maxMtd = Math.max(...rows.map(r => r.mtd || 0), 1);

  rows.forEach((r, idx) => {
    const name     = r.tsh_name || '—';
    const pct      = r.pct_ach_mtd;
    const mtd      = r.mtd;
    const rankNum  = idx + 1;
    const rankClass = rankNum === 1 ? 'top-1' : rankNum === 2 ? 'top-2' : rankNum === 3 ? 'top-3' : '';

    let barColor = '#CBD5E0';
    if (pct != null) {
      barColor = pct >= 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
    }
    const barWidth = mtd != null ? Math.min((mtd / maxMtd) * 100, 100).toFixed(1) : 0;

    const div = document.createElement('div');
    div.className = 'ranking-item';
    div.innerHTML = `
      <div class="ranking-rank ${rankClass}">${rankNum}</div>
      <div class="ranking-info">
        <div class="ranking-name">${name}</div>
        <div class="ranking-bar-wrap">
          <div class="ranking-bar-bg">
            <div class="ranking-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <span class="ranking-pct ${achColor(pct)}">
            ${pct != null ? pct.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>
      <div class="ranking-mtd">${formatRupiah(mtd)}</div>
    `;
    container.appendChild(div);
  });
}

// ─── PROFILE MODAL ───────────────────────────────────────────
function renderUserHeader() {
  if (!userProfile?.profile) return;
  const p = userProfile.profile;
  const initials = getInitials(p.full_name);

  document.getElementById('user-avatar').textContent       = initials;
  document.getElementById('user-name-display').textContent = p.full_name.split(' ')[0];
  document.getElementById('modal-avatar').textContent      = initials;
  document.getElementById('modal-name').textContent        = p.full_name;
  document.getElementById('modal-role').textContent        = p.role.toUpperCase();
  document.getElementById('modal-lob').textContent         =
    p.lob_name ? 'LOB: ' + p.lob_name : '';
}

function initProfileModal() {
  const modal    = document.getElementById('profile-modal');
  const userInfo = document.getElementById('header-user-info');
  const navProf  = document.getElementById('nav-profile');
  const closeBtn = document.getElementById('modal-close-btn');

  const open  = () => modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');

  if (userInfo) userInfo.addEventListener('click', open);
  if (navProf)  navProf.addEventListener('click', (e) => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ─── DESKTOP NAV ─────────────────────────────────────────────
function initDesktopNav() {
  const setActive = (id) => {
    document.querySelectorAll('.desktop-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  };

  document.getElementById('dnav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActive('dnav-dashboard');
  });

  document.getElementById('dnav-chart')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('chart-daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive('dnav-chart');
  });

  document.getElementById('dnav-team')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('ranking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive('dnav-team');
  });

  document.getElementById('dnav-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('profile-modal')?.classList.remove('hidden');
    setActive('dnav-profile');
  });
}

// ─── BOTTOM NAV ──────────────────────────────────────────────
function initBottomNav() {
  const navChart = document.getElementById('nav-chart');
  const navTeam  = document.getElementById('nav-team');
  const navProf  = document.getElementById('nav-profile');

  if (navChart) {
    navChart.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('chart-daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      navChart.classList.add('active');
    });
  }

  if (navTeam) {
    navTeam.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('ranking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      navTeam.classList.add('active');
    });
  }

  if (navProf) {
    navProf.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('profile-modal')?.classList.remove('hidden');
    });
  }
}

// ─── TABLE TOGGLE ────────────────────────────────────────────
function initTableToggle() {
  const btn     = document.getElementById('toggle-table-btn');
  const wrapper = document.getElementById('detail-table-wrapper');
  if (!btn || !wrapper) return;

  btn.addEventListener('click', () => {
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? '' : 'none';
    btn.style.transform = isHidden ? '' : 'rotate(-90deg)';
  });
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────
function sum(arr, key) {
  return arr.reduce((acc, r) => acc + (r[key] || 0), 0);
}

function avg(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v != null && !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.toggle('hidden', !show);
}

function showNoData(show) {
  const el = document.getElementById('no-data-state');
  if (el) el.classList.toggle('hidden', !show);
}
