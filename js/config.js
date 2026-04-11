// ============================================================
// ERA-SALES DASHBOARD — Konfigurasi Supabase
// GANTI nilai di bawah dengan kredensial proyek Supabase Anda
// Cara mendapatkan: Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://ichvkuxkxsxboybqayle.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljaHZrdXhreHN4Ym95YnFheWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NzAzNzksImV4cCI6MjA5MTQ0NjM3OX0.9ubwh3UhIvbbQ8YocqcvB2QtAEsmCpJQpfq8SQ7haGw';

// URL aplikasi (ganti setelah deploy ke Netlify)
const APP_URL = window.location.origin;

// Inisialisasi Supabase client (tersedia setelah supabase-js dimuat)
let supabaseClient;
document.addEventListener('DOMContentLoaded', () => {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      redirectTo: APP_URL + '/auth-callback.html'
    }
  });
});

// Struktur LOB → TSH (sesuai data Region 5)
const LOB_STRUCTURE = {
  'MARDIANSAH': [
    'ABDILLAH', 'ARENGGA', 'ARI HIDAYAT',
    'EKA FUJI', 'NURUL ZAMAN', 'RENDI JANUARDI', 'SANDI MAULANA'
  ],
  'ARIS FACHRUDIN': [
    'FEBRIAN TRI WIBOWO', 'IRMAN PERMANA', 'LUKMAN WIBOWO',
    'MENSI ALEXANDER', 'RENDY NUR SETIAWAN'
  ],
  'ANDI IRAWAN': [
    'ANDRY UTAMA', 'ARDILESCH', 'JOKO SUPRASTIO', 'RIZKY KURNIAWAN'
  ],
  'RACHMAT': [
    'LIM PING KIAN', 'LIA ASTUTI', 'SOPIYAN SAURI',
    'VACANT (EDC)', 'EXHIBITION'
  ]
};

const LOB_NAMES = Object.keys(LOB_STRUCTURE);

// Helper: cari LOB dari nama TSH
function getLobForTsh(tshName) {
  for (const [lob, tshs] of Object.entries(LOB_STRUCTURE)) {
    if (tshs.some(t => tshName.toUpperCase().includes(t) || t.includes(tshName.toUpperCase()))) {
      return lob;
    }
  }
  return null;
}

// Helper: format angka ke Rupiah singkat (1.2M, 850K)
function formatRupiah(val, decimals = 1) {
  if (val == null || isNaN(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(decimals) + 'B';
  if (abs >= 1_000_000)     return sign + (abs / 1_000_000).toFixed(decimals) + 'M';
  if (abs >= 1_000)         return sign + (abs / 1_000).toFixed(decimals) + 'K';
  return sign + abs.toFixed(0);
}

// Helper: format persen
function formatPct(val) {
  if (val == null || isNaN(val)) return '—';
  return (val * 1).toFixed(1) + '%';
}

// Helper: warna berdasarkan % pencapaian
function achColor(pct) {
  if (pct == null || isNaN(pct)) return '';
  const n = parseFloat(pct);
  if (n >= 100) return 'ach-high';
  if (n >= 80)  return 'ach-mid';
  return 'ach-low';
}

// Helper: warna trend (MoM/YoY)
function trendColor(pct) {
  if (pct == null || isNaN(pct)) return '';
  return parseFloat(pct) >= 0 ? 'ach-up' : 'ach-down';
}

// Helper: inisial nama
function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
