-- LỚP 10 TIN - Supabase schema + Row Level Security
-- Chạy toàn bộ tệp này một lần trong Supabase: SQL Editor > New query > Run.
-- Không chạy khóa secret/service_role trong trình duyệt.

create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'class_officer', 'teacher', 'admin');
create type public.score_kind as enum ('plus', 'minus');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.student_directory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  class_name text not null default '10 Tin',
  class_role text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tách dữ liệu riêng tư khỏi danh sách lớp. Chỉ bản thân học sinh và GVCN/admin được xem.
create table public.student_private (
  student_id uuid primary key references public.student_directory(id) on delete cascade,
  parent_contact text,
  note text,
  updated_at timestamptz not null default now()
);

create table public.competition_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_directory(id) on delete cascade,
  week_start date not null,
  kind public.score_kind not null,
  points integer not null check (points > 0 and points <= 30),
  rule_code text,
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  body text not null,
  published_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_at timestamptz not null,
  description text not null default '',
  created_by uuid not null references auth.users(id)
);

create index competition_records_student_week_idx on public.competition_records(student_id, week_start desc);
create index announcements_published_idx on public.announcements(published_at desc);
create index events_event_at_idx on public.events(event_at);

-- Khi tài khoản mới được tạo, luôn chỉ nhận vai trò student; không tin dữ liệu role do trình duyệt gửi lên.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('class_officer', 'teacher', 'admin')
  );
$$;

create or replace function public.is_teacher_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_teacher_or_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.student_directory enable row level security;
alter table public.student_private enable row level security;
alter table public.competition_records enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;

create policy "profile: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile: teacher-admin manage" on public.profiles for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

create policy "directory: members read" on public.student_directory for select to authenticated using (true);
create policy "directory: staff write" on public.student_directory for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "private: self or teacher-admin read" on public.student_private for select to authenticated
  using (student_id in (select id from public.student_directory where user_id = auth.uid()) or public.is_teacher_or_admin());
create policy "private: teacher-admin write" on public.student_private for all to authenticated
  using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

-- Đọc công khai để bảng xếp hạng hiện đúng cho khách. Ghi chỉ staff.
create policy "scores: anyone read" on public.competition_records for select to anon, authenticated
  using (true);
create policy "scores: staff write" on public.competition_records for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "announcements: members read" on public.announcements for select to authenticated using (true);
create policy "announcements: staff write" on public.announcements for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "events: members read" on public.events for select to authenticated using (true);
create policy "events: staff write" on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Dữ liệu khởi tạo: danh sách lớp, không bao gồm CCCD/ngày sinh/nơi sinh.
insert into public.student_directory (full_name) values
  ('Bùi Trần Gia Ân'), ('Tạ Gia Bảo'), ('Phan Nguyễn Anh Đức'), ('Nguyễn Thái Duy'),
  ('Phạm Trường Giang'), ('Nguyễn Xuân Hòa'), ('Lê Quang Hùng'), ('Nguyễn Đức Gia Hưng'),
  ('Nguyễn Gia Hưng'), ('Nguyễn Đức Huy'), ('Nguyễn Hoàng Minh Huy'), ('Huỳnh Quang Khánh'),
  ('Phạm Gia Khiêm'), ('Trần Bá Đăng Khoa'), ('Nguyễn Minh Khôi'), ('Nguyễn Ngọc Duy Kiên'),
  ('Nguyễn Quang Minh'), ('Trần Lê Nhật Minh'), ('Trần Tấn Minh'), ('Trần Bảo Nam'),
  ('Nguyễn Trọng Nghĩa'), ('Trần Khánh Nguyên'), ('Lê Quang Nhân'), ('Nguyễn Tất Phát'),
  ('Phan Tiến Phát'), ('Mai Thành Phong'), ('Lê Đăng Trần Phong'), ('Nguyễn Đức Phước'),
  ('Đào Phạm Mai Phương'), ('Nguyễn Tấn Quang'), ('Ngô Trung Sang'), ('Đặng Kiến Vân');

-- Sau khi tạo tài khoản GVCN đầu tiên, chạy riêng câu lệnh sau, thay UUID bằng id trong Authentication > Users:
-- update public.profiles set role = 'teacher' where id = 'UUID-CUA-GVCN';
