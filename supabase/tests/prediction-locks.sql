-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/prediction-locks.sql
-- against an empty, disposable database, not the application database.
begin;

create table public.predictions (
  user_id uuid not null,
  event_id uuid not null,
  selected_option text not null,
  unique (user_id, event_id)
);

\ir ../migrations/0004_prediction_locks.sql

insert into public.predictions (user_id, event_id, selected_option, is_locked)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'Original',
  n <= 3
from generate_series(1, 4) n;

-- Reproduce the bug before applying the fix.
do $$
begin
  begin
    insert into public.predictions
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'Changed', true)
    on conflict (user_id, event_id) do update
      set selected_option = excluded.selected_option, is_locked = excluded.is_locked;
    raise exception 'Expected the original trigger to reject the upsert';
  exception when check_violation then
    null;
  end;
end;
$$;

\ir ../migrations/0008_fix_lock_upserts.sql

-- Save all three existing locks, including changed answers.
insert into public.predictions
select user_id, event_id, 'Changed', is_locked from public.predictions
where is_locked
on conflict (user_id, event_id) do update
  set selected_option = excluded.selected_option, is_locked = excluded.is_locked;

update public.predictions set selected_option = 'Changed again' where is_locked;

do $$
begin
  if (select count(*) from public.predictions
      where is_locked and selected_option = 'Changed again') <> 3 then
    raise exception 'Existing locks or changed answers were not preserved';
  end if;

  -- Reject a fourth lock for both a new and an existing prediction.
  begin
    insert into public.predictions
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000005', 'New', true);
    raise exception 'A fourth new lock was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.predictions
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004', 'New', true)
    on conflict (user_id, event_id) do update set is_locked = excluded.is_locked;
    raise exception 'A fourth existing lock was accepted';
  exception when check_violation then
    null;
  end;

  begin
    update public.predictions set is_locked = true
    where event_id = '00000000-0000-0000-0000-000000000004';
    raise exception 'A fourth lock through UPDATE was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

-- Replacing one lock remains allowed.
update public.predictions set is_locked = false
where event_id = '00000000-0000-0000-0000-000000000001';
update public.predictions set is_locked = true
where event_id = '00000000-0000-0000-0000-000000000004';

-- Another user's locks do not affect the count.
insert into public.predictions
values ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001', 'Another user', true);

rollback;
