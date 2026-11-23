const BASE = 'https://yuyuyuyk.15281183227.workers.dev';
async function check(path) {
  try {
    const res = await fetch(BASE + path, { redirect: 'follow' });
    const text = await res.text();
    console.log(`\n[${path}] HTTP ${res.status} (${res.headers.get('content-type')})`);
    console.log('  body 前 200 字:', text.slice(0, 200).replace(/\s+/g, ' '));
    return { status: res.status, text };
  } catch (e) {
    console.log(`\n[${path}] 请求失败:`, e.message);
    return { error: e.message };
  }
}
(async () => {
  await check('/');
  const d = await check('/api/data');
  if (d.text) {
    try {
      const j = JSON.parse(d.text);
      if (j.ok) console.log('  -> 商品', (j.products || []).length, '件 / 分类', (j.categories || []).length, '个');
      else console.log('  -> API 返回:', JSON.stringify(j));
    } catch (e) { console.log('  -> 不是合法 JSON'); }
  }
})();
