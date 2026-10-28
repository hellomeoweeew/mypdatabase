-- =====================================================================
--  KHO DỮ LIỆU DI ĐỘNG  ·  setup.sql
--  Chạy MỘT LẦN trong Supabase: SQL Editor > New query > dán toàn bộ > Run.
--  Chạy lại nhiều lần cũng không sao (không xoá dữ liệu).
--  Không đụng tới các bảng của web cũ — có thể dùng chung project cũ.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- TỦ ----------
create table if not exists public.cabinets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default 'cyan',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- NGĂN (thuộc 1 tủ) ----------
create table if not exists public.drawers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- HỒ SƠ (thuộc 1 ngăn) ----------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drawer_id uuid not null references public.drawers(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  link text,
  pinned boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,   -- [{path, name, size, type}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- NHẬT KÝ (mỗi tài khoản 1 trang / 1 ngày) ----------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists drawers_cabinet_idx on public.drawers(cabinet_id, sort_order);
create index if not exists items_drawer_idx on public.items(drawer_id, updated_at desc);
create index if not exists items_user_idx on public.items(user_id);
create index if not exists journal_user_date_idx on public.journal_entries(user_id, entry_date);

-- Tự cập nhật cột updated_at
create or replace function public.kho_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute procedure public.kho_touch();
drop trigger if exists journal_touch on public.journal_entries;
create trigger journal_touch before update on public.journal_entries
  for each row execute procedure public.kho_touch();

-- ---------- BẢO MẬT: mỗi người chỉ thấy dữ liệu của chính mình ----------
alter table public.cabinets        enable row level security;
alter table public.drawers         enable row level security;
alter table public.items           enable row level security;
alter table public.journal_entries enable row level security;

drop policy if exists "own cabinets" on public.cabinets;
create policy "own cabinets" on public.cabinets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own drawers" on public.drawers;
create policy "own drawers" on public.drawers for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.cabinets c where c.id = cabinet_id and c.user_id = auth.uid()));

drop policy if exists "own items" on public.items;
create policy "own items" on public.items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.drawers d where d.id = drawer_id and d.user_id = auth.uid()));

drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- KHO FILE ĐÍNH KÈM (Supabase Storage) ----------
-- Bucket riêng tư, giới hạn 20 MB / file. File lưu theo đường dẫn: <user_id>/<item_id>/<tên file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('kho-files', 'kho-files', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "kho-files: own read" on storage.objects;
create policy "kho-files: own read" on storage.objects for select to authenticated
  using (bucket_id = 'kho-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "kho-files: own insert" on storage.objects;
create policy "kho-files: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'kho-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "kho-files: own update" on storage.objects;
create policy "kho-files: own update" on storage.objects for update to authenticated
  using (bucket_id = 'kho-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "kho-files: own delete" on storage.objects;
create policy "kho-files: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'kho-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- XONG. Quay lại web, tạo tài khoản và đăng nhập.
