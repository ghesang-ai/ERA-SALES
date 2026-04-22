// ERA-SALES Auto Upload
// Jalankan: node index.js
require('dotenv').config();

const { getLatestEmail }  = require('./lib/email');
const { downloadFile }    = require('./lib/nextcloud');
const { parseExcel }      = require('./lib/parser');
const { uploadToSupabase }= require('./lib/uploader');
const path = require('path');
const os   = require('os');
const fs   = require('fs');

async function main() {
  console.log('========================================');
  console.log('  ERA-SALES Auto Upload');
  console.log(`  ${new Date().toLocaleString('id-ID')}`);
  console.log('========================================\n');

  // Validasi .env
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missing = required.filter(k => !process.env[k] || process.env[k].includes('PASTE_'));
  if (missing.length > 0) {
    console.error('❌ Konfigurasi .env belum lengkap. Yang belum diisi:');
    missing.forEach(k => console.error(`   - ${k}`));
    console.error('\nBuka file automation/.env dan isi nilai yang diperlukan.');
    process.exit(1);
  }

  // Step 1: Baca email
  console.log('📧 Step 1: Membaca email dari Melati...');
  const emailData = await getLatestEmail();
  if (!emailData) {
    console.log('⚠️  Tidak ada email baru dari Melati hari ini.');
    console.log('   Script selesai tanpa update.');
    return;
  }
  console.log(`✅ Email ditemukan!`);
  console.log(`   Link    : ${emailData.link}`);
  console.log(`   Password: ${emailData.password}`);

  // Step 2: Download file Excel
  console.log('\n📥 Step 2: Mendownload file Excel dari Nextcloud...');
  const tmpFile = path.join(os.tmpdir(), `era-sales-${Date.now()}.xlsx`);
  const filename = await downloadFile(emailData.link, emailData.password, tmpFile);
  console.log(`✅ File berhasil didownload!`);

  // Step 3: Parse Excel
  console.log('\n🔍 Step 3: Membaca dan menganalisa data...');
  const parsed = parseExcel(tmpFile, filename);
  console.log(`✅ Data berhasil dibaca!`);
  console.log(`   Total baris : ${parsed.records.length}`);
  console.log(`   Periode     : ${parsed.periodLabel}`);

  // Step 4: Upload ke Supabase
  console.log('\n☁️  Step 4: Mengupload data ke Supabase...');
  await uploadToSupabase(parsed);
  console.log('✅ Upload berhasil!');

  // Cleanup file sementara
  try { fs.unlinkSync(tmpFile); } catch(e) {}

  console.log('\n========================================');
  console.log('  SELESAI! Dashboard ERA-SALES sudah');
  console.log('  terupdate dengan data terbaru.');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
