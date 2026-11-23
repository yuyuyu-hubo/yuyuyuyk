'use strict';

/* ================= 商家端逻辑 ================= */

let data = { categories: [], products: [] };
let editingId = null;            // 正在编辑的商品 id（null 表示新增）
let imageList = [];              // 当前商品图片（相对路径或 base64 dataURL）

const $ = (sel) => document.querySelector(sel);
const els = {
  imgPickArea: $('#imgPickArea'),
  imgAdd: $('#imgAdd'),
  imgThumbs: $('#imgThumbs'),
  fileInput: $('#fileInput'),
  fName: $('#fName'),
  fCategory: $('#fCategory'),
  fCode: $('#fCode'),
  fPrice: $('#fPrice'),
  fDesc: $('#fDesc'),
  submitProduct: $('#submitProduct'),
  formMsg: $('#formMsg'),
  manageList: $('#manageList'),
  manageCount: $('#manageCount'),
  newCatName: $('#newCatName'),
  addCatBtn: $('#addCatBtn'),
  catList: $('#catList'),
  subList: $('#subList'),
  subCount: $('#subCount'),
  serverChanKey: $('#serverChanKey'),
  saveConfigBtn: $('#saveConfigBtn'),
  configMsg: $('#configMsg'),
  toast: $('#toast'),
};

/* ================= 工具 ================= */
function catName(id) {
  const c = data.categories.find((c) => c.id === id);
  return c ? c.name : (id || '未分类');
}
function prodName(p) { return p.name || '未命名款式'; }

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { els.toast.hidden = true; }, 2000);
}

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ('请求失败 (' + res.status + ')'));
  return body;
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ''; }
}

/* ================= 分类下拉 & 管理 ================= */
function renderCategorySelect() {
  els.fCategory.innerHTML = '<option value="">— 选择分类 —</option>';
  for (const c of data.categories) {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    els.fCategory.appendChild(o);
  }
}

function renderCatList() {
  els.catList.innerHTML = '';
  if (data.categories.length === 0) {
    els.catList.innerHTML = '<p class="muted">还没有分类，先在上方新增一个吧。</p>';
    return;
  }
  for (const c of data.categories) {
    const count = data.products.filter((p) => p.category === c.id).length;
    const row = document.createElement('div');
    row.className = 'cat-item';
    const info = document.createElement('div');
    info.className = 'cat-item-info';
    const nm = document.createElement('span');
    nm.className = 'cat-item-name'; nm.textContent = c.name;
    const cnt = document.createElement('span');
    cnt.className = 'muted'; cnt.textContent = `${count} 件商品`;
    info.append(nm, cnt);
    const del = document.createElement('button');
    del.className = 'mini-btn danger'; del.textContent = '删除';
    del.onclick = () => removeCategory(c, count);
    row.append(info, del);
    els.catList.appendChild(row);
  }
}

async function removeCategory(c, count) {
  const tip = count > 0
    ? `确定删除分类「${c.name}」吗？该分类下 ${count} 件商品将归入「未分类」。`
    : `确定删除分类「${c.name}」吗？`;
  if (!confirm(tip)) return;
  try {
    await api('/api/categories/' + encodeURIComponent(c.id), { method: 'DELETE' });
    toast('分类已删除');
    await reloadData();
    renderCategorySelect();
    renderCatList();
    renderManageList();
  } catch (e) {
    toast(e.message);
  }
}

async function addCategory() {
  const name = els.newCatName.value.trim();
  if (!name) { toast('请输入分类名'); return; }
  try {
    await api('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    toast('分类已新增');
    els.newCatName.value = '';
    await reloadData();
    renderCategorySelect();
    renderCatList();
  } catch (e) {
    toast(e.message);
  }
}

/* ================= 多图选择 ================= */
function renderThumbs() {
  els.imgThumbs.innerHTML = '';
  for (let i = 0; i < imageList.length; i++) {
    const src = imageList[i];
    const box = document.createElement('div');
    box.className = 'thumb';
    const img = document.createElement('img');
    img.src = src;
    const rm = document.createElement('button');
    rm.className = 'thumb-del'; rm.textContent = '×'; rm.title = '移除';
    rm.onclick = (e) => { e.stopPropagation(); imageList.splice(i, 1); renderThumbs(); };
    box.append(img, rm);
    els.imgThumbs.appendChild(box);
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ================= 表单 ================= */
function resetForm() {
  editingId = null;
  imageList = [];
  els.fName.value = ''; els.fCode.value = ''; els.fPrice.value = '';
  els.fDesc.value = ''; els.fCategory.value = '';
  els.submitProduct.textContent = '发布商品';
  els.formMsg.textContent = '';
  els.formMsg.className = 'form-msg';
  els.fileInput.value = '';
  renderThumbs();
}

function setFormMsg(msg, ok) {
  els.formMsg.textContent = msg;
  els.formMsg.className = 'form-msg ' + (ok ? 'ok' : 'err');
}

async function submitProduct() {
  els.submitProduct.disabled = true;
  try {
    if (imageList.length === 0) { setFormMsg('请至少选择一张商品图片', false); return; }
    const payload = {
      name: els.fName.value.trim(),
      code: els.fCode.value.trim(),
      price: els.fPrice.value.trim(),
      desc: els.fDesc.value.trim(),
      category: els.fCategory.value,
      images: imageList,
    };
    if (editingId) {
      await api('/api/products/' + encodeURIComponent(editingId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      toast('商品已更新');
    } else {
      await api('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      toast('商品发布成功');
    }
    await reloadData();
    renderCategorySelect();
    renderCatList();
    renderManageList();
    resetForm();
  } catch (e) {
    setFormMsg(e.message, false);
  } finally {
    els.submitProduct.disabled = false;
  }
}

/* ================= 商品管理 ================= */
function renderManageList() {
  els.manageList.innerHTML = '';
  els.manageCount.textContent = `共 ${data.products.length} 件`;
  for (const p of data.products) {
    const row = document.createElement('div');
    row.className = 'manage-item';

    const img = document.createElement('img');
    img.src = p.images[0] || '';
    img.onerror = () => { img.style.visibility = 'hidden'; };

    const info = document.createElement('div');
    info.className = 'manage-info';
    const nm = document.createElement('div');
    nm.className = 'manage-name'; nm.textContent = prodName(p);
    const sub = document.createElement('div');
    sub.className = 'manage-sub';
    const parts = [];
    if (p.price) parts.push('¥' + p.price);
    if (p.code) parts.push('货号 ' + p.code);
    parts.push(catName(p.category));
    if (p.images.length > 1) parts.push(`${p.images.length} 图`);
    sub.textContent = parts.join(' · ');
    info.append(nm, sub);

    const actions = document.createElement('div');
    actions.className = 'manage-actions';
    const edit = document.createElement('button');
    edit.className = 'mini-btn'; edit.textContent = '编辑';
    edit.onclick = () => startEdit(p);
    const del = document.createElement('button');
    del.className = 'mini-btn danger'; del.textContent = '删除';
    del.onclick = () => removeProduct(p);
    actions.append(edit, del);

    row.append(img, info, actions);
    els.manageList.appendChild(row);
  }
}

function startEdit(p) {
  editingId = p.id;
  imageList = [...p.images];
  els.fName.value = p.name || '';
  els.fCode.value = p.code || '';
  els.fPrice.value = p.price || '';
  els.fDesc.value = p.desc || '';
  els.fCategory.value = p.category || '';
  els.submitProduct.textContent = '保存修改';
  els.formMsg.textContent = '';
  els.formMsg.className = 'form-msg';
  renderThumbs();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function removeProduct(p) {
  if (!confirm(`确定删除「${prodName(p)}」吗？此操作不可恢复。`)) return;
  try {
    await api('/api/products/' + encodeURIComponent(p.id), { method: 'DELETE' });
    toast('已删除');
    await reloadData();
    renderCategorySelect();
    renderCatList();
    renderManageList();
  } catch (e) {
    toast(e.message);
  }
}

/* ================= 收到的选款 ================= */
async function renderSubList() {
  try {
    const res = await api('/api/submissions');
    const subs = res.submissions || [];
    els.subCount.textContent = `共 ${subs.length} 条`;
    els.subList.innerHTML = '';
    if (subs.length === 0) {
      els.subList.innerHTML = '<p class="muted">还没有顾客提交选款。</p>';
      return;
    }
    for (const s of subs) {
      const card = document.createElement('div');
      card.className = 'sub-item';

      const head = document.createElement('div');
      head.className = 'sub-item-head';
      const who = document.createElement('span');
      who.className = 'sub-item-name'; who.textContent = s.name || '匿名顾客';
      const time = document.createElement('span');
      time.className = 'muted'; time.textContent = fmtTime(s.createdAt);
      head.append(who, time);

      const contact = document.createElement('div');
      contact.className = 'sub-item-contact';
      if (s.contact) contact.textContent = '联系方式：' + s.contact;

      const items = document.createElement('ol');
      items.className = 'sub-item-items';
      for (const it of s.items) {
        const li = document.createElement('li');
        const seg = [];
        seg.push(it.name || '未命名款式');
        if (it.code) seg.push('货号 ' + it.code);
        if (it.price) seg.push('¥' + it.price);
        li.textContent = seg.join(' — ');
        items.appendChild(li);
      }

      const remark = document.createElement('div');
      remark.className = 'sub-item-remark';
      if (s.remark) remark.textContent = '备注：' + s.remark;

      card.append(head, contact, items, remark);
      els.subList.appendChild(card);
    }
  } catch (e) {
    els.subList.innerHTML = '<p class="muted">加载选款失败：' + e.message + '</p>';
  }
}

/* ================= 微信推送配置 ================= */
async function loadConfig() {
  try {
    const res = await api('/api/config');
    els.serverChanKey.value = (res.config && res.config.serverChanKey) || '';
  } catch (e) { /* 忽略 */ }
}

async function saveConfig() {
  const key = els.serverChanKey.value.trim();
  try {
    await api('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverChanKey: key }),
    });
    els.configMsg.textContent = key ? '已保存，顾客提交选款后会推送到你的微信' : '已清空，将不再推送';
    els.configMsg.className = 'form-msg ok';
  } catch (e) {
    els.configMsg.textContent = e.message;
    els.configMsg.className = 'form-msg err';
  }
}

/* ================= 数据 ================= */
async function reloadData() {
  const res = await api('/api/data');
  data.categories = res.categories || [];
  data.products = res.products || [];
}

/* ================= 初始化 ================= */
async function init() {
  try {
    await reloadData();
  } catch (e) {
    toast('加载失败：' + e.message);
  }
  renderCategorySelect();
  renderCatList();
  renderManageList();
  renderSubList();
  loadConfig();

  // 多图选择
  els.imgAdd.onclick = () => els.fileInput.click();
  els.fileInput.onchange = async () => {
    const files = Array.from(els.fileInput.files || []);
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { toast('「' + f.name + '」超过 20MB，已跳过'); continue; }
      imageList.push(await fileToDataURL(f));
    }
    els.fileInput.value = '';
    renderThumbs();
  };
  els.submitProduct.onclick = submitProduct;
  els.addCatBtn.onclick = addCategory;
  els.newCatName.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCategory(); });
  els.saveConfigBtn.onclick = saveConfig;

  // 退出登录
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await fetch('/api/logout', { method: 'POST' }).catch(() => {});
      location.href = 'index.html';
    };
  }
}

init();
