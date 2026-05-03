// ERA-SALES ChatBot — Netlify Function
// Provider: DeepSeek (OpenAI-compatible API)
// Model: deepseek-chat (DeepSeek-V3) — cepat & hemat
// Fallback: deepseek-reasoner (DeepSeek-R1) untuk pertanyaan kompleks

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL_PRIMARY  = 'deepseek-chat';      // DeepSeek-V3, default
const MODEL_FALLBACK = 'deepseek-reasoner';  // DeepSeek-R1, fallback

const SYSTEM_BASE = `Kamu adalah ERA-SALES AI Assistant untuk Erafone Region 5 (Jabodetabek & Banten).

PERAN & KONTEKS:
- Kamu membantu tim sales Region 5 memahami data penjualan, target, dan performa toko
- Staff penjualan di toko disebut ERO (Erafone Representative Officer), BUKAN SA
- Pemimpin tim per wilayah disebut TSH (Team Supervisor Head)
- LOB = Line of Business (dikelola oleh: MARDIANSAH, ARIS FACHRUDIN, ANDI IRAWAN, RACHMAT)
- Toko-toko: Erafone, Erablue, Megastore, iBox, Xiaomi Store, OPPO Store, Vivo Store

CARA MENJAWAB:
- Gunakan Bahasa Indonesia yang profesional tapi ramah
- Berikan jawaban yang singkat, padat, dan actionable
- Jika ada data dari konteks halaman, jadikan dasar analisis
- Gunakan angka spesifik dari data yang tersedia
- Untuk pertanyaan umum tanpa data, berikan kerangka analisis yang relevan
- Format jawaban: paragraf pendek atau bullet points, maksimal 300 kata`;

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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body harus JSON.' }) };
  }

  const messages  = Array.isArray(payload.messages) ? payload.messages : [];
  const context   = payload.context && typeof payload.context === 'object' ? payload.context : {};
  const pageTitle = typeof payload.pageTitle === 'string' ? payload.pageTitle : 'ERA-SALES';

  if (messages.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages wajib diisi.' }) };
  }

  // Build context block for system prompt
  let contextBlock = '';
  if (Object.keys(context).length > 0) {
    contextBlock = `\n\nKONTEKS HALAMAN SAAT INI (${pageTitle}):\n${JSON.stringify(context, null, 2)}\n\nGunakan data di atas sebagai referensi utama dalam menjawab.`;
  }

  const systemPrompt = SYSTEM_BASE + contextBlock;

  // Validate & sanitize messages
  const cleanMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== 'user') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pesan terakhir harus dari user.' }) };
  }

  // Try primary model first, fallback to reasoner on failure
  for (const model of [MODEL_PRIMARY, MODEL_FALLBACK]) {
    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            ...cleanMessages,
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

      const errMsg = result.error?.message || `HTTP ${res.status}`;

      // Jika model tidak ditemukan, coba fallback
      if (res.status === 404 || res.status === 400) continue;

      return {
        statusCode: res.status, headers,
        body: JSON.stringify({ error: errMsg, model }),
      };
    } catch (err) {
      // Network error — coba fallback
      if (model === MODEL_FALLBACK) {
        return {
          statusCode: 500, headers,
          body: JSON.stringify({ error: `Network error: ${err.message}` }),
        };
      }
    }
  }

  return {
    statusCode: 500, headers,
    body: JSON.stringify({ error: 'Semua model DeepSeek gagal diakses.' }),
  };
};
