-- 团子的秘密花园 · Supabase 建表脚本
-- 用法：登录 Supabase 控制台 → 左侧 SQL Editor → New query → 粘贴整段 → Run

-- 1. 分类表
create table if not exists categories (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. 商品表（description 字段对应原 JSON 里的 desc）
create table if not exists products (
  id text primary key,
  category text default '',
  name text default '',
  code text default '',
  price text default '',
  description text default '',
  images jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 3. 选款记录表
create table if not exists submissions (
  id text primary key,
  name text default '',
  contact text default '',
  remark text default '',
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 4. 配置表（key-value）
create table if not exists config (
  key text primary key,
  value text default ''
);

-- 5. 商品图片存储桶（公开可读，用于前端加载图片）
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

-- 6. 授权给后台服务器使用的 service_role（关键！否则接口会 403）
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
