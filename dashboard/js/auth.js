// ============================================================
// ERA-SALES DASHBOARD — Authentication Logic
// ============================================================

// Kirim magic link ke email
async function sendMagicLink(email) {
  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: APP_URL + '/auth-callback.html'
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Terjadi kesalahan. Coba lagi.' };
  }
}

// Logout
async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// Ambil user yang sedang login + profilnya
async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile ? { ...user, profile } : null;
}

// Guard: hanya admin yang boleh masuk
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'admin-login.html';
    return null;
  }
  if (!user.profile || user.profile.role !== 'admin') {
    window.location.href = 'admin-login.html';
    return null;
  }
  return user;
}

// Inisialisasi tombol logout (digunakan di semua halaman)
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (confirm('Yakin ingin keluar?')) await signOut();
    });
  }

  const modalBtn = document.getElementById('modal-logout-btn');
  if (modalBtn) {
    modalBtn.addEventListener('click', async () => {
      await signOut();
    });
  }
}
