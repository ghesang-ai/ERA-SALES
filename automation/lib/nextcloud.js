// Download file Excel dari Nextcloud public share yang dilindungi password
const fetch = require('node-fetch');
const fs = require('fs');

async function downloadFile(shareUrl, sharePassword, outputPath) {
  // Extract share token dari URL: https://drive.erajaya.com/index.php/s/TOKEN
  const tokenMatch = shareUrl.match(/\/s\/([A-Za-z0-9]+)/);
  if (!tokenMatch) throw new Error('URL Nextcloud tidak valid: ' + shareUrl);
  const shareToken = tokenMatch[1];

  // Nextcloud WebDAV untuk public share: user=token, password=share_password
  const auth = Buffer.from(`${shareToken}:${sharePassword}`).toString('base64');
  const webdavBase = 'https://drive.erajaya.com/public.php/webdav/';

  // Step 1: HEAD request untuk cek file dan ambil nama dari Content-Disposition
  const headRes = await fetch(webdavBase, {
    method: 'HEAD',
    headers: { 'Authorization': `Basic ${auth}` }
  });

  if (!headRes.ok) {
    throw new Error(
      `Gagal mengakses Nextcloud (HTTP ${headRes.status}).\n` +
      `Kemungkinan penyebab: link sudah expired, atau password salah.`
    );
  }

  // Extract filename dari Content-Disposition header
  const disposition = headRes.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename[^;=\n]*=(UTF-8'')?([^;\n"]+)/i);
  const filename = filenameMatch
    ? decodeURIComponent(filenameMatch[2].replace(/['"]/g, '').trim())
    : `era-sales-${Date.now()}.xlsx`;
  console.log(`   Nama file: ${filename}`);

  // Step 2: Download file Excel langsung dari root WebDAV
  const downloadRes = await fetch(webdavBase, {
    headers: { 'Authorization': `Basic ${auth}` }
  });

  if (!downloadRes.ok) {
    throw new Error(`Gagal mendownload file (HTTP ${downloadRes.status})`);
  }

  const buffer = await downloadRes.buffer();
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`   Ukuran: ${sizeMB} MB`);

  fs.writeFileSync(outputPath, buffer);
  return filename;
}

module.exports = { downloadFile };
