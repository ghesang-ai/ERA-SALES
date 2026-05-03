// ERA-SALES AI Insights — Netlify Function
// Provider: DeepSeek (OpenAI-compatible API)
// Supports: customPrompt untuk instruksi tambahan dari user

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// Model mapping dari selector frontend → DeepSeek model
const MODEL_MAP = {
  'deepseek-chat':     'deepseek-chat',      // V3 — cepat, hemat
  'deepseek-reasoner': 'deepseek-reasoner',  // R1 — analisis dalam
  'auto':              null,                  // fallback otomatis
};
const MODEL_DEFAULT  = 'deepseek-chat';
const MODEL_FALLBACK = 'deepseek-reasoner';

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

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'DEEPSEEK_API_KEY belum dikonfigurasi di Netlify Environment Variables.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body request harus berupa JSON yang valid.' }) };
  }

  const prompt       = typeof payload.prompt === 'string'       ? payload.prompt.trim()       : '';
  const brand        = typeof payload.brand === 'string'        ? payload.brand.trim()         : 'Unknown';
  const week         = typeof payload.week === 'string'         ? payload.week.trim()          : 'Unknown';
  const selectedModel= typeof payload.selectedModel === 'string'? payload.selectedModel.trim() : 'auto';
  const customPrompt = typeof payload.customPrompt === 'string' ? payload.customPrompt.trim()  : '';

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

  // Tambahkan instruksi custom dari user jika ada
  if (customPrompt) {
    systemPrompt += `\n\nINSTRUKSI TAMBAHAN DARI USER:\n${customPrompt}`;
  }

  // Tentukan model yang akan dicoba
  const resolvedModel = MODEL_MAP[selectedModel] || MODEL_DEFAULT;
  const modelsToTry = resolvedModel === MODEL_FALLBACK
    ? [MODEL_FALLBACK]
    : [resolvedModel, MODEL_FALLBACK];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt },
          ],
        }),
      });

      const result = await res.json();

      if (res.ok) {
        const content = result.choices?.[0]?.message?.content || '';
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ content, model: result.model || model }),
        };
      }

      lastError = {
        statusCode: res.status,
        message: result.error?.message || `DeepSeek API error (${res.status})`,
        model,
      };

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
      error: lastError?.message || 'Semua model DeepSeek gagal.',
      tried_models: modelsToTry,
    }),
  };
};
