-- Run against an empty, disposable PostgreSQL database.
begin;
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.users (id uuid primary key);
create table public.events (
  id uuid primary key, locked boolean not null default false, correct_answer text
);
create table public.competition_settings (id boolean primary key, submissions_open boolean);
create table public.predictions (
  user_id uuid not null, event_id uuid not null, selected_option text not null,
  is_locked boolean not null default false, updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);
grant select on public.events, public.competition_settings to authenticated;
alter table public.predictions enable row level security;
grant select, update on public.predictions to authenticated;
create policy own_picks on public.predictions for select to authenticated using (user_id = auth.uid());
\ir ../migrations/0005_submission_settings.sql
\ir ../migrations/0009_wildcards.sql
\ir ../migrations/0010_manual_wildcards.sql

insert into public.users values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.events (id, wildcards_allowed, locked, correct_answer) values
  ('10000000-0000-0000-0000-000000000001', true, false, null),
  ('10000000-0000-0000-0000-000000000002', false, false, null),
  ('10000000-0000-0000-0000-000000000003', true, false, null),
  ('10000000-0000-0000-0000-000000000004', true, true, null),
  ('10000000-0000-0000-0000-000000000005', true, false, 'winner'),
  ('10000000-0000-0000-0000-000000000006', true, false, null);
insert into public.events (id) values ('10000000-0000-0000-0000-000000000007');
insert into public.predictions (user_id, event_id, selected_option, is_locked)
select '00000000-0000-0000-0000-000000000001', id, 'Original',
  id = '10000000-0000-0000-0000-000000000003'
from public.events where id <> '10000000-0000-0000-0000-000000000006';
insert into public.predictions values
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Other player', false, now());

create function pg_temp.expect_error(command text, expected text) returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when others then
    if position(expected in sqlerrm) = 0 then raise; end if;
    return;
  end;
  raise exception 'Expected error: %', expected;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Original', 'New')$q$, 'only available after submissions close');
reset role;
update public.competition_settings set submissions_open = false;
update public.events set wildcards_allowed = false
where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Original', 'New')$q$, 'not eligible');
reset role;
update public.events set wildcards_allowed = true
where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000002', 'Original', 'New')$q$, 'not eligible');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000003', 'Original', 'New')$q$, 'locked pick');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000004', 'Original', 'New')$q$, 'not eligible');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000005', 'Original', 'New')$q$, 'not eligible');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000006', 'Original', 'New')$q$, 'saved prediction');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000007', 'Original', 'New')$q$, 'not eligible');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'stale', 'New')$q$, 'changed');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Original', ' original ')$q$, 'different selection');
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Original', '  ')$q$, 'Choose a new selection');

do $$
begin
  if public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Original', 'New') <> 1 then raise exception 'Wrong balance'; end if;
  if not exists (select 1 from public.predictions where selected_option = 'New' and not is_locked) then raise exception 'Pick not saved'; end if;
  if not exists (select 1 from public.predictions where event_id = '10000000-0000-0000-0000-000000000003' and selected_option = 'Original' and is_locked) then raise exception 'Locked pick was changed'; end if;
  if public.use_wildcard('10000000-0000-0000-0000-000000000001', 'New', 'Again') <> 0 then raise exception 'Wrong balance'; end if;
end;
$$;
select pg_temp.expect_error($q$select public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Again', 'Third')$q$, 'No wildcards remaining');
select pg_temp.expect_error($q$insert into public.wildcard_uses (user_id, event_id, previous_option, selected_option) values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Again', 'Third')$q$, 'permission denied');
do $$
begin
  update public.predictions set selected_option = 'Bypass' where event_id = '10000000-0000-0000-0000-000000000001';
  if found then raise exception 'Direct update bypassed closed submissions'; end if;
  if (select count(*) from public.wildcard_uses) <> 2 then raise exception 'Incorrect wildcard history'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$
begin
  if (select count(*) from public.wildcard_uses) <> 0 then raise exception 'Wildcard history leaked'; end if;
  if public.use_wildcard('10000000-0000-0000-0000-000000000001', 'Other player', 'New') <> 1 then raise exception 'Other player balance incorrect'; end if;
end;
$$;
rollback;
