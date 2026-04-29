// ERA-SALES AI Insights — Netlify Function (Claude Proxy)
// API key disimpan aman di Netlify environment, tidak terekspos ke browser

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY belum dikonfigurasi di Netlify Environment Variables.' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { prompt, brand, week } = body;
  if (!prompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt diperlukan' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `Kamu adalah ERA-SALES AI Agent, analis penjualan senior untuk Erafone Region 5 (Jabodetabek & Banten).
Tugasmu adalah menganalisis data target penjualan brand smartphone dan memberikan rekomendasi strategis kepada Operations Manager Region 5 (Pak Andre).
Selalu gunakan Bahasa Indonesia yang profesional namun mudah dipahami.
Format output menggunakan emoji dan struktur yang jelas.
Fokus pada insight yang actionable dan spesifik.`,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status, headers,
        body: JSON.stringify({ error: result.error?.message || 'Claude API error' })
      };
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ content: result.content?.[0]?.text || '' })
    };

  } catch (err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
