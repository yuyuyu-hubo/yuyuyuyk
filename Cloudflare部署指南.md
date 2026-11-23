# Cloudflare Workers 部署指南（免费 · 不绑卡 · 国内可访问 · 不用开机）

你的网站已经打包成一个 70KB 的 `worker.js` 文件（前端页面 + 后端接口全部包含在内），复制粘贴到 Cloudflare 就能跑。

---

## 第一步：注册 Cloudflare

1. 打开 <https://dash.cloudflare.com> → 用**邮箱**注册（**不绑卡**、不用 GitHub）。
2. 验证邮箱后进入控制台。

## 第二步：创建 Worker 并粘贴代码

1. 左侧菜单 **Workers & Pages** → 点 **Create application** → 选 **Create Worker**。
2. 起个名字（如 `tuanzi`）→ 点 **Deploy**（先创建一个默认的）。
3. 点 **Edit code**（编辑代码），把编辑器里已有的默认代码**全部删掉**。
4. 打开项目里的 `worker.js`，**全选复制**，粘贴到编辑器。
5. 点 **Save and Deploy**（保存并部署）。

## 第三步：填环境变量（密钥）

1. 回到 Worker 页面 → 点 **Settings** → **Variables and Secrets**。
2. 点 **Add**，依次添加 3 个：

   | Name | Value | 类型 |
   |---|---|---|
   | `SUPABASE_URL` | `https://tbgbyrcpdurqalununho.supabase.co` | Variable |
   | `SUPABASE_KEY` | 你的 `sb_secret_...` 密钥 | Secret |
   | `ADMIN_PASSWORD` | `123456` | Secret |

3. 保存（会自动重新部署）。

## 第四步：拿到网址

部署完成后，Worker 页面顶部会显示你的网址，形如：

```
https://tuanzi.你的子域.workers.dev
```

- **顾客端**：就是这个地址
- **商家端**：地址后加 `/merchant.html`（输密码进入）

---

## 注意事项

1. **免费额度**：每天 10 万次请求，小店完全够用。
2. **数据不丢**：商品/分类/选款/图片都在 Supabase 云端，Worker 重启、更新都不影响。
3. **密钥安全**：`SUPABASE_KEY` 和 `ADMIN_PASSWORD` 以 Secret 形式存在 Cloudflare，不会暴露给顾客。
4. **以后改前端/后端**：改完项目里的源码后，重新运行 `build-worker.js` 生成新的 `worker.js`，再到 Cloudflare 粘贴更新即可。
