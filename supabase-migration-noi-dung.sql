-- Chạy một lần sau supabase-schema.sql.
create type public.content_kind as enum ('announcement', 'study', 'blog', 'facebook', 'tiktok');

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null default 'announcement',
  title text not null check (char_length(title) between 3 and 180),
  body text not null default '',
  external_url text,
  cover_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_posts_public_idx on public.content_posts(kind, is_published, published_at desc);
alter table public.content_posts enable row level security;

create policy "content: members read published" on public.content_posts for select to authenticated
  using (is_published or public.is_staff());
create policy "content: staff write" on public.content_posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
