const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const path = require('path');

const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const WS_TOKEN = process.env.WS_TOKEN || '';

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, '..', 'public')));

if (!WS_TOKEN) {
  console.warn('Warning: WS_TOKEN is not set. Set WS_TOKEN in environment or .env file.');
}

// Simple token-status endpoint for debugging (masked token)
app.get('/api/token-status', (req, res) => {
  const ok = !!WS_TOKEN;
  const masked = WS_TOKEN ? (WS_TOKEN.slice(0, 4) + '…' + WS_TOKEN.slice(-4)) : '';
  res.json({ connected: ok, token: masked });
});

// Proxy endpoint for bandwidth stats
app.get('/api/stats', async (req, res) => {
  if (!WS_TOKEN) return res.status(500).json({ error: 'Server token not configured' });
  try {
    const api = 'https://proxy.webshare.io/api/v2/proxy/stats/bandwidth/';
    const proxied = await fetch(api, { headers: { 'Authorization': `Token ${WS_TOKEN}` } });
    if (!proxied.ok) return res.status(502).json({ error: 'Upstream error', status: proxied.status });
    const data = await proxied.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Bad gateway' });
  }
});

// Improved /api/proxies handler: enforce headers, check content-type, return snippet if HTML
app.get('/api/proxies', async (req, res) => {
  if (!WS_TOKEN) return res.status(500).json({ error: 'Server token not configured' });

  const api = `https://proxy.webshare.io/api/v2/proxy/list/download/${encodeURIComponent(WS_TOKEN)}/-/any/username/direct/-/?plan_id=12553212`;

  try {
    const proxied = await fetch(api, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${WS_TOKEN}`,
        'Accept': 'text/plain, */*',
        'User-Agent': 'proxy-stats-proxy/1.0 (+https://github.com/costaalso2/proxy-stats)'
      },
      // node-fetch follows redirects by default
    });

    if (!proxied.ok) {
      const body = await proxied.text().catch(() => '');
      console.error('Upstream non-OK', proxied.status, body.slice(0, 500));
      return res.status(502).json({ error: 'Upstream error', status: proxied.status, snippet: body.slice(0, 500) });
    }

    const contentType = (proxied.headers.get('content-type') || '').toLowerCase();
    const text = await proxied.text();

    // If upstream returned HTML or the body starts with '<', surface a helpful error with snippet
    if (contentType.includes('text/html') || /^\s*</.test(text)) {
      console.error('Upstream returned HTML instead of proxy list. First bytes:', text.slice(0, 500));
      return res.status(502).json({
        error: 'Upstream returned HTML instead of text list. Check token or upstream URL.',
        snippet: text.slice(0, 1000)
      });
    }

    // Return as plain text
    res.type('text/plain').send(text);
  } catch (err) {
    console.error('Fetch error', err);
    res.status(502).json({ error: 'Bad gateway', message: String(err) });
  }
});

// Fallback: si ninguna ruta coincide, enviar index.html (SPA-friendly)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
