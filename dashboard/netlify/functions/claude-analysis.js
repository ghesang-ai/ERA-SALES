// ERA-SALES Claude Analysis — Netlify Function
// Provider: Anthropic Claude
// Supports: customPrompt untuk instruksi tambahan dari user

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-6',
  'claude-3-haiku-20240307',
];

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY belum dikonfigurasi di Netlify Environment Variables.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body request harus berupa JSON yang valid.' }) };
  }

  const prompt        = typeof payload.prompt === 'string'        ? payload.prompt.trim()        : '';
  const brand         = typeof payload.brand === 'string'         ? payload.brand.trim()          : 'Unknown';
  const week          = typeof payload.week === 'string'          ? payload.week.trim()           : 'Unknown';
  const selectedModel = typeof payload.selectedModel === 'string' ? payload.selectedModel.trim()  : 'auto';
  const customPrompt  = typeof payload.customPrompt === 'string'  ? payload.customPrompt.trim()   : '';

  if (!prompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Field "prompt" wajib diisi.' }) };
  }

  // System prompt
  let systemPrompt = `Kamu adalah ERA-SALES AI Agent untuk Erafone Region 5.
Brand yang sedang dianalisis: ${brand}.
Periode analisis: ${week}.
Gunakan Bahasa Indonesia yang profesional, tajam, spesifik, dan actionable.
Berikan struktur yang rapi agar mudah dibaca di dashboard.
PENTING: Sebutan staff penjualan di toko Erafone/Erajaya Digital adalah ERO (Erafone Representative Officer), BUKAN SA atau Sales Associate. Selalu gunakan "ERO" dalam analisis.`;

  if (customPrompt) {
    systemPrompt += `\n\nINSTRUKSI TAMBAHAN DARI USER:\n${customPrompt}`;
  }

  // Model order: prioritaskan pilihan user
  const modelsToTry = selectedModel !== 'auto' && MODELS.includes(selectedModel)
    ? [selectedModel, ...MODELS.filter(m => m !== selectedModel)]
    : MODELS;

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const result = await res.json();

      if (res.ok) {
        const content = Array.isArray(result.content)
          ? result.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n')
          : '';
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ content, model: result.model || model }),
        };
      }

      lastError = { statusCode: res.status, message: result.error?.message || 'Anthropic API error', model };
      if (res.status === 404 || res.status === 400) continue;

      return {
        statusCode: res.status, headers,
        body: JSON.stringify({ error: lastError.message, model }),
      };
    } catch (err) {
      lastError = { statusCode: 500, message: err.message, model };
    }
  }

  return {
    statusCode: lastError?.statusCode || 500, headers,
    body: JSON.stringify({
      error: lastError?.message || 'Semua model Claude gagal.',
      tried_models: modelsToTry,
    }),
  };
};
