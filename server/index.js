const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const WS_TOKEN = process.env.WS_TOKEN || '';

app.use(cors());
app.use(express.json());

if (!WS_TOKEN) {
  console.warn('Warning: WS_TOKEN is not set. Set WS_TOKEN in environment or .env file.');
}

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

// Proxy endpoint for downloading proxy list (returns plain text)
app.get('/api/proxies', async (req, res) => {
  if (!WS_TOKEN) return res.status(500).send('Server token not configured');
  try {
    const api = `https://proxy.webshare.io/api/v2/proxy/list/download/${encodeURIComponent(WS_TOKEN)}/-/any/username/direct/-/?plan_id=12553212`;
    const proxied = await fetch(api, { headers: { 'Authorization': `Token ${WS_TOKEN}` } });
    if (!proxied.ok) return res.status(502).send('Upstream error');
    const text = await proxied.text();
    res.type('text/plain').send(text);
  } catch (err) {
    console.error(err);
    res.status(502).send('Bad gateway');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
