// Upload data ke Supabase — port dari dashboard/js/upload.js initSubmit()
const { createClient } = require('@supabase/supabase-js');

async function uploadToSupabase(parsedData) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Cari UUID admin berdasarkan email (untuk field uploaded_by)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', process.env.EMAIL_USER.toLowerCase())
    .single();
  const uploadedBy = profile ? profile.id : null;

  // 1. Catat upload aktif sebelumnya (akan dihapus setelah data baru masuk)
  const { data: previousActive } = await supabase
    .from('upload_history')
    .select('id')
    .eq('is_active', true);
  const previousIds = (previousActive || []).map(u => u.id);

  // 2. Insert upload_history baru
  const { data: upload, error: uploadErr } = await supabase
    .from('upload_history')
    .insert({
      filename:     parsedData.filename,
      period_label: parsedData.periodLabel,
      period_start: parsedData.periodStart,
      period_end:   parsedData.periodEnd,
      uploaded_by:  uploadedBy,
      is_active:    true
    })
    .select()
    .single();

  if (uploadErr) throw new Error('Gagal menyimpan info upload: ' + uploadErr.message);

  const newUploadId = upload.id;

  try {
    // 3. Insert sales_summary baru dalam batch 50
    const rows = parsedData.records.map(r => ({ ...r, upload_id: newUploadId }));
    const batchSize = 50;
    const totalBatches = Math.ceil(rows.length / batchSize);

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const { error } = await supabase.from('sales_summary').insert(batch);
      if (error) throw new Error(`Gagal insert batch ${batchNum}: ${error.message}`);
      process.stdout.write(`   Batch ${batchNum}/${totalBatches} selesai\r`);
    }
    console.log(`   ${rows.length} baris berhasil diinsert          `);

    // 4. Hapus data sales lama (hanya setelah data baru sukses)
    if (previousIds.length > 0) {
      await supabase.from('sales_summary').delete().in('upload_id', previousIds);
    }

  } catch (err) {
    // Rollback: hapus upload baru jika ada error
    await supabase.from('sales_summary').delete().eq('upload_id', newUploadId);
    await supabase.from('upload_history').delete().eq('id', newUploadId);

    // Aktifkan kembali upload sebelumnya
    if (previousIds.length > 0) {
      await supabase.from('upload_history')
        .update({ is_active: true })
        .eq('id', previousIds[0]);
    }

    throw err;
  }
}

module.exports = { uploadToSupabase };
