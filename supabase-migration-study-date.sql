-- Ngày cần nhớ cho thông báo học tập (ngày KT / hạn nộp / ngày có tiết).
-- Chạy sau supabase-migration-study.sql

alter table public.content_posts
  add column if not exists relevant_on date;

create index if not exists content_posts_study_relevant_idx
  on public.content_posts (kind, is_published, relevant_on);
