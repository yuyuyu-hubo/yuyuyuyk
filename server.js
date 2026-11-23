'use strict';

/**
 * 团子的秘密花园 · 后端服务
 * 数据与图片存储在 Supabase（云端），本服务负责业务逻辑、鉴权与微信推送。
 * 零第三方依赖，直接 `node server.js` 运行。
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const LOCAL_CONFIG_FILE = path.join(DATA_DIR, 'supabase.config.json');

// ---------- Supabase 配置：优先读环境变量（Render 用），本地回退到配置文件 ----------
function readLocalSupabaseConfig() {
  try {
    if (fs.existsSync(LOCAL_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) { /* 忽略 */ }
  return {};
}
const localCfg = readLocalSupabaseConfig();
const SUPABASE_URL = (process.env.SUPABASE_URL || localCfg.url || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || localCfg.key || '';
const SUPABASE_BUCKET = 'products';

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 40 * 1024 * 1024; // 40MB，容纳多张 base64 图片

// 商家端访问密码
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const SESSION_COOKIE = 'merchant_session';
const sessions = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const IMAGE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

// ---------- Supabase REST 工具 ----------
async function sb(method, path, body, extraHeaders) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
  const res = await fetch(SUPABASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch (e) { /* 非 JSON */ } }
  if (!res.ok) {
    const msg = json && (json.message || json.error) ? (json.message || json.error) : (text || ('Supabase ' + res.status));
    throw new Error(msg);
  }
  return json;
}

function genId(prefix) {
  return prefix + crypto.randomBytes(4).toString('hex');
}

function catNameById(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.name : (id || '未分类');
}

// ---------- 数据映射 ----------
function rowToProduct(r) {
  return {
    id: r.id,
    category: r.category || '',
    name: r.name || '',
    code: r.code || '',
    price: r.price || '',
    desc: r.description || '',
    images: Array.isArray(r.images) ? r.images : [],
    createdAt: r.created_at || '',
  };
}
function productToRow(p) {
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    code: p.code,
    price: p.price,
    description: p.desc,
    images: p.images,
    created_at: p.createdAt || new Date().toISOString(),
  };
}

// ---------- HTTP 工具 ----------
function send(res, status, body, contentType) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': contentType || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function sendError(res, status, message) {
  send(res, status, { ok: false, error: message });
}

// ---------- 会话 / 认证 ----------
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isAuthed(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  return !!token && sessions.has(token);
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); }
      catch (e) { reject(new Error('JSON 解析失败')); }
    });
    req.on('error', reject);
  });
}

// ---------- 图片存储（Supabase Storage） ----------
async function uploadImageToStorage(buf, ext, filename) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': IMAGE_MIME[ext] || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('图片上传失败: ' + t);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
}

async function deleteImageFromStorage(publicUrl) {
  const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return;
  const filename = publicUrl.slice(i + marker.length);
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    });
  } catch (e) { /* 忽略 */ }
}

async function saveBase64Image(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('图片格式不支持，仅支持 png/jpg/gif/webp');
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length === 0) throw new Error('图片数据为空');
  const name = 'up_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex') + '.' + ext;
  return uploadImageToStorage(buf, ext, name);
}

async function processImages(input) {
  const list = Array.isArray(input) ? input : (input ? [input] : []);
  const out = [];
  for (const img of list) {
    if (typeof img !== 'string') continue;
    const s = img.trim();
    if (!s) continue;
    out.push(s.startsWith('data:image/') ? await saveBase64Image(s) : s);
  }
  return out;
}

async function deleteUploadedImages(prod) {
  const images = (Array.isArray(prod.images) ? prod.images : []).filter(Boolean);
  for (const url of images) {
    if (typeof url === 'string') await deleteImageFromStorage(url);
  }
}

// ---------- 业务逻辑 ----------
async function readData() {
  const [cats, prods] = await Promise.all([
    sb('GET', '/rest/v1/categories?select=*&order=name.asc'),
    sb('GET', '/rest/v1/products?select=*&order=created_at.desc'),
  ]);
  return {
    categories: cats.map((c) => ({ id: c.id, name: c.name })),
    products: prods.map(rowToProduct),
  };
}

async function addProduct(body) {
  const images = await processImages(body.images !== undefined ? body.images : body.image);
  const data = await readData();

  let catId = body.category;
  const exists = data.categories.some((c) => c.id === catId);
  if (!exists) {
    const catName = (typeof body.category === 'string' ? body.category : '').trim();
    if (catName) {
      catId = genId('cat');
      await sb('POST', '/rest/v1/categories', { id: catId, name: catName });
    } else {
      catId = '';
    }
  }

  const product = {
    id: genId('p'),
    category: catId || '',
    name: (typeof body.name === 'string' ? body.name : '').trim(),
    code: (typeof body.code === 'string' ? body.code : '').trim(),
    price: (typeof body.price === 'string' ? body.price : '').trim(),
    desc: (typeof body.desc === 'string' ? body.desc : '').trim(),
    images,
    createdAt: new Date().toISOString(),
  };
  await sb('POST', '/rest/v1/products', productToRow(product));
  return product;
}

async function updateProduct(id, body) {
  const rows = await sb('GET', `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) return null;

  const rowUpd = {};
  for (const k of ['name', 'code', 'price', 'category']) {
    if (typeof body[k] === 'string') rowUpd[k] = body[k].trim();
  }
  if (typeof body.desc === 'string') rowUpd.description = body.desc.trim();
  if (body.images !== undefined || body.image !== undefined) {
    rowUpd.images = await processImages(body.images !== undefined ? body.images : body.image);
  }
  if (Object.keys(rowUpd).length) {
    await sb('PATCH', `/rest/v1/products?id=eq.${encodeURIComponent(id)}`, rowUpd);
  }
  const after = await sb('GET', `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`);
  return after.length ? rowToProduct(after[0]) : null;
}

async function deleteProduct(id) {
  const rows = await sb('GET', `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) return false;
  await sb('DELETE', `/rest/v1/products?id=eq.${encodeURIComponent(id)}`);
  await deleteUploadedImages(rowToProduct(rows[0]));
  return true;
}

async function addCategory(name) {
  const existing = await sb('GET', `/rest/v1/categories?name=eq.${encodeURIComponent(name)}&select=*`);
  if (existing.length) return { id: existing[0].id, name: existing[0].name };
  const cat = { id: genId('cat'), name };
  await sb('POST', '/rest/v1/categories', cat);
  return cat;
}

async function deleteCategory(id) {
  const rows = await sb('GET', `/rest/v1/categories?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) return null;
  const prods = await sb('GET', `/rest/v1/products?category=eq.${encodeURIComponent(id)}&select=id`);
  const moved = prods.length;
  if (moved > 0) {
    await sb('PATCH', `/rest/v1/products?category=eq.${encodeURIComponent(id)}`, { category: '' });
  }
  await sb('DELETE', `/rest/v1/categories?id=eq.${encodeURIComponent(id)}`);
  return { name: rows[0].name, moved };
}

async function readSubmissions() {
  const rows = await sb('GET', '/rest/v1/submissions?select=*&order=created_at.desc');
  return rows.map((r) => ({
    id: r.id, name: r.name, contact: r.contact, remark: r.remark,
    items: Array.isArray(r.items) ? r.items : [], createdAt: r.created_at,
  }));
}

async function addSubmission(sub) {
  await sb('POST', '/rest/v1/submissions', {
    id: sub.id, name: sub.name, contact: sub.contact, remark: sub.remark,
    items: sub.items, created_at: sub.createdAt,
  });
}

async function readConfig() {
  const rows = await sb('GET', '/rest/v1/config?select=*');
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

async function writeConfig(cfg) {
  for (const [k, v] of Object.entries(cfg)) {
    const existing = await sb('GET', `/rest/v1/config?key=eq.${encodeURIComponent(k)}&select=key`);
    if (existing.length) {
      await sb('PATCH', `/rest/v1/config?key=eq.${encodeURIComponent(k)}`, { value: v });
    } else {
      await sb('POST', '/rest/v1/config', { key: k, value: v });
    }
  }
}

// ---------- 静态文件 ----------
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    return sendError(res, 403, '禁止访问');
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      if (err.code === 'ENOENT') return send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
      return sendError(res, 500, '读取文件失败');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---------- Server酱（微信推送） ----------
function sendServerChan(sendKey, title, desp) {
  return new Promise((resolve) => {
    if (!sendKey) return resolve({ ok: false, error: '未配置 SendKey' });
    const postData = querystring.stringify({ title, desp });
    const url = `https://sctapi.ftqq.com/${sendKey}.send`;
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 8000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: '超时' }); });
    req.write(postData);
    req.end();
  });
}

function buildSubmissionDesp(sub) {
  const lines = [];
  if (sub.name) lines.push(`**顾客**：${sub.name}`);
  if (sub.contact) lines.push(`**联系方式**：${sub.contact}`);
  if (sub.remark) lines.push(`**备注**：${sub.remark}`);
  lines.push('');
  lines.push(`**选款清单（共 ${sub.items.length} 款）**`);
  sub.items.forEach((it, i) => {
    const seg = [];
    seg.push(it.name || '未命名款式');
    if (it.code) seg.push('货号 ' + it.code);
    if (it.price) seg.push('¥' + it.price);
    seg.push(it.category);
    lines.push(`${i + 1}. ${seg.join(' — ')}`);
  });
  return lines.join('\n');
}

// ---------- 路由 ----------
async function handleApi(req, res, pathname, method) {
  // GET /api/data
  if (pathname === '/api/data' && method === 'GET') {
    const data = await readData();
    return send(res, 200, { ok: true, ...data });
  }

  // POST /api/login
  if (pathname === '/api/login' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (typeof body.password === 'string' && body.password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(24).toString('hex');
        sessions.add(token);
        setSessionCookie(res, token);
        return send(res, 200, { ok: true });
      }
      return sendError(res, 401, '密码错误');
    } catch (e) { return sendError(res, 400, e.message); }
  }

  // POST /api/logout
  if (pathname === '/api/logout' && method === 'POST') {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) sessions.delete(token);
    clearSessionCookie(res);
    return send(res, 200, { ok: true });
  }

  // GET /api/auth
  if (pathname === '/api/auth' && method === 'GET') {
    return send(res, 200, { ok: true, authed: isAuthed(req) });
  }

  // POST /api/submissions（公开）
  if (pathname === '/api/submissions' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) return sendError(res, 400, '请先选择至少一款商品');

      const data = await readData();
      const selected = items
        .map((id) => data.products.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ id: p.id, name: p.name, code: p.code, price: p.price, category: catNameById(data.categories, p.category) }));

      const submission = {
        id: genId('sub'),
        name: (typeof body.name === 'string' ? body.name : '').trim(),
        contact: (typeof body.contact === 'string' ? body.contact : '').trim(),
        remark: (typeof body.remark === 'string' ? body.remark : '').trim(),
        items: selected,
        createdAt: new Date().toISOString(),
      };
      await addSubmission(submission);

      const cfg = await readConfig();
      if (cfg.serverChanKey) {
        const title = `【团子的秘密花园】新选款：${submission.name || '顾客'}`;
        sendServerChan(cfg.serverChanKey, title, buildSubmissionDesp(submission))
          .then((r) => { if (!r.ok) console.error('[serverchan] 推送失败:', r.error || ('HTTP ' + r.status)); });
      }

      return send(res, 201, { ok: true, submission });
    } catch (e) { return sendError(res, 400, e.message); }
  }

  // ---- 以下需要商家端登录 ----
  if (!isAuthed(req)) return sendError(res, 401, '请先登录商家端');

  // POST /api/products
  if (pathname === '/api/products' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const product = await addProduct(body);
      return send(res, 201, { ok: true, product });
    } catch (e) { return sendError(res, 400, e.message); }
  }

  const patchMatch = /^\/api\/products\/([^/]+)$/.exec(pathname);
  if (patchMatch && method === 'PATCH') {
    try {
      const body = await readJsonBody(req);
      const product = await updateProduct(decodeURIComponent(patchMatch[1]), body);
      if (!product) return sendError(res, 404, '商品不存在');
      return send(res, 200, { ok: true, product });
    } catch (e) { return sendError(res, 400, e.message); }
  }

  if (patchMatch && method === 'DELETE') {
    const ok = await deleteProduct(decodeURIComponent(patchMatch[1]));
    if (!ok) return sendError(res, 404, '商品不存在');
    return send(res, 200, { ok: true });
  }

  // POST /api/categories
  if (pathname === '/api/categories' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const name = (typeof body.name === 'string' ? body.name : '').trim();
      if (!name) return sendError(res, 400, '分类名不能为空');
      const cat = await addCategory(name);
      return send(res, 200, { ok: true, category: cat });
    } catch (e) { return sendError(res, 400, e.message); }
  }

  const catMatch = /^\/api\/categories\/([^/]+)$/.exec(pathname);
  if (catMatch && method === 'DELETE') {
    const result = await deleteCategory(decodeURIComponent(catMatch[1]));
    if (!result) return sendError(res, 404, '分类不存在');
    return send(res, 200, { ok: true, moved: result.moved });
  }

  // GET /api/submissions
  if (pathname === '/api/submissions' && method === 'GET') {
    const subs = await readSubmissions();
    return send(res, 200, { ok: true, submissions: subs });
  }

  // GET /api/config
  if (pathname === '/api/config' && method === 'GET') {
    const cfg = await readConfig();
    return send(res, 200, { ok: true, config: cfg });
  }

  // POST /api/config
  if (pathname === '/api/config' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const cfg = await readConfig();
      if (typeof body.serverChanKey === 'string') cfg.serverChanKey = body.serverChanKey.trim();
      await writeConfig(cfg);
      return send(res, 200, { ok: true, config: cfg });
    } catch (e) { return sendError(res, 400, e.message); }
  }

  return sendError(res, 404, '接口不存在');
}

// ---------- 服务器 ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, method).catch((e) => {
      console.error('[api] 未捕获错误:', e);
      if (!res.headersSent) sendError(res, 500, e.message || '服务器错误');
    });
    return;
  }

  if ((pathname === '/merchant.html' || pathname === '/merchant') && !isAuthed(req)) {
    return serveStatic(req, res, '/login.html');
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, async () => {
  console.log('==============================================');
  console.log('  团子的秘密花园 已启动');
  console.log(`  本机访问:   http://localhost:${PORT}`);
  if (SUPABASE_URL) {
    console.log(`  数据存储:   Supabase (${SUPABASE_URL})`);
  } else {
    console.log('  [警告] 未配置 Supabase，数据读写将不可用');
  }
  console.log('  按 Ctrl+C 停止服务');
  console.log('==============================================');
  if (SUPABASE_URL) {
    try {
      const data = await readData();
      console.log(`  云端商品数: ${data.products.length}  分类数: ${data.categories.length}`);
    } catch (e) {
      console.error('  [警告] 连接 Supabase 失败:', e.message);
    }
  }
});
