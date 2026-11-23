'use strict';
// 一次性迁移脚本：把本地 data/products.json 的分类与商品（含图片）导入 Supabase
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'supabase.config.json'), 'utf-8'));
const URL = config.url.replace(/\/+$/, '');
const KEY = config.key;
const BUCKET = 'products';
const PUBLIC_DIR = path.join(ROOT, 'public');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf-8'));

const IMAGE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

async function sb(method, p, body) {
  const res = await fetch(URL + p, {
    method,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch (e) {} }
  if (!res.ok) throw new Error((json && (json.message || json.error)) || text || ('HTTP ' + res.status));
  return json;
}

async function uploadLocalFile(relPath) {
  const full = path.join(PUBLIC_DIR, relPath.replace(/\//g, path.sep));
  const buf = fs.readFileSync(full);
  const ext = path.extname(relPath).slice(1).toLowerCase();
  const name = 'seed_' + path.basename(relPath);
  const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': IMAGE_MIME[ext] || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) throw new Error('上传失败 ' + relPath + ': ' + (await res.text()));
  return `${URL}/storage/v1/object/public/${BUCKET}/${name}`;
}

(async () => {
  // 防重复：已有商品则跳过
  const existing = await sb('GET', '/rest/v1/products?select=id&limit=1');
  if (existing.length) {
    console.log('products 表已有数据，跳过导入（避免重复）。如需重导请先在 Supabase 清空四张表。');
    return;
  }

  for (const c of data.categories) {
    await sb('POST', '/rest/v1/categories', { id: c.id, name: c.name });
    console.log('分类:', c.id, c.name);
  }

  const base = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    const srcImages = (Array.isArray(p.images) && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const images = [];
    for (const img of srcImages) {
      if (!img) continue;
      images.push(img.startsWith('http') ? img : await uploadLocalFile(img));
    }
    const row = {
      id: p.id,
      category: p.category || '',
      name: p.name || '',
      code: p.code || '',
      price: p.price || '',
      description: p.desc || '',
      images,
      created_at: new Date(base - i * 1000).toISOString(),
    };
    await sb('POST', '/rest/v1/products', row);
    console.log(`商品 ${i + 1}/${data.products.length}: ${p.id}（${images.length} 图）`);
  }

  console.log('迁移完成 ✅');
})().catch((e) => { console.error('迁移失败:', e.message); process.exit(1); });
