-- Reopen submissions until an administrator closes them.
create table if not exists public.competition_settings (
  id boolean primary key default true check (id),
  submissions_open boolean not null default true
);

insert into public.competition_settings (id, submissions_open)
values (true, true)
on conflict (id) do nothing;

alter table public.competition_settings enable row level security;

drop policy if exists "Anyone can view competition settings" on public.competition_settings;
create policy "Anyone can view competition settings"
  on public.competition_settings for select
  using (true);

drop policy if exists "Users can insert their own predictions before the deadline" on public.predictions;
drop policy if exists "Users can update their own predictions before the deadline" on public.predictions;
drop policy if exists "Users can insert own predictions" on public.predictions;
drop policy if exists "Users can update own predictions" on public.predictions;
drop policy if exists "Users can insert their own predictions while submissions are open" on public.predictions;
drop policy if exists "Users can update their own predictions while submissions are open" on public.predictions;
drop policy if exists "Users can delete their own predictions while submissions are open" on public.predictions;

create policy "Users can insert their own predictions while submissions are open"
  on public.predictions for insert
  with check (
    auth.uid() = user_id
    and (select submissions_open from public.competition_settings where id = true)
    and exists (select 1 from public.events where id = event_id and not locked)
  );

create policy "Users can update their own predictions while submissions are open"
  on public.predictions for update
  using (
    auth.uid() = user_id
    and (select submissions_open from public.competition_settings where id = true)
    and exists (select 1 from public.events where id = event_id and not locked)
  )
  with check (
    auth.uid() = user_id
    and (select submissions_open from public.competition_settings where id = true)
    and exists (select 1 from public.events where id = event_id and not locked)
  );

create policy "Users can delete their own predictions while submissions are open"
  on public.predictions for delete
  using (
    auth.uid() = user_id
    and (select submissions_open from public.competition_settings where id = true)
    and exists (select 1 from public.events where id = event_id and not locked)
  );
