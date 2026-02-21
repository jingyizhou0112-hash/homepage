const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 4173;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf-8');

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function json(res, code, payload) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const map = { '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/script.js': 'script.js' };
  const file = map[req.url.split('?')[0]];
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const full = path.join(__dirname, file);
  const ext = path.extname(file);
  const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function normalizeOrderItems(orderItems = []) {
  return orderItems
    .map((x) => ({ name: String(x.name || ''), price: Number(x.price || 0), qty: Number(x.qty || 0) }))
    .filter((x) => x.name && x.price >= 0 && x.qty > 0);
}

function normalizeWishItems(wishItems = []) {
  return wishItems
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 100);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'GET' && u.pathname === '/api/state') {
    const room = (u.searchParams.get('room') || 'A01').toUpperCase();
    const store = readStore();
    const state = store[room] || { room, orderItems: [], wishItems: [], updatedAt: new Date().toISOString() };
    return json(res, 200, state);
  }

  if (req.method === 'POST' && u.pathname === '/api/state') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const room = String(payload.room || 'A01').trim().toUpperCase();
        const orderItems = normalizeOrderItems(payload.orderItems || payload.items || []);
        const wishItems = normalizeWishItems(payload.wishItems || []);
        const store = readStore();
        store[room] = { room, orderItems, wishItems, updatedAt: new Date().toISOString() };
        writeStore(store);
        json(res, 200, { ok: true, state: store[room] });
      } catch {
        json(res, 400, { ok: false, message: 'Invalid JSON' });
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running: http://${HOST}:${PORT}`);
});
