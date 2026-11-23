'use strict';

/* ================= 顾客端逻辑 ================= */

const LS_KEY = 'style-pick-selection-v1';
let data = { categories: [], products: [] };
let currentCategory = '';
let currentSearch = '';
let selected = new Set(loadSelection());

// 商品详情画廊状态
let detailProduct = null;
let detailIndex = 0;

const $ = (sel) => document.querySelector(sel);
const els = {
  searchInput: $('#searchInput'),
  searchClear: $('#searchClear'),
  catTabs: $('#catTabs'),
  productGrid: $('#productGrid'),
  emptyState: $('#emptyState'),
  catalogTitle: $('#catalogTitle'),
  catalogCount: $('#catalogCount'),
  selCount: $('#selCount'),
  drawerCount: $('#drawerCount'),
  toggleSelection: $('#toggleSelection'),
  selectionPanel: $('#selectionPanel'),
  closeSelection: $('#closeSelection'),
  selectionList: $('#selectionList'),
  submitSelection: $('#submitSelection'),
  copySelection: $('#copySelection'),
  clearSelection: $('#clearSelection'),
  detailModal: $('#detailModal'),
  detailClose: $('#detailClose'),
  detailImg: $('#detailImg'),
  detailThumbs: $('#detailThumbs'),
  detailName: $('#detailName'),
  detailMeta: $('#detailMeta'),
  detailSelect: $('#detailSelect'),
  prevImg: $('#prevImg'),
  nextImg: $('#nextImg'),
  submitModal: $('#submitModal'),
  submitClose: $('#submitClose'),
  subName: $('#subName'),
  subContact: $('#subContact'),
  subRemark: $('#subRemark'),
  submitBtn: $('#submitBtn'),
  toast: $('#toast'),
};

/* ================= 工具 ================= */
function catName(id) {
  const c = data.categories.find((c) => c.id === id);
  return c ? c.name : (id || '未分类');
}
function prodName(p) { return p.name || '未命名款式'; }
function prodMeta(p) {
  const parts = [];
  if (p.price) parts.push('¥' + p.price);
  if (p.code) parts.push('货号 ' + p.code);
  parts.push(catName(p.category));
  return parts.join(' · ');
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { els.toast.hidden = true; }, 2200);
}

function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveSelection() {
  localStorage.setItem(LS_KEY, JSON.stringify([...selected]));
}

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ('请求失败 (' + res.status + ')'));
  return body;
}

/* ================= 分类 ================= */
function renderCats() {
  els.catTabs.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'cat-tab' + (currentCategory === '' ? ' active' : '');
  all.textContent = '全部';
  all.onclick = () => { currentCategory = ''; renderCats(); renderGrid(); };
  els.catTabs.appendChild(all);

  for (const c of data.categories) {
    const b = document.createElement('button');
    b.className = 'cat-tab' + (currentCategory === c.id ? ' active' : '');
    b.textContent = c.name;
    b.onclick = () => { currentCategory = c.id; renderCats(); renderGrid(); };
    els.catTabs.appendChild(b);
  }
}

/* ================= 商品网格 ================= */
function filteredProducts() {
  const q = currentSearch.trim().toLowerCase();
  return data.products.filter((p) => {
    if (currentCategory && p.category !== currentCategory) return false;
    if (q) {
      const hay = (prodName(p) + ' ' + (p.code || '') + ' ' + catName(p.category)).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const list = filteredProducts();
  els.productGrid.innerHTML = '';
  els.catalogTitle.textContent = currentCategory ? catName(currentCategory) : '全部款式';
  els.catalogCount.textContent = `共 ${list.length} 款`;
  els.emptyState.hidden = list.length !== 0;
  for (const p of list) els.productGrid.appendChild(buildCard(p));
  updateCounts();
}

function buildCard(p) {
  const card = document.createElement('div');
  card.className = 'card';

  const media = document.createElement('div');
  media.className = 'card-media';
  if (p.images && p.images.length) {
    const img = document.createElement('img');
    img.src = p.images[0]; img.alt = prodName(p); img.loading = 'lazy';
    img.onerror = () => { img.style.display = 'none'; media.innerHTML = '<div class="no-img">暂无图片</div>'; };
    media.appendChild(img);
    media.onclick = () => openDetail(p);
  } else {
    media.innerHTML = '<div class="no-img">暂无图片</div>';
  }
  if (p.code) {
    const code = document.createElement('span');
    code.className = 'card-code'; code.textContent = p.code;
    media.appendChild(code);
  }
  if (p.images && p.images.length > 1) {
    const tag = document.createElement('span');
    tag.className = 'card-multi'; tag.textContent = `${p.images.length} 图`;
    media.appendChild(tag);
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  const name = document.createElement('div');
  name.className = 'card-name'; name.textContent = prodName(p);
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const price = document.createElement('span');
  price.className = 'card-price' + (p.price ? '' : ' na');
  price.textContent = p.price ? '¥' + p.price : '价格面议';
  const cat = document.createElement('span');
  cat.className = 'card-cat'; cat.textContent = catName(p.category);
  meta.append(price, cat);

  const btn = document.createElement('button');
  const isSel = selected.has(p.id);
  btn.className = 'select-btn' + (isSel ? ' selected' : '');
  btn.textContent = isSel ? '✓ 已选中' : '＋ 选这款';
  btn.onclick = () => toggleSelect(p, btn);

  body.append(name, meta, btn);
  card.append(media, body);
  return card;
}

function toggleSelect(p, btn) {
  if (selected.has(p.id)) {
    selected.delete(p.id);
    if (btn) { btn.classList.remove('selected'); btn.textContent = '＋ 选这款'; }
  } else {
    selected.add(p.id);
    if (btn) { btn.classList.add('selected'); btn.textContent = '✓ 已选中'; }
  }
  saveSelection();
  renderSelection();
  updateCounts();
  if (detailProduct && detailProduct.id === p.id) renderDetailSelectBtn();
}

function updateCounts() {
  const n = selected.size;
  els.selCount.textContent = n;
  els.drawerCount.textContent = n;
}

/* ================= 商品详情画廊 ================= */
function openDetail(p) {
  detailProduct = p;
  detailIndex = 0;
  els.detailModal.hidden = false;
  document.body.style.overflow = 'hidden';
  renderDetail();
}

function closeDetail() {
  els.detailModal.hidden = true;
  detailProduct = null;
  document.body.style.overflow = '';
}

function renderDetail() {
  if (!detailProduct) return;
  const images = detailProduct.images || [];
  els.detailImg.src = images[detailIndex] || '';
  els.detailName.textContent = prodName(detailProduct);
  els.detailMeta.textContent = prodMeta(detailProduct);
  els.prevImg.style.visibility = images.length > 1 ? 'visible' : 'hidden';
  els.nextImg.style.visibility = images.length > 1 ? 'visible' : 'hidden';
  renderDetailThumbs();
  renderDetailSelectBtn();
}

function renderDetailThumbs() {
  els.detailThumbs.innerHTML = '';
  const images = detailProduct.images || [];
  if (images.length <= 1) { els.detailThumbs.hidden = true; return; }
  els.detailThumbs.hidden = false;
  images.forEach((src, i) => {
    const t = document.createElement('img');
    t.src = src;
    t.className = 'detail-thumb' + (i === detailIndex ? ' active' : '');
    t.onclick = () => { detailIndex = i; renderDetail(); };
    els.detailThumbs.appendChild(t);
  });
}

function renderDetailSelectBtn() {
  if (!detailProduct) return;
  const isSel = selected.has(detailProduct.id);
  els.detailSelect.textContent = isSel ? '✓ 已选中' : '＋ 选这款';
  els.detailSelect.classList.toggle('selected', isSel);
}

/* ================= 已选清单 ================= */
function renderSelection() {
  const items = data.products.filter((p) => selected.has(p.id));
  els.selectionList.innerHTML = '';
  if (items.length === 0) {
    els.selectionList.innerHTML = '<div class="selection-empty">还没有选中的款式<br/>去逛逛，点「＋ 选这款」吧</div>';
    return;
  }
  for (const p of items) {
    const row = document.createElement('div');
    row.className = 'sel-item';
    const img = document.createElement('img');
    img.src = (p.images && p.images[0]) || '';
    img.onerror = () => { img.style.visibility = 'hidden'; };
    const info = document.createElement('div');
    info.className = 'sel-info';
    const nm = document.createElement('div');
    nm.className = 'sel-name'; nm.textContent = prodName(p);
    const sub = document.createElement('div');
    sub.className = 'sel-sub';
    const parts = [];
    if (p.price) parts.push('¥' + p.price);
    if (p.code) parts.push('货号 ' + p.code);
    parts.push(catName(p.category));
    sub.textContent = parts.join(' · ');
    info.append(nm, sub);
    const del = document.createElement('button');
    del.className = 'sel-del'; del.textContent = '×'; del.title = '移除';
    del.onclick = () => { selected.delete(p.id); saveSelection(); renderSelection(); renderGrid(); };
    row.append(img, info, del);
    els.selectionList.appendChild(row);
  }
  updateCounts();
}

function buildSelectionText() {
  const items = data.products.filter((p) => selected.has(p.id));
  const lines = [`选款清单（共 ${items.length} 款）`];
  items.forEach((p, i) => {
    const seg = [];
    seg.push(prodName(p));
    if (p.code) seg.push('货号 ' + p.code);
    if (p.price) seg.push('¥' + p.price);
    seg.push(catName(p.category));
    lines.push(`${i + 1}. ${seg.join(' — ')}`);
  });
  return lines.join('\n');
}

async function copySelection() {
  if (selected.size === 0) { toast('还没有选中的款式'); return; }
  const text = buildSelectionText();
  try {
    await navigator.clipboard.writeText(text);
    toast('选款清单已复制');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast('选款清单已复制');
  }
}

/* ================= 提交选款 ================= */
function openSubmit() {
  if (selected.size === 0) { toast('还没有选中的款式'); return; }
  els.subName.value = '';
  els.subContact.value = '';
  els.subRemark.value = '';
  els.submitModal.hidden = false;
  els.selectionPanel.hidden = true;
  document.body.style.overflow = 'hidden';
}

function closeSubmit() {
  els.submitModal.hidden = true;
  document.body.style.overflow = '';
}

async function submitSelection() {
  els.submitBtn.disabled = true;
  try {
    await api('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: els.subName.value.trim(),
        contact: els.subContact.value.trim(),
        remark: els.subRemark.value.trim(),
        items: [...selected],
      }),
    });
    toast('选款已提交，姐姐会收到通知');
    selected.clear();
    saveSelection();
    renderSelection();
    renderGrid();
    closeSubmit();
  } catch (e) {
    toast(e.message);
  } finally {
    els.submitBtn.disabled = false;
  }
}

/* ================= 初始化 ================= */
async function init() {
  try {
    const res = await api('/api/data');
    data.categories = res.categories || [];
    data.products = res.products || [];
  } catch (e) {
    toast('加载失败：' + e.message);
  }
  renderCats();
  renderGrid();
  renderSelection();

  let debounce;
  els.searchInput.addEventListener('input', () => {
    els.searchClear.hidden = !els.searchInput.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => { currentSearch = els.searchInput.value; renderGrid(); }, 180);
  });
  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = ''; currentSearch = ''; els.searchClear.hidden = true; renderGrid();
  });
  els.searchClear.hidden = true;

  // 选款抽屉
  els.toggleSelection.onclick = () => { els.selectionPanel.hidden = false; renderSelection(); };
  els.closeSelection.onclick = () => { els.selectionPanel.hidden = true; };
  els.copySelection.onclick = copySelection;
  els.clearSelection.onclick = () => {
    if (selected.size === 0) { toast('已是空的'); return; }
    if (confirm('确定清空所有已选款式吗？')) { selected.clear(); saveSelection(); renderSelection(); renderGrid(); }
  };
  els.submitSelection.onclick = openSubmit;

  // 详情画廊
  els.detailClose.onclick = closeDetail;
  els.prevImg.onclick = () => {
    if (!detailProduct) return;
    const n = detailProduct.images.length;
    detailIndex = (detailIndex - 1 + n) % n;
    renderDetail();
  };
  els.nextImg.onclick = () => {
    if (!detailProduct) return;
    const n = detailProduct.images.length;
    detailIndex = (detailIndex + 1) % n;
    renderDetail();
  };
  els.detailSelect.onclick = () => {
    if (!detailProduct) return;
    toggleSelect(detailProduct, null);
  };
  els.detailModal.addEventListener('click', (e) => { if (e.target === els.detailModal) closeDetail(); });

  // 提交表单
  els.submitClose.onclick = closeSubmit;
  els.submitBtn.onclick = submitSelection;
  els.submitModal.addEventListener('click', (e) => { if (e.target === els.submitModal) closeSubmit(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.selectionPanel.hidden = true;
      closeDetail();
      closeSubmit();
    }
  });
}

init();
