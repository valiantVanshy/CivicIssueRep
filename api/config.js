// Vercel Serverless Function to securely provide config
// This keeps API keys on the server side

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  // Return config with environment variables
  // These are set in Vercel Dashboard > Settings > Environment Variables
  const config = {
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || ''
    },
    gemini: {
      model: 'gemini-2.0-flash',
      rateLimitPerMinute: 10,
      minRequestInterval: 4000
    },
    app: {
      name: 'SAKSHAM',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    }
  };

  res.status(200).json(config);
}
