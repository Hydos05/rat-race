-- "Lock" feature: each user may nominate up to three predictions as
-- double-point opportunities.
alter table public.predictions
  add column if not exists is_locked boolean not null default false;

-- A per-row check constraint can't count other rows, so the "maximum three
-- locks per user" rule is enforced with a trigger instead.
create or replace function public.enforce_max_locked_predictions()
returns trigger
language plpgsql
as $$
declare
  -- Keep in sync with `MAX_LOCKS` in src/lib/constants.ts.
  max_locks constant integer := 3;
  lock_count integer;
begin
  if new.is_locked then
    -- Serialise concurrent lock changes for this user so two transactions
    -- can't both see a below-limit count and exceed `max_locks`.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*) into lock_count
    from public.predictions
    where user_id = new.user_id
      and is_locked = true;

    -- If this is an INSERT, we're adding a new lock, so we need to check
    -- if we already have max_locks. If this is an UPDATE and the row was
    -- already locked, we don't count it twice (the count above includes it).
    if tg_op = 'INSERT' then
      if lock_count >= max_locks then
        raise exception 'Maximum % locks per competition', max_locks
          using errcode = 'check_violation';
      end if;
    elsif tg_op = 'UPDATE' then
      -- For updates, the count includes the row being updated. If it was
      -- already locked, we subtract 1 before checking the limit.
      if old.is_locked then
        lock_count := lock_count - 1;
      end if;
      if lock_count >= max_locks then
        raise exception 'Maximum % locks per competition', max_locks
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_max_locks on public.predictions;

create trigger predictions_max_locks
  before insert or update on public.predictions
  for each row execute function public.enforce_max_locked_predictions();
