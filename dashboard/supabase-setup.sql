-- ============================================================
-- ERA-SALES DASHBOARD — Supabase Database Setup
-- Jalankan seluruh script ini di Supabase SQL Editor
-- ============================================================

-- 1. TABEL: user_profiles
CREATE TABLE public.user_profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'lob', 'tsh')),
  lob_name   TEXT,   -- diisi jika role = 'lob' atau 'tsh'
  tsh_name   TEXT,   -- diisi jika role = 'tsh'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: upload_history
CREATE TABLE public.upload_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename     TEXT NOT NULL,
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end   DATE,
  uploaded_by  UUID REFERENCES auth.users(id),
  uploaded_at  TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE
);

-- 3. TABEL: sales_summary (data dari sheet SUM R5)
CREATE TABLE public.sales_summary (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id      UUID REFERENCES public.upload_history(id) ON DELETE CASCADE,
  row_type       TEXT NOT NULL CHECK (row_type IN ('LOB', 'TSH', 'CHANNEL', 'BRAND', 'VAS')),
  lob_name       TEXT,
  tsh_name       TEXT,
  baseline_yoy   NUMERIC,
  baseline_mom   NUMERIC,
  target_april   NUMERIC,
  daily_sales    JSONB,   -- {"2026-04-01": 100000, "2026-04-02": 85000, ...}
  mtd            NUMERIC,
  estimate       NUMERIC,
  pct_ach_mtd    NUMERIC,
  pct_ach_est    NUMERIC,
  mom_growth     NUMERIC,
  yoy_growth     NUMERIC,
  ytd_2025       NUMERIC,
  ytd_2026       NUMERIC,
  ytd_growth     NUMERIC,
  ach_april      NUMERIC,   -- % Ach April 2026 (dari BY STORE sheet kolom OT, rata-rata per TSH)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_summary   ENABLE ROW LEVEL SECURITY;

-- user_profiles: user hanya bisa baca profilnya sendiri
CREATE POLICY "user_lihat_profil_sendiri" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin bisa baca semua profil
CREATE POLICY "admin_lihat_semua_profil" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin bisa insert profil baru
CREATE POLICY "admin_insert_profil" ON public.user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin bisa update profil
CREATE POLICY "admin_update_profil" ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- upload_history: semua user terautentikasi bisa lihat
CREATE POLICY "auth_lihat_upload" ON public.upload_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya admin yang bisa upload
CREATE POLICY "admin_insert_upload" ON public.upload_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Hanya admin yang bisa update is_active
CREATE POLICY "admin_update_upload" ON public.upload_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- sales_summary: semua user terautentikasi bisa lihat
CREATE POLICY "auth_lihat_sales" ON public.sales_summary
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya admin yang bisa insert data sales
CREATE POLICY "admin_insert_sales" ON public.sales_summary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Hanya admin yang bisa delete data sales
CREATE POLICY "admin_delete_sales" ON public.sales_summary
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- FUNGSI HELPER: otomatis nonaktifkan upload lama
-- ============================================================
CREATE OR REPLACE FUNCTION deactivate_old_uploads()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.upload_history
  SET is_active = FALSE
  WHERE id != NEW.id AND is_active = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_deactivate_old_uploads
AFTER INSERT ON public.upload_history
FOR EACH ROW
EXECUTE FUNCTION deactivate_old_uploads();

-- ============================================================
-- ============================================================
-- MIGRASI: Jalankan jika tabel sales_summary sudah ada sebelumnya
-- ============================================================
-- ALTER TABLE public.sales_summary ADD COLUMN IF NOT EXISTS ach_april NUMERIC;

-- MIGRASI: Fix row_type CHECK constraint (tambahkan CHANNEL, BRAND, VAS)
-- Jalankan perintah ini di Supabase SQL Editor jika tabel sudah ada:
-- ALTER TABLE public.sales_summary
--   DROP CONSTRAINT IF EXISTS sales_summary_row_type_check;
-- ALTER TABLE public.sales_summary
--   ADD CONSTRAINT sales_summary_row_type_check
--   CHECK (row_type IN ('LOB', 'TSH', 'CHANNEL', 'BRAND', 'VAS'));

-- ============================================================
-- MIGRASI: Sistem Login & Approval TSH
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Tambah kolom status ke user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Admin otomatis approved
UPDATE public.user_profiles SET status = 'approved' WHERE role = 'admin';

-- 3. Izinkan user insert profil sendiri (untuk auto-registrasi)
DROP POLICY IF EXISTS "user_insert_own_profil" ON public.user_profiles;
CREATE POLICY "user_insert_own_profil" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. User hanya bisa baca profilnya sendiri (sudah ada, pastikan ada)
DROP POLICY IF EXISTS "user_lihat_profil_sendiri" ON public.user_profiles;
CREATE POLICY "user_lihat_profil_sendiri" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- 5. Admin bisa baca & update semua profil
DROP POLICY IF EXISTS "admin_lihat_semua_profil" ON public.user_profiles;
CREATE POLICY "admin_lihat_semua_profil" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_profil" ON public.user_profiles;
CREATE POLICY "admin_update_profil" ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Hanya approved user yang bisa lihat data sales
DROP POLICY IF EXISTS "auth_lihat_sales" ON public.sales_summary;
CREATE POLICY "auth_lihat_sales" ON public.sales_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (status = 'approved' OR role = 'admin')
    )
  );

DROP POLICY IF EXISTS "auth_lihat_upload" ON public.upload_history;
CREATE POLICY "auth_lihat_upload" ON public.upload_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (status = 'approved' OR role = 'admin')
    )
  );

-- ============================================================
-- DATA AWAL: Insert profil admin
-- GANTI email di bawah dengan email Anda!
-- Jalankan SETELAH Anda login pertama kali via magic link
-- ============================================================
-- INSERT INTO public.user_profiles (id, email, full_name, role)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'),
--   'YOUR_EMAIL@example.com',
--   'Admin ERA-SALES',
--   'admin'
-- );
