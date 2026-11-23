'use strict';

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
