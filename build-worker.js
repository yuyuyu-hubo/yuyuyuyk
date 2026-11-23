'use strict';
// 打包脚本：把 public 下的前端文件注入 worker-source.js，生成最终 worker.js
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const FILES = [
  ['/index.html', 'public/index.html', 'text/html; charset=utf-8'],
  ['/merchant.html', 'public/merchant.html', 'text/html; charset=utf-8'],
  ['/login.html', 'public/login.html', 'text/html; charset=utf-8'],
  ['/css/style.css', 'public/css/style.css', 'text/css; charset=utf-8'],
  ['/js/customer.js', 'public/js/customer.js', 'text/javascript; charset=utf-8'],
  ['/js/merchant.js', 'public/js/merchant.js', 'text/javascript; charset=utf-8'],
  ['/js/login.js', 'public/js/login.js', 'text/javascript; charset=utf-8'],
  ['/assets/logo.svg', 'public/assets/logo.svg', 'image/svg+xml'],
];

function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, () => '\\${');
}

const entries = FILES.map(([route, file, type]) => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf-8');
  return `  ${JSON.stringify(route)}: { t: ${JSON.stringify(type)}, b: \`${esc(content)}\` }`;
}).join(',\n');

const source = fs.readFileSync(path.join(ROOT, 'worker-source.js'), 'utf-8');
const staticObj = `{\n${entries}\n}`;
const out = source.replace('__STATIC_INJECT__', staticObj);
fs.writeFileSync(path.join(ROOT, 'worker.js'), out, 'utf-8');
console.log('worker.js 已生成，大小:', (out.length / 1024).toFixed(1), 'KB');
