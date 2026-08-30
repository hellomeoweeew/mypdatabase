-- Phase 2: cho phép khách (anon) đọc lịch sự kiện công khai.
-- Chạy sau schema + phase1.

drop policy if exists "events: public read" on public.events;
create policy "events: public read" on public.events
  for select to anon
  using (true);

-- authenticated vẫn đọc được (policy cũ members read); giữ staff write nguyên.
