-- An upsert runs BEFORE INSERT before resolving the existing prediction.
-- Count other events so saving an existing lock does not count it twice.
create or replace function public.enforce_max_locked_predictions()
returns trigger
language plpgsql
as $$
declare
  max_locks constant integer := 3;
  lock_count integer;
begin
  if new.is_locked then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*) into lock_count
    from public.predictions
    where user_id = new.user_id
      and event_id <> new.event_id
      and is_locked = true;

    if lock_count >= max_locks then
      raise exception 'Maximum % locks per competition', max_locks
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
