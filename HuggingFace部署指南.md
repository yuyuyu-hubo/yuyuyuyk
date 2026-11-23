# Hugging Face Spaces 部署指南（免费 · 不绑卡）

用 Docker 方式把你的 Node 网站托管到 Hugging Face Spaces，得到公网地址，不用电脑开机、不绑卡。

---

## 第一步：推送新文件到 GitHub

项目里刚加了两个文件：`Dockerfile` 和 `.dockerignore`。把这两个文件连同项目一起推送到你的 GitHub 仓库（用 GitHub Desktop 或网页上传，和之前一样）。

## 第二步：创建 Space

1. 打开 [huggingface.co](https://huggingface.co) → 用 **GitHub 账号**登录。
2. 右上角头像 → **New Space**。
3. 这样填：
   - **Space name**：`tuanzi-garden`（随意）
   - **License**：随便选（如 MIT）
   - **Select the Space SDK**：选 **Docker** → **Blank**
   - **Hardware**：**CPU basic · free**（免费）
   - **Visibility**：**Public**（公开才免费；Private 要付费）
4. 点 **Create Space**。

## 第三步：连接 GitHub 仓库

进入刚创建的 Space → **Settings** → 找到 **Repository** 区域 → 选 **Link to a GitHub repository** → 选择你的仓库 → 保存。Hugging Face 会自动开始构建部署。

> 构建日志在 Space 页面的 **Build** / **Factory** 标签里能看，出错了截图发我。

## 第四步：填环境变量（密钥）

Space 页 → **Settings** → **Variables and secrets**：

| 类型 | Name | Value |
|---|---|---|
| New **variable** | `SUPABASE_URL` | `https://tbgbyrcpdurqalununho.supabase.co` |
| New **secret** | `SUPABASE_KEY` | 你的 `sb_secret_...` 密钥 |
| New **secret** | `ADMIN_PASSWORD` | `123456` |

保存后 Space 会自动重启。

## 第五步：拿到网址

构建完成后，你的公网地址是：

```
https://你的用户名-tuanzi-garden.hf.space
```

- **顾客端**：就是这个地址
- **商家端**：地址后加 `/merchant.html`（输密码进入）

---

## 注意事项

1. **休眠**：免费 Space 长时间（约 48 小时）无人访问会自动暂停，顾客重新打开会自动唤醒（比 Render 的 15 分钟宽松很多）。
2. **数据不丢**：商品/分类/选款/图片都在 Supabase 云端，Space 重启、暂停、更新都不影响。
3. **必须设 Public**：免费套餐只支持公开 Space（代码公开没关系，密钥在 secret 里，不会泄露）。
