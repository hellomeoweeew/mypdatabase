-- Phase 1: điểm tập thể tuần chính thức + cho phép đọc công khai khi đã chốt.
-- Chạy sau supabase-schema.sql và các migration trước.

create table if not exists public.weekly_class_scores (
  week_start date primary key,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  note text not null default '',
  locked boolean not null default true,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.weekly_class_scores enable row level security;

drop policy if exists "weekly: public read locked" on public.weekly_class_scores;
create policy "weekly: public read locked" on public.weekly_class_scores
  for select to anon, authenticated
  using (locked = true);

drop policy if exists "weekly: staff read all" on public.weekly_class_scores;
create policy "weekly: staff read all" on public.weekly_class_scores
  for select to authenticated
  using (public.is_staff());

drop policy if exists "weekly: staff write" on public.weekly_class_scores;
create policy "weekly: staff write" on public.weekly_class_scores
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Staff có thể cập nhật bản ghi điểm (sửa/xóa đã nằm trong policy scores: staff write)
-- Đảm bảo policy select điểm vẫn ổn cho staff khi filter.
