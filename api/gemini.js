
const RATE_LIMIT_MAX = 10;          // requests
const RATE_LIMIT_WINDOW = 60_000;   // 1 minute
const MAX_IMAGE_SIZE = 5_000_000;   // 5MB

// Allowed frontend origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-frontend-domain.vercel.app'
];

// In-memory rate limiter (resets on cold start – OK for Vercel)
const rateLimiter = new Map();

// =======================
// RATE LIMITER
// =======================
function checkRateLimit(key) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  const timestamps = rateLimiter.get(key) || [];
  const recent = timestamps.filter(ts => ts > windowStart);

  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  rateLimiter.set(key, recent);
  return true;
}

// =======================
// HANDLER
// =======================
export default async function handler(req, res) {
  // -------- CORS --------
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // -------- Client IP --------
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';

  // -------- Rate Limit (PROD ONLY) --------
  if (process.env.NODE_ENV === 'production') {
    const rateKey = `${clientIp}:gemini`;

    if (!checkRateLimit(rateKey)) {
      console.warn(`[AUDIT] Rate limit exceeded: ${rateKey}`);
      res.setHeader('Retry-After', '60');
      return res.status(429).json({
        error: 'Rate limit exceeded. Try again in 60 seconds.'
      });
    }
  }

  // -------- Env Check --------
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!GEMINI_API_KEY) {
    console.error('[ERROR] GEMINI_API_KEY missing');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // -------- Body Validation --------
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { action, contents, imageData, mimeType } = req.body;

  if (imageData && imageData.length > MAX_IMAGE_SIZE) {
    return res.status(413).json({ error: 'Image too large (max 5MB)' });
  }

  console.log(`[AUDIT] Gemini request | ip=${clientIp} | action=${action || 'chat'}`);

  try {
    let requestBody;

    // -------- Image Analysis --------
    if (action === 'analyze-image' && imageData) {
      requestBody = {
        contents: [
          {
            parts: [
              {
                text:
                  contents?.[0]?.parts?.[0]?.text ||
                  'Analyze this image and describe any civic or public issues.'
              },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageData
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };
    }

    // -------- Chat --------
    else {
      if (!Array.isArray(contents)) {
        return res.status(400).json({ error: 'Invalid contents format' });
      }

      requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };
    }

    const API_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ERROR] Gemini API error:', data);
      return res.status(response.status).json({
        error: data?.error?.message || 'Gemini request failed'
      });
    }

    console.log(`[AUDIT] Gemini response success | ip=${clientIp}`);
    return res.status(200).json(data);

  } catch (err) {
    console.error('[ERROR] Proxy failure:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
