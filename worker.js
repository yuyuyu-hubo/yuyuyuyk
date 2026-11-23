// 团子的秘密花园 · Cloudflare Worker（核心逻辑，静态文件由 build-worker.js 注入）
const STATIC = {
  "/index.html": { t: "text/html; charset=utf-8", b: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>团子的秘密花园 · 顾客端</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <!-- 顶部栏 -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <img src="assets/logo.svg" class="brand-logo" alt="团子的秘密花园" />
        <div class="brand-text">
          <h1>团子的秘密花园</h1>
          <p>挑你喜欢的款式</p>
        </div>
      </div>

      <div class="search-box">
        <input id="searchInput" type="text" placeholder="搜索款式 / 货号…" autocomplete="off" />
        <button id="searchClear" class="search-clear" title="清除">×</button>
      </div>

      <div class="topbar-actions">
        <button id="toggleSelection" class="btn btn-ghost">
          <span>已选款式</span>
          <span id="selCount" class="badge">0</span>
        </button>
        <a href="merchant.html" class="btn btn-sister"><span class="heart">♥</span> 姐姐入口</a>
      </div>
    </div>
  </header>

  <!-- 分类导航 -->
  <nav class="cats">
    <div class="cats-inner" id="catTabs">
      <button class="cat-tab active" data-cat="">全部</button>
    </div>
  </nav>

  <!-- 主内容 -->
  <main class="layout">
    <section class="catalog">
      <div class="catalog-head">
        <h2 id="catalogTitle">全部款式</h2>
        <span id="catalogCount" class="muted"></span>
      </div>
      <div id="productGrid" class="grid"></div>
      <div id="emptyState" class="empty" hidden>
        <p>没有找到相关商品</p>
      </div>
    </section>

    <!-- 已选款式抽屉 -->
    <aside id="selectionPanel" class="drawer" hidden>
      <div class="drawer-head">
        <h2>已选款式 <span id="drawerCount" class="badge">0</span></h2>
        <button id="closeSelection" class="icon-btn" title="关闭">×</button>
      </div>
      <div id="selectionList" class="selection-list"></div>
      <div class="drawer-foot">
        <button id="submitSelection" class="btn btn-primary">提交选款</button>
        <button id="copySelection" class="btn btn-secondary">复制清单</button>
        <button id="clearSelection" class="btn btn-ghost">清空</button>
      </div>
    </aside>
  </main>

  <!-- 商品详情画廊 -->
  <div id="detailModal" class="detail-overlay" hidden>
    <div class="detail-box">
      <button id="detailClose" class="icon-btn detail-close" title="关闭">×</button>
      <div class="detail-stage">
        <button id="prevImg" class="nav-arrow" title="上一张">‹</button>
        <img id="detailImg" alt="" />
        <button id="nextImg" class="nav-arrow" title="下一张">›</button>
      </div>
      <div id="detailThumbs" class="detail-thumbs"></div>
      <div class="detail-info">
        <div id="detailName" class="detail-name"></div>
        <div id="detailMeta" class="detail-meta muted"></div>
      </div>
      <button id="detailSelect" class="btn btn-primary btn-block">＋ 选这款</button>
    </div>
  </div>

  <!-- 提交选款表单 -->
  <div id="submitModal" class="detail-overlay" hidden>
    <div class="submit-box">
      <h3>提交选款</h3>
      <p class="muted">填写联系方式，姐姐会在微信上收到你的选款清单</p>
      <input id="subName" type="text" placeholder="你的称呼（如：小明）" autocomplete="off" />
      <input id="subContact" type="text" placeholder="微信号 / 手机号" autocomplete="off" />
      <textarea id="subRemark" rows="2" placeholder="备注（可选）"></textarea>
      <button id="submitBtn" class="btn btn-primary btn-block">提交</button>
      <button id="submitClose" class="btn btn-ghost btn-block">取消</button>
    </div>
  </div>

  <div id="toast" class="toast" hidden></div>

  <script src="js/customer.js"></script>
</body>
</html>
` },
  "/merchant.html": { t: "text/html; charset=utf-8", b: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>团子的秘密花园 · 姐姐专区</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <!-- 顶部栏 -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <img src="assets/logo.svg" class="brand-logo" alt="团子的秘密花园" />
        <div class="brand-text">
          <h1>团子的秘密花园</h1>
          <p>姐姐专区 · 上传与管理商品</p>
        </div>
      </div>
      <div class="topbar-actions">
        <button id="logoutBtn" class="btn btn-ghost">退出登录</button>
        <a href="index.html" class="btn btn-ghost">← 返回顾客端</a>
      </div>
    </div>
  </header>

  <main class="merchant-page">
    <!-- 上传表单 -->
    <section class="panel">
      <h3>上传新商品</h3>
      <div class="form-grid">
        <label class="field">
          <span>商品图片 *（可多选）</span>
          <div class="img-pick-area" id="imgPickArea">
            <div id="imgThumbs" class="img-thumbs"></div>
            <div class="img-add" id="imgAdd">
              <input id="fileInput" type="file" accept="image/*" multiple hidden />
              <span>＋ 点击选择图片（可多选）</span>
            </div>
          </div>
        </label>

        <div class="form-cols">
          <label class="field">
            <span>商品名称</span>
            <input id="fName" type="text" placeholder="例如：蕾丝短袜（可选）" />
          </label>
          <label class="field">
            <span>分类</span>
            <div class="cat-select-wrap">
              <select id="fCategory"></select>
            </div>
          </label>
          <label class="field">
            <span>货号</span>
            <input id="fCode" type="text" placeholder="例如：A-001" />
          </label>
          <label class="field">
            <span>价格（元）</span>
            <input id="fPrice" type="text" placeholder="例如：12.9" />
          </label>
        </div>

        <label class="field">
          <span>备注</span>
          <textarea id="fDesc" rows="2" placeholder="颜色 / 尺码 / 其他说明（可选）"></textarea>
        </label>
      </div>
      <button id="submitProduct" class="btn btn-primary btn-block">发布商品</button>
      <p id="formMsg" class="form-msg"></p>
    </section>

    <!-- 分类管理 -->
    <section class="panel">
      <h3>分类管理</h3>
      <div class="inline-add">
        <input id="newCatName" type="text" placeholder="新分类名，例如：家居袜" />
        <button id="addCatBtn" class="btn btn-primary">新增分类</button>
      </div>
      <div id="catList" class="cat-list"></div>
    </section>

    <!-- 商品管理列表 -->
    <section class="panel">
      <h3>已发布商品 <span id="manageCount" class="muted"></span></h3>
      <div id="manageList" class="manage-list-body"></div>
    </section>

    <!-- 收到的选款 -->
    <section class="panel">
      <h3>收到的选款 <span id="subCount" class="muted"></span></h3>
      <div id="subList" class="sub-list"></div>
    </section>

    <!-- 微信推送设置 -->
    <section class="panel">
      <h3>微信推送设置（Server酱）</h3>
      <p class="muted">顾客提交选款后，会推送到你的微信。前往 sct.ftqq.com 注册并获取 SendKey。</p>
      <div class="inline-add">
        <input id="serverChanKey" type="text" placeholder="粘贴 SendKey，如 SCTxxxxxxx" />
        <button id="saveConfigBtn" class="btn btn-primary">保存</button>
      </div>
      <p id="configMsg" class="form-msg"></p>
    </section>
  </main>

  <div id="toast" class="toast" hidden></div>

  <script src="js/merchant.js"></script>
</body>
</html>
` },
  "/login.html": { t: "text/html; charset=utf-8", b: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>姐姐登录 · 团子的秘密花园</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body class="login-body">
  <main class="login-card">
    <img src="assets/logo.svg" class="brand-logo" alt="团子的秘密花园" />
    <h1>姐姐登录</h1>
    <p class="muted">请输入访问密码</p>
    <form id="loginForm">
      <input id="password" type="password" placeholder="访问密码" autocomplete="current-password" autofocus />
      <button type="submit" class="btn btn-primary btn-block">进入商家端</button>
    </form>
    <p id="loginMsg" class="form-msg"></p>
    <a href="index.html" class="login-back muted">← 返回顾客端</a>
  </main>
  <script src="js/login.js"></script>
</body>
</html>
` },
  "/css/style.css": { t: "text/css; charset=utf-8", b: `:root {
  --primary: #ff5c8a;
  --primary-deep: #ef4f80;
  --primary-soft: #ffe4ee;
  --primary-softer: #fff0f5;
  --bg: #fff5f9;
  --card: #ffffff;
  --text: #4a3340;
  --muted: #b98ca2;
  --line: #ffe0ea;
  --radius: 16px;
  --shadow: 0 2px 12px rgba(255, 92, 138, 0.08);
  --shadow-lg: 0 14px 44px rgba(255, 92, 138, 0.18);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* 关键修复：hidden 属性强制隐藏，避免被 display:flex 覆盖 */
[hidden] { display: none !important; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
  background:
    radial-gradient(1200px 500px at 50% -10%, #ffeaf2 0%, rgba(255, 234, 242, 0) 70%),
    linear-gradient(180deg, #fff6fa 0%, #ffedf4 55%, #fff3f8 100%);
  background-attachment: fixed;
  color: var(--text);
  min-height: 100vh;
}

button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; }
a { text-decoration: none; color: inherit; }

/* ---------- 顶部栏 ---------- */
.topbar {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.topbar-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px;
}
.brand { display: flex; align-items: center; gap: 11px; flex: 0 0 auto; }
.brand-logo { width: 44px; height: 44px; flex: 0 0 auto; border-radius: 12px; }
.brand-text h1 {
  font-size: 19px; font-weight: 800; letter-spacing: 1px;
  background: linear-gradient(90deg, #ff5c8a, #ff9fb8);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.brand-text p { font-size: 12px; color: var(--muted); }

.search-box { flex: 1 1 auto; max-width: 460px; position: relative; }
.search-box input {
  width: 100%; padding: 10px 38px 10px 16px;
  border: 1.5px solid var(--line); border-radius: 999px;
  background: var(--card); font-size: 14px; outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.search-box input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(255, 92, 138, 0.1); }
.search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  border: none; background: transparent; color: var(--muted);
  font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 50%;
}
.search-clear:hover { color: var(--primary); }

.topbar-actions { display: flex; gap: 10px; align-items: center; flex: 0 0 auto; }

/* ---------- 按钮 ---------- */
.btn {
  border: none; border-radius: 12px; padding: 10px 16px;
  font-size: 14px; font-weight: 700; transition: transform .05s, box-shadow .15s, background .15s;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: linear-gradient(135deg, #ff8fb1, #ff5c8a);
  color: #fff; box-shadow: 0 4px 14px rgba(255, 92, 138, 0.28);
}
.btn-primary:hover { box-shadow: 0 6px 20px rgba(255, 92, 138, 0.4); }
.btn-ghost { background: #fff; color: var(--text); border: 1.5px solid var(--line); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
.btn-secondary { background: var(--primary-soft); color: var(--primary-deep); }
.btn-secondary:hover { background: #ffd5e4; }
.btn-block { width: 100%; }
.icon-btn {
  border: none; background: transparent; font-size: 24px; line-height: 1;
  color: var(--muted); width: 36px; height: 36px; border-radius: 50%;
}
.icon-btn:hover { background: var(--primary-softer); color: var(--text); }
.badge {
  display: inline-block; min-width: 20px; padding: 1px 6px; border-radius: 999px;
  background: var(--primary); color: #fff; font-size: 12px; text-align: center;
  margin-left: 4px;
}

/* 「姐姐入口」可爱按钮 */
.btn-sister {
  background: linear-gradient(135deg, #ff9dbc, #ff5c8a 70%);
  color: #fff; border: none; border-radius: 999px;
  padding: 10px 20px; box-shadow: 0 4px 16px rgba(255, 92, 138, 0.35);
  position: relative; overflow: hidden;
}
.btn-sister:hover {
  background: linear-gradient(135deg, #ff8fb1, #f04e7d 70%);
  box-shadow: 0 7px 22px rgba(255, 92, 138, 0.45);
  transform: translateY(-1px);
}
.btn-sister .heart {
  display: inline-block; font-size: 15px; line-height: 1;
  animation: beat 1.4s ease-in-out infinite;
}
@keyframes beat {
  0%, 100% { transform: scale(1); }
  12% { transform: scale(1.25); }
  24% { transform: scale(1); }
}

/* ---------- 分类导航 ---------- */
.cats { position: sticky; top: 65px; z-index: 40; background: rgba(255, 245, 249, 0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.cats-inner {
  max-width: 1200px; margin: 0 auto; padding: 10px 20px;
  display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none;
}
.cats-inner::-webkit-scrollbar { display: none; }
.cat-tab {
  flex: 0 0 auto; padding: 8px 16px; border: 1.5px solid var(--line);
  border-radius: 999px; background: #fff; color: var(--text); font-size: 14px;
  transition: all .15s;
}
.cat-tab:hover { border-color: var(--primary); color: var(--primary); }
.cat-tab.active {
  background: linear-gradient(135deg, #ff8fb1, #ff5c8a); color: #fff;
  border-color: transparent; box-shadow: 0 3px 10px rgba(255, 92, 138, 0.3);
}

/* ---------- 布局 ---------- */
.layout { max-width: 1200px; margin: 0 auto; padding: 22px 20px 60px; }
.catalog-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
.catalog-head h2 { font-size: 18px; }
.muted { color: var(--muted); font-size: 13px; }

.grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

/* ---------- 商品卡片 ---------- */
.card {
  background: var(--card); border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow); display: flex; flex-direction: column;
  border: 1px solid #fff3f7;
  transition: transform .12s, box-shadow .15s;
}
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
.card-media { position: relative; aspect-ratio: 4 / 5; background: #fbeef4; overflow: hidden; }
.card-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-media .no-img { display: grid; place-items: center; color: var(--muted); height: 100%; font-size: 13px; }
.card-code {
  position: absolute; top: 8px; left: 8px; background: rgba(90, 31, 56, .55); color: #fff;
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
}
.card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.card-name { font-size: 14px; font-weight: 700; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  min-height: 38px;
}
.card-meta { display: flex; align-items: center; justify-content: space-between; }
.card-price { color: var(--primary-deep); font-weight: 800; font-size: 15px; }
.card-price.na { color: var(--muted); font-weight: 400; font-size: 13px; }
.card-cat { color: var(--muted); font-size: 12px; }

.select-btn {
  margin-top: 6px; width: 100%; padding: 9px; border: 1.5px solid var(--primary);
  border-radius: 12px; background: #fff; color: var(--primary-deep);
  font-size: 14px; font-weight: 700; transition: all .15s;
}
.select-btn:hover { background: var(--primary-soft); }
.select-btn.selected {
  background: linear-gradient(135deg, #ff8fb1, #ff5c8a); color: #fff;
  border-color: transparent; box-shadow: 0 3px 10px rgba(255, 92, 138, 0.3);
}

/* ---------- 空状态 ---------- */
.empty { text-align: center; color: var(--muted); padding: 60px 0; }

/* ---------- 已选款式抽屉 ---------- */
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 340px; max-width: 92vw;
  background: var(--card); z-index: 60; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; transform: translateX(0);
  animation: slideIn .2s ease;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--line);
}
.drawer-head h2 { font-size: 16px; }
.selection-list { flex: 1; overflow-y: auto; padding: 12px 18px; }
.sel-item {
  display: flex; gap: 12px; align-items: center; padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.sel-item img { width: 52px; height: 64px; object-fit: cover; border-radius: 8px; background: #fbeef4; }
.sel-info { flex: 1; min-width: 0; }
.sel-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.sel-del { border: none; background: transparent; color: var(--muted); font-size: 18px; padding: 4px 8px; border-radius: 8px; }
.sel-del:hover { color: var(--primary); background: var(--primary-softer); }
.selection-empty { text-align: center; color: var(--muted); padding: 40px 10px; font-size: 14px; }
.drawer-foot { padding: 14px 18px; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.drawer-foot #submitSelection { grid-column: 1 / -1; }

/* ---------- 商家页面 ---------- */
.merchant-page {
  max-width: 980px; margin: 0 auto; padding: 24px 20px 60px;
  display: flex; flex-direction: column; gap: 24px;
}
.panel {
  background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
  border: 1px solid #fff3f7; padding: 22px;
}
.panel h3 { font-size: 15px; margin-bottom: 16px; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field > span { font-size: 13px; color: var(--muted); }
.field input, .field select, .field textarea {
  padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 12px;
  font-size: 14px; outline: none; background: #fff; width: 100%;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--primary); }
.field textarea { resize: vertical; }
.cat-select-wrap { display: flex; flex-direction: column; gap: 8px; }

.img-pick {
  border: 2px dashed #ffd0e0; border-radius: 14px; height: 170px;
  display: grid; place-items: center; cursor: pointer; overflow: hidden;
  color: var(--muted); font-size: 13px; background: var(--primary-softer);
  transition: border-color .15s;
}
.img-pick:hover { border-color: var(--primary); }
.img-pick img { width: 100%; height: 100%; object-fit: contain; }

.form-msg { font-size: 13px; margin-top: 10px; text-align: center; }
.form-msg.ok { color: #16a34a; }
.form-msg.err { color: var(--primary-deep); }

.manage-list-body { display: flex; flex-direction: column; gap: 10px; }
.manage-item {
  display: flex; gap: 12px; align-items: center; padding: 10px;
  border: 1px solid var(--line); border-radius: 12px;
}
.manage-item img { width: 46px; height: 58px; object-fit: cover; border-radius: 8px; background: #fbeef4; }
.manage-info { flex: 1; min-width: 0; }
.manage-name { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.manage-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.manage-actions { display: flex; gap: 6px; }
.mini-btn {
  border: 1.5px solid var(--line); background: #fff; border-radius: 8px;
  padding: 6px 10px; font-size: 12px; color: var(--text);
}
.mini-btn:hover { border-color: var(--primary); color: var(--primary); }
.mini-btn.danger:hover { border-color: var(--primary); color: var(--primary-deep); background: var(--primary-soft); }

/* ---------- 登录页 ---------- */
.login-body { display: grid; place-items: center; min-height: 100vh; padding: 20px; }
.login-card {
  width: 340px; max-width: 100%; background: var(--card); border-radius: 22px;
  box-shadow: var(--shadow-lg); border: 1px solid #fff3f7;
  padding: 34px 28px 24px; text-align: center;
  display: flex; flex-direction: column; gap: 14px;
}
.login-card .brand-logo { margin: 0 auto; width: 64px; height: 64px; }
.login-card h1 { font-size: 18px; }
.login-card form { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
.login-card input {
  width: 100%; padding: 11px 14px; border: 1.5px solid var(--line); border-radius: 12px;
  font-size: 15px; outline: none; text-align: center;
}
.login-card input:focus { border-color: var(--primary); }
.login-back { font-size: 13px; }
.login-back:hover { color: var(--primary); }

/* ---------- Toast ---------- */
.toast {
  position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%);
  background: linear-gradient(135deg, #ff8fb1, #ff5c8a); color: #fff;
  padding: 11px 22px; border-radius: 999px;
  font-size: 14px; z-index: 100; box-shadow: var(--shadow-lg);
  animation: fadeUp .2s ease;
}
@keyframes fadeUp { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ---------- 卡片多图标识 ---------- */
.card-multi {
  position: absolute; top: 8px; right: 8px; background: rgba(90, 31, 56, .55); color: #fff;
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
}

/* ---------- 商品详情画廊 ---------- */
.detail-overlay {
  position: fixed; inset: 0; background: rgba(30, 20, 26, 0.6); z-index: 80;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: fadeIn .18s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.detail-box {
  background: var(--card); border-radius: 20px; width: 460px; max-width: 100%;
  max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg);
  padding: 20px; position: relative;
}
.detail-close { position: absolute; top: 10px; right: 10px; z-index: 3; background: rgba(255,255,255,.85); }
.detail-stage { position: relative; aspect-ratio: 4 / 5; background: #fbeef4; border-radius: 14px; overflow: hidden; }
.detail-stage img { width: 100%; height: 100%; object-fit: contain; display: block; }
.nav-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; border-radius: 50%; border: none;
  background: rgba(255, 255, 255, .92); color: var(--text); font-size: 26px; line-height: 1;
  box-shadow: var(--shadow); z-index: 2; display: grid; place-items: center;
}
.nav-arrow:hover { background: #fff; color: var(--primary); }
#prevImg { left: 10px; }
#nextImg { right: 10px; }
.detail-thumbs { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px; }
.detail-thumb { width: 56px; height: 68px; object-fit: cover; border-radius: 8px; border: 2px solid transparent; cursor: pointer; flex: 0 0 auto; background: #fbeef4; }
.detail-thumb.active { border-color: var(--primary); }
.detail-info { margin: 14px 0; }
.detail-name { font-size: 17px; font-weight: 800; line-height: 1.4; }
.detail-meta { margin-top: 4px; }
.detail-select.selected { background: linear-gradient(135deg, #ff8fb1, #ff5c8a); color: #fff; border-color: transparent; }

/* ---------- 提交选款表单 ---------- */
.submit-box {
  background: var(--card); border-radius: 20px; width: 380px; max-width: 100%;
  padding: 26px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 12px;
  text-align: center;
}
.submit-box h3 { font-size: 18px; }
.submit-box input, .submit-box textarea {
  width: 100%; padding: 11px 14px; border: 1.5px solid var(--line); border-radius: 12px;
  font-size: 14px; outline: none; background: #fff; resize: vertical; text-align: left;
}
.submit-box input:focus, .submit-box textarea:focus { border-color: var(--primary); }

/* ---------- 多图选择器 ---------- */
.img-pick-area { border: 2px dashed #ffd0e0; border-radius: 14px; padding: 12px; background: var(--primary-softer); }
.img-thumbs { display: flex; flex-wrap: wrap; gap: 10px; }
.thumb { position: relative; width: 88px; height: 108px; }
.thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; background: #fff; }
.thumb-del {
  position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%;
  border: none; background: var(--primary); color: #fff; font-size: 14px; line-height: 1;
  display: grid; place-items: center; box-shadow: var(--shadow);
}
.img-add {
  border: 1.5px dashed #ffb6cd; border-radius: 10px; padding: 14px; margin-top: 10px;
  text-align: center; color: var(--muted); cursor: pointer; font-size: 13px; background: #fff;
}
.img-add:hover { border-color: var(--primary); color: var(--primary); }

/* ---------- 分类管理 / 配置 ---------- */
.inline-add { display: flex; gap: 10px; margin-bottom: 14px; }
.inline-add input { flex: 1; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 12px; font-size: 14px; outline: none; }
.inline-add input:focus { border-color: var(--primary); }
.cat-list { display: flex; flex-direction: column; gap: 8px; }
.cat-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; }
.cat-item-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cat-item-name { font-weight: 700; font-size: 14px; }

/* ---------- 收到的选款 ---------- */
.sub-list { display: flex; flex-direction: column; gap: 12px; }
.sub-item { border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
.sub-item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 10px; }
.sub-item-name { font-weight: 800; font-size: 15px; }
.sub-item-contact { font-size: 13px; margin-bottom: 8px; }
.sub-item-items { margin-left: 20px; font-size: 13px; line-height: 1.7; }
.sub-item-remark { margin-top: 8px; font-size: 13px; color: var(--muted); }

/* ---------- 响应式 ---------- */
@media (max-width: 680px) {
  .topbar-inner { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .search-box { order: 3; flex-basis: 100%; max-width: none; }
  .brand-text p { display: none; }
  .form-cols { grid-template-columns: 1fr; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .cats { top: 118px; }
}
` },
  "/js/customer.js": { t: "text/javascript; charset=utf-8", b: `'use strict';

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
  els.catalogCount.textContent = \`共 \${list.length} 款\`;
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
    tag.className = 'card-multi'; tag.textContent = \`\${p.images.length} 图\`;
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
  const lines = [\`选款清单（共 \${items.length} 款）\`];
  items.forEach((p, i) => {
    const seg = [];
    seg.push(prodName(p));
    if (p.code) seg.push('货号 ' + p.code);
    if (p.price) seg.push('¥' + p.price);
    seg.push(catName(p.category));
    lines.push(\`\${i + 1}. \${seg.join(' — ')}\`);
  });
  return lines.join('\\n');
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
` },
  "/js/merchant.js": { t: "text/javascript; charset=utf-8", b: `'use strict';

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
    return \`\${d.getMonth() + 1}月\${d.getDate()}日 \${String(d.getHours()).padStart(2, '0')}:\${String(d.getMinutes()).padStart(2, '0')}\`;
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
    cnt.className = 'muted'; cnt.textContent = \`\${count} 件商品\`;
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
    ? \`确定删除分类「\${c.name}」吗？该分类下 \${count} 件商品将归入「未分类」。\`
    : \`确定删除分类「\${c.name}」吗？\`;
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
  els.manageCount.textContent = \`共 \${data.products.length} 件\`;
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
    if (p.images.length > 1) parts.push(\`\${p.images.length} 图\`);
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
  if (!confirm(\`确定删除「\${prodName(p)}」吗？此操作不可恢复。\`)) return;
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
    els.subCount.textContent = \`共 \${subs.length} 条\`;
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
` },
  "/js/login.js": { t: "text/javascript; charset=utf-8", b: `'use strict';

/* 商家端登录页 */

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');
const pw = document.getElementById('password');

function showMsg(text, ok) {
  msg.textContent = text;
  msg.className = 'form-msg ' + (ok ? 'ok' : 'err');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = pw.value;
  if (!password) { showMsg('请输入密码', false); return; }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { showMsg(body.error || '密码错误', false); pw.value = ''; return; }
    location.href = '/merchant.html';
  } catch (err) {
    showMsg('登录失败，请重试', false);
  }
});

// 已登录则直接进入
(async () => {
  try {
    const res = await fetch('/api/auth');
    const body = await res.json().catch(() => ({}));
    if (body.authed) location.href = '/merchant.html';
  } catch (e) { /* 忽略 */ }
})();
` },
  "/assets/logo.svg": { t: "image/svg+xml", b: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe3ee"/>
      <stop offset="1" stop-color="#ffb9d2"/>
    </linearGradient>
    <radialGradient id="ballGrad" cx="0.38" cy="0.26" r="0.9">
      <stop offset="0" stop-color="#ffa9c6"/>
      <stop offset="0.55" stop-color="#ff7fa8"/>
      <stop offset="1" stop-color="#ff5c8a"/>
    </radialGradient>
  </defs>

  <!-- 徽章背景 -->
  <rect x="2" y="2" width="124" height="124" rx="30" fill="url(#bgGrad)"/>
  <rect x="2" y="2" width="124" height="124" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3"/>

  <!-- 顶部小花（樱花） -->
  <g>
    <circle cx="64" cy="17.5" r="5.8" fill="#ffb0cd"/>
    <circle cx="70.2" cy="22" r="5.8" fill="#ffc0d8"/>
    <circle cx="67.8" cy="29.3" r="5.8" fill="#ffb0cd"/>
    <circle cx="60.2" cy="29.3" r="5.8" fill="#ffc0d8"/>
    <circle cx="57.8" cy="22" r="5.8" fill="#ffb0cd"/>
    <circle cx="64" cy="24" r="4.4" fill="#ffd166"/>
  </g>

  <!-- 团子身体 -->
  <circle cx="64" cy="68" r="38" fill="url(#ballGrad)"/>
  <ellipse cx="50" cy="46" rx="13" ry="8" fill="#ffffff" opacity="0.22"/>

  <!-- 腮红 -->
  <ellipse cx="41" cy="74" rx="6.5" ry="4" fill="#ff3f74" opacity="0.4"/>
  <ellipse cx="87" cy="74" rx="6.5" ry="4" fill="#ff3f74" opacity="0.4"/>

  <!-- 眼睛 -->
  <circle cx="50" cy="62" r="5.6" fill="#5a1f38"/>
  <circle cx="78" cy="62" r="5.6" fill="#5a1f38"/>
  <circle cx="52" cy="60" r="1.8" fill="#ffffff"/>
  <circle cx="80" cy="60" r="1.8" fill="#ffffff"/>

  <!-- 嘴巴 -->
  <path d="M59 72 Q64 77.5 69 72" stroke="#5a1f38" stroke-width="2.8" fill="none" stroke-linecap="round"/>

  <!-- 星星点缀 -->
  <g fill="#ffffff" opacity="0.9">
    <path d="M22 34 L23.1 37.1 L26.2 38.2 L23.1 39.3 L22 42.4 L20.9 39.3 L17.8 38.2 L20.9 37.1 Z"/>
    <path d="M108 46 L108.9 48.4 L111.3 49.3 L108.9 50.2 L108 52.6 L107.1 50.2 L104.7 49.3 L107.1 48.4 Z"/>
    <path d="M26 96 L26.8 98.2 L29 99 L26.8 99.8 L26 102 L25.2 99.8 L23 99 L25.2 98.2 Z"/>
    <path d="M104 94 L104.7 95.9 L106.6 96.6 L104.7 97.3 L104 99.2 L103.3 97.3 L101.4 96.6 L103.3 95.9 Z"/>
  </g>
</svg>
` }
};

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
