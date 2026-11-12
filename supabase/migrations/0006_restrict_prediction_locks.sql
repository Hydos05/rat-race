-- Run once: this clears all existing user locks, including on scored events.
alter table public.events
  add column if not exists lock_eligible boolean not null default true;

do $$
declare
  excluded_names text[] := array[
    'AFC Champion (2026 Season)',
    'NFC Champion (2026 Season)',
    'Super Bowl LXI Winner',
    'NFL MVP 2026',
    'Offensive Player of the Year',
    'Defensive Player of the Year',
    'College Football Playoff Champion',
    'Heisman Trophy'
  ];
  missing_names text[];
begin
  select array_agg(name) into missing_names
  from unnest(excluded_names) as excluded(name)
  where not exists (select 1 from public.events where events.name = excluded.name);

  if missing_names is not null then
    raise exception 'Cannot apply lock restrictions: missing events %', missing_names;
  end if;

  update public.events set lock_eligible = false where name = any(excluded_names);
end;
$$;

create or replace function public.enforce_prediction_lock_eligibility()
returns trigger
language plpgsql
as $$
begin
  if new.is_locked and not exists (
    select 1 from public.events where id = new.event_id and lock_eligible
  ) then
    raise exception 'Locks are not available for this event'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists predictions_lock_eligibility on public.predictions;
create trigger predictions_lock_eligibility
  before insert or update on public.predictions
  for each row execute function public.enforce_prediction_lock_eligibility();

update public.predictions set is_locked = false where is_locked;

-- Match the per-event rounding used by calculateEventPoints.
with winners as (
  select p.user_id, p.event_id,
    count(*) over (partition by p.event_id) as winner_count
  from public.predictions p
  join public.events e on e.id = p.event_id
  where e.correct_answer is not null
    and e.correct_answer <> ''
    and lower(btrim(p.selected_option)) = lower(btrim(e.correct_answer))
),
totals as (
  select user_id, sum(round(100::numeric / winner_count, 2)) as total_points
  from winners
  group by user_id
)
insert into public.leaderboard (user_id, total_points, updated_at)
select u.id, coalesce(t.total_points, 0), now()
from public.users u
left join totals t on t.user_id = u.id
on conflict (user_id) do update
set total_points = excluded.total_points, updated_at = excluded.updated_at;
