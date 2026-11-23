// 团子的秘密花园 · Cloudflare Worker（核心逻辑，静态文件由 build-worker.js 注入）
const STATIC = __STATIC_INJECT__;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    const SUPABASE_URL = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    const SUPABASE_KEY = env.SUPABASE_KEY || '';
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '123456';
    const BUCKET = 'products';
    const SESSION_NAME = 'merchant_session';
    const SESSION_MSG = 'tuanzi-merchant-session-v1';
    const IMG_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

    function json(status, obj) {
      return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    function err(status, msg) { return json(status, { ok: false, error: msg }); }

    function genId(prefix) {
      const b = new Uint8Array(4);
      crypto.getRandomValues(b);
      return prefix + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
    }

    async function hmacHex(secret, message) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
      return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    function parseCookies(req) {
      const out = {};
      const raw = req.headers.get('cookie');
      if (!raw) return out;
      for (const part of raw.split(';')) {
        const i = part.indexOf('=');
        if (i === -1) continue;
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k) out[k] = decodeURIComponent(v);
      }
      return out;
    }

    async function isAuthed(req) {
      const token = parseCookies(req)[SESSION_NAME];
      if (!token) return false;
      return token === (await hmacHex(ADMIN_PASSWORD, SESSION_MSG));
    }

    async function sb(method, p, body) {
      const res = await fetch(SUPABASE_URL + p, {
        method,
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const t = await res.text();
      let j = null; try { j = JSON.parse(t); } catch (e) {}
      if (!res.ok) throw new Error((j && (j.message || j.error)) || t || ('Supabase ' + res.status));
      return j;
    }

    function rowToProduct(r) {
      return { id: r.id, category: r.category || '', name: r.name || '', code: r.code || '', price: r.price || '', desc: r.description || '', images: Array.isArray(r.images) ? r.images : [], createdAt: r.created_at || '' };
    }
    function productToRow(p) {
      return { id: p.id, category: p.category, name: p.name, code: p.code, price: p.price, description: p.desc, images: p.images, created_at: p.createdAt || new Date().toISOString() };
    }
    function catNameById(cats, id) {
      const c = cats.find((x) => x.id === id);
      return c ? c.name : (id || '未分类');
    }

    async function uploadImage(buf, ext, name) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': IMG_MIME[ext] || 'application/octet-stream', 'x-upsert': 'true' },
        body: buf,
      });
      if (!res.ok) throw new Error('图片上传失败: ' + (await res.text()));
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`;
    }

    async function saveBase64Image(dataUrl) {
      const m = /^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/.exec(dataUrl);
      if (!m) throw new Error('图片格式不支持');
      const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
      const bin = atob(m[3]);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return uploadImage(buf, ext, 'up_' + Date.now() + '_' + genId('') + '.' + ext);
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

    async function deleteImage(publicUrl) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const i = publicUrl.indexOf(marker);
      if (i === -1) return;
      const fn = publicUrl.slice(i + marker.length);
      try {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fn}`, {
          method: 'DELETE',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        });
      } catch (e) {}
    }
    async function deleteUploadedImages(prod) {
      for (const u of (Array.isArray(prod.images) ? prod.images : [])) {
        if (typeof u === 'string') await deleteImage(u);
      }
    }

    async function readData() {
      const [cats, prods] = await Promise.all([
        sb('GET', '/rest/v1/categories?select=*&order=name.asc'),
        sb('GET', '/rest/v1/products?select=*&order=created_at.desc'),
      ]);
      return { categories: cats.map((c) => ({ id: c.id, name: c.name })), products: prods.map(rowToProduct) };
    }

    async function addProduct(body) {
      const images = await processImages(body.images !== undefined ? body.images : body.image);
      const data = await readData();
      let catId = body.category;
      if (!data.categories.some((c) => c.id === catId)) {
        const nm = (typeof body.category === 'string' ? body.category : '').trim();
        if (nm) { catId = genId('cat'); await sb('POST', '/rest/v1/categories', { id: catId, name: nm }); }
        else catId = '';
      }
      const product = {
        id: genId('p'), category: catId || '',
        name: (typeof body.name === 'string' ? body.name : '').trim(),
        code: (typeof body.code === 'string' ? body.code : '').trim(),
        price: (typeof body.price === 'string' ? body.price : '').trim(),
        desc: (typeof body.desc === 'string' ? body.desc : '').trim(),
        images, createdAt: new Date().toISOString(),
      };
      await sb('POST', '/rest/v1/products', productToRow(product));
      return product;
    }

    async function updateProduct(id, body) {
      const rows = await sb('GET', `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`);
      if (!rows.length) return null;
      const upd = {};
      for (const k of ['name', 'code', 'price', 'category']) if (typeof body[k] === 'string') upd[k] = body[k].trim();
      if (typeof body.desc === 'string') upd.description = body.desc.trim();
      if (body.images !== undefined || body.image !== undefined) upd.images = await processImages(body.images !== undefined ? body.images : body.image);
      if (Object.keys(upd).length) await sb('PATCH', `/rest/v1/products?id=eq.${encodeURIComponent(id)}`, upd);
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
      const ex = await sb('GET', `/rest/v1/categories?name=eq.${encodeURIComponent(name)}&select=*`);
      if (ex.length) return { id: ex[0].id, name: ex[0].name };
      const cat = { id: genId('cat'), name };
      await sb('POST', '/rest/v1/categories', cat);
      return cat;
    }

    async function deleteCategory(id) {
      const rows = await sb('GET', `/rest/v1/categories?id=eq.${encodeURIComponent(id)}&select=*`);
      if (!rows.length) return null;
      const prods = await sb('GET', `/rest/v1/products?category=eq.${encodeURIComponent(id)}&select=id`);
      const moved = prods.length;
      if (moved) await sb('PATCH', `/rest/v1/products?category=eq.${encodeURIComponent(id)}`, { category: '' });
      await sb('DELETE', `/rest/v1/categories?id=eq.${encodeURIComponent(id)}`);
      return { name: rows[0].name, moved };
    }

    async function readSubmissions() {
      const rows = await sb('GET', '/rest/v1/submissions?select=*&order=created_at.desc');
      return rows.map((r) => ({ id: r.id, name: r.name, contact: r.contact, remark: r.remark, items: Array.isArray(r.items) ? r.items : [], createdAt: r.created_at }));
    }

    async function addSubmission(sub) {
      await sb('POST', '/rest/v1/submissions', { id: sub.id, name: sub.name, contact: sub.contact, remark: sub.remark, items: sub.items, created_at: sub.createdAt });
    }

    async function readConfig() {
      const rows = await sb('GET', '/rest/v1/config?select=*');
      const cfg = {};
      for (const r of rows) cfg[r.key] = r.value;
      return cfg;
    }

    async function writeConfig(cfg) {
      for (const [k, v] of Object.entries(cfg)) {
        const ex = await sb('GET', `/rest/v1/config?key=eq.${encodeURIComponent(k)}&select=key`);
        if (ex.length) await sb('PATCH', `/rest/v1/config?key=eq.${encodeURIComponent(k)}`, { value: v });
        else await sb('POST', '/rest/v1/config', { key: k, value: v });
      }
    }

    async function sendServerChan(sendKey, title, desp) {
      if (!sendKey) return;
      try {
        await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ title, desp }).toString(),
        });
      } catch (e) {}
    }

    function buildDesp(sub) {
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

    function serveStatic(p) {
      const key = (p === '/' || p === '') ? '/index.html' : p;
      const s = STATIC[key];
      if (!s) return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response(s.b, { headers: { 'Content-Type': s.t, 'Cache-Control': 'public, max-age=300' } });
    }

    async function handleApi() {
      if (pathname === '/api/data' && method === 'GET') {
        const data = await readData();
        return json(200, { ok: true, ...data });
      }

      if (pathname === '/api/login' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (typeof body.password === 'string' && body.password === ADMIN_PASSWORD) {
          const token = await hmacHex(ADMIN_PASSWORD, SESSION_MSG);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Set-Cookie': `${SESSION_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 3600}`,
            },
          });
        }
        return err(401, '密码错误');
      }

      if (pathname === '/api/logout' && method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': `${SESSION_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0` },
        });
      }

      if (pathname === '/api/auth' && method === 'GET') {
        return json(200, { ok: true, authed: await isAuthed(request) });
      }

      if (pathname === '/api/submissions' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) return err(400, '请先选择至少一款商品');
        const data = await readData();
        const selected = items.map((id) => data.products.find((p) => p.id === id)).filter(Boolean)
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
          ctx.waitUntil(sendServerChan(cfg.serverChanKey, `【团子的秘密花园】新选款：${submission.name || '顾客'}`, buildDesp(submission)));
        }
        return json(201, { ok: true, submission });
      }

      if (!(await isAuthed(request))) return err(401, '请先登录商家端');

      if (pathname === '/api/products' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return json(201, { ok: true, product: await addProduct(body) });
      }

      const patchMatch = /^\/api\/products\/([^/]+)$/.exec(pathname);
      if (patchMatch && method === 'PATCH') {
        const body = await request.json().catch(() => ({}));
        const product = await updateProduct(decodeURIComponent(patchMatch[1]), body);
        if (!product) return err(404, '商品不存在');
        return json(200, { ok: true, product });
      }
      if (patchMatch && method === 'DELETE') {
        const ok = await deleteProduct(decodeURIComponent(patchMatch[1]));
        if (!ok) return err(404, '商品不存在');
        return json(200, { ok: true });
      }

      if (pathname === '/api/categories' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const name = (typeof body.name === 'string' ? body.name : '').trim();
        if (!name) return err(400, '分类名不能为空');
        return json(200, { ok: true, category: await addCategory(name) });
      }

      const catMatch = /^\/api\/categories\/([^/]+)$/.exec(pathname);
      if (catMatch && method === 'DELETE') {
        const result = await deleteCategory(decodeURIComponent(catMatch[1]));
        if (!result) return err(404, '分类不存在');
        return json(200, { ok: true, moved: result.moved });
      }

      if (pathname === '/api/submissions' && method === 'GET') {
        return json(200, { ok: true, submissions: await readSubmissions() });
      }

      if (pathname === '/api/config' && method === 'GET') {
        return json(200, { ok: true, config: await readConfig() });
      }

      if (pathname === '/api/config' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const cfg = await readConfig();
        if (typeof body.serverChanKey === 'string') cfg.serverChanKey = body.serverChanKey.trim();
        await writeConfig(cfg);
        return json(200, { ok: true, config: cfg });
      }

      return err(404, '接口不存在');
    }

    // ===== 主路由 =====
    if (pathname.startsWith('/api/')) {
      try { return await handleApi(); }
      catch (e) { return err(500, e.message || '服务器错误'); }
    }

    if ((pathname === '/merchant.html' || pathname === '/merchant') && !(await isAuthed(request))) {
      return serveStatic('/login.html');
    }

    return serveStatic(pathname);
  },
};
