# ERA-SALES Dashboard — Panduan Setup

## Ringkasan Langkah

```
1. Buat akun Supabase (gratis)
2. Setup database
3. Isi config.js dengan kredensial Supabase
4. Deploy ke Netlify
5. Daftarkan diri sebagai admin
6. Tambahkan user LOB & TSH
7. Upload data pertama
```

---

## LANGKAH 1 — Buat Akun Supabase

1. Buka https://supabase.com dan klik **Start for free**
2. Daftar dengan email atau GitHub
3. Klik **New Project**
4. Isi:
   - **Organization**: ERA-SALES (buat baru)
   - **Project Name**: era-sales
   - **Database Password**: buat password kuat, **simpan di tempat aman**
   - **Region**: Southeast Asia (Singapore)
5. Tunggu sekitar 1-2 menit sampai project siap

---

## LANGKAH 2 — Setup Database

1. Di Supabase Dashboard, klik menu **SQL Editor** (ikon play) di sidebar kiri
2. Klik **New Query**
3. Buka file `supabase-setup.sql` dari folder dashboard ini
4. Copy semua isi file tersebut → paste di SQL Editor
5. Klik tombol **Run** (atau tekan Ctrl+Enter)
6. Pastikan muncul pesan "Success"

---

## LANGKAH 3 — Ambil Kredensial Supabase

1. Di Supabase Dashboard, klik **Settings** (ikon roda gigi) di sidebar
2. Klik **API**
3. Catat dua nilai ini:
   - **Project URL** → berbentuk `https://xxxxxxxxxxxx.supabase.co`
   - **Project API keys → anon public** → string panjang

---

## LANGKAH 4 — Isi Config

1. Buka file `js/config.js` dengan text editor (Notepad, TextEdit, dll.)
2. Ganti baris ini:
   ```
   const SUPABASE_URL  = 'GANTI_DENGAN_SUPABASE_URL_ANDA';
   const SUPABASE_ANON = 'GANTI_DENGAN_SUPABASE_ANON_KEY_ANDA';
   ```
   Menjadi (contoh):
   ```
   const SUPABASE_URL  = 'https://abcdefgh.supabase.co';
   const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```
3. Simpan file

---

## LANGKAH 5 — Deploy ke Netlify

### Cara A: Drag & Drop (paling mudah)

1. Buka https://netlify.com → daftar gratis dengan email
2. Di halaman dashboard Netlify, cari area **"Want to deploy a new site without connecting to Git?"**
3. **Drag & drop seluruh folder `dashboard`** ke area tersebut
4. Tunggu beberapa detik → site langsung live
5. Netlify akan memberi URL otomatis seperti `random-name-123.netlify.app`

### Ubah nama site (opsional)
1. Klik **Site configuration** → **General** → **Change site name**
2. Ganti menjadi `era-sales` → URL jadi `era-sales.netlify.app`

### Cara B: Via GitHub (lebih mudah untuk update)
1. Upload folder `dashboard` ke GitHub repository baru
2. Di Netlify, klik **Add new site** → **Import from Git**
3. Hubungkan ke repo GitHub tersebut
4. Set **Publish directory** ke `.` (titik)
5. Klik **Deploy site**
6. Setiap kali push ke GitHub → Netlify otomatis update

---

## LANGKAH 6 — Konfigurasi Supabase Auth

Sebelum login, konfigurasi redirect URL di Supabase:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Di **Site URL**, isi: `https://era-sales.netlify.app`
3. Di **Redirect URLs**, tambahkan: `https://era-sales.netlify.app/auth-callback.html`
4. Klik **Save**

---

## LANGKAH 7 — Daftarkan Diri Sebagai Admin

1. Buka `https://era-sales.netlify.app`
2. Masukkan email Anda → klik **Kirim Magic Link**
3. Cek email → klik link yang dikirimkan
4. Anda akan diarahkan ke dashboard (belum punya data, wajar)
5. Kembali ke Supabase Dashboard → **SQL Editor**
6. Jalankan query ini (ganti email):
   ```sql
   INSERT INTO public.user_profiles (id, email, full_name, role)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'EMAIL_ANDA@gmail.com'),
     'EMAIL_ANDA@gmail.com',
     'Admin ERA-SALES',
     'admin'
   );
   ```
7. Refresh halaman dashboard → Anda sudah masuk sebagai Admin

---

## LANGKAH 8 — Tambahkan User LOB & TSH

Di halaman Admin (`/admin.html`), klik **+ Tambah User**:

### Daftar LOB yang perlu didaftarkan:

| Nama              | Role | LOB           | Email                         |
|-------------------|------|---------------|-------------------------------|
| MARDIANSAH        | LOB  | MARDIANSAH    | email.mardiansah@...          |
| ARIS FACHRUDIN    | LOB  | ARIS FACHRUDIN| email.aris@...                |
| ANDI IRAWAN       | LOB  | ANDI IRAWAN   | email.andi@...                |
| RACHMAT           | LOB  | RACHMAT       | email.rachmat@...             |
| ABDILLAH          | TSH  | MARDIANSAH    | email.abdillah@...            |
| ARENGGA           | TSH  | MARDIANSAH    | email.arengga@...             |
| ... (dst)         |      |               |                               |

> Setelah dikirim, setiap user akan mendapat **magic link** ke email mereka.
> Mereka cukup klik link → langsung masuk ke dashboard.

---

## LANGKAH 9 — Upload Data Pertama

1. Login ke `https://era-sales.netlify.app` dengan email admin
2. Klik **Panel Admin** atau langsung buka `/admin.html`
3. Drag & drop file Excel (contoh: `Sales vs Stock 01 - 10 April 2026 R5_Master.xlsx`)
4. Sistem akan otomatis membaca sheet **SUM R5**
5. Preview data akan muncul → klik **Submit ke Dashboard**
6. Selesai! Dashboard semua user langsung terupdate.

---

## CARA UPDATE DATA HARIAN

Setiap hari (atau setiap ada data baru):

1. Siapkan file Excel dengan sheet **SUM R5** yang sudah diupdate
2. Buka `https://era-sales.netlify.app/admin.html`
3. Upload file baru → Submit
4. Dashboard otomatis menampilkan data terbaru

> **Catatan:** Upload baru akan **menggantikan** data lama secara otomatis.
> Data lama tetap tersimpan di riwayat upload (tidak hilang permanen).

---

## STRUKTUR FILE DASHBOARD

```
dashboard/
├── index.html          → Halaman login
├── dashboard.html      → Dashboard utama
├── admin.html          → Panel admin (upload + user management)
├── auth-callback.html  → Handler magic link
├── netlify.toml        → Konfigurasi Netlify
├── supabase-setup.sql  → Script setup database
├── css/
│   └── style.css       → Semua style (mobile-first)
└── js/
    ├── config.js       → Konfigurasi Supabase + helpers
    ├── auth.js         → Logic autentikasi
    ├── upload.js       → Parser Excel + upload ke Supabase
    ├── dashboard.js    → Logic dashboard utama
    └── charts.js       → Konfigurasi grafik ApexCharts
```

---

## TROUBLESHOOTING

### "Sheet SUM R5 tidak ditemukan"
- Pastikan nama sheet di Excel persis: **SUM R5** (bukan "Sum R5" atau "SUM R 5")

### Magic link tidak masuk ke email
- Cek folder Spam/Junk
- Pastikan email yang dimasukkan sudah benar
- Di Supabase → Authentication → Settings → pastikan Email provider aktif

### Dashboard kosong setelah upload
- Cek Supabase → Table Editor → `upload_history` → pastikan ada row dengan `is_active = true`
- Cek Supabase → Table Editor → `sales_summary` → pastikan ada data

### "Unauthorized" saat upload
- Pastikan profil admin sudah dibuat di tabel `user_profiles` dengan `role = 'admin'`

---

## KONTAK & SUPPORT

Untuk pertanyaan teknis, hubungi tim IT atau developer yang membangun dashboard ini.

> Data bersifat **RAHASIA** — hanya untuk internal Region 5.
> Jangan share URL atau kredensial ke pihak luar.
