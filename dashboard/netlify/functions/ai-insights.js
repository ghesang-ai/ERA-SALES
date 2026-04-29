
// ERA-SALES AI Insights — Netlify Function (Claude Proxy)
// API key disimpan di Netlify environment dan hanya dipakai di server.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY belum dikonfigurasi di Netlify Environment Variables.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Body request harus berupa JSON yang valid.' }),
    };
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const brand = typeof payload.brand === 'string' ? payload.brand.trim() : 'Unknown';
  const week = typeof payload.week === 'string' ? payload.week.trim() : 'Unknown';

  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Field "prompt" wajib diisi.' }),
    };
  }

  try {
    const anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: `Kamu adalah ERA-SALES AI Agent untuk Erafone Region 5.
Brand yang sedang dianalisis: ${brand}.
Periode analisis: ${week}.
Gunakan Bahasa Indonesia yang profesional, tajam, spesifik, dan actionable.
Berikan struktur yang rapi agar mudah dibaca di dashboard.`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const result = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return {
        statusCode: anthropicResponse.status,
        headers,
        body: JSON.stringify({
          error: result.error?.message || 'Anthropic API error',
          details: result.error || null,
        }),
      };
    }

    const content = Array.isArray(result.content)
      ? result.content
          .filter(block => block && block.type === 'text' && typeof block.text === 'string')
          .map(block => block.text)
          .join('\n\n')
      : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content,
        model: result.model || ANTHROPIC_MODEL,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Server error: ${error.message}`,
      }),
    };
  }
};
