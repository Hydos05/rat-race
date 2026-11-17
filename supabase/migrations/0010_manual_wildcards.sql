-- Keep the earlier start-time column for installations that already applied
-- 0009; wildcard eligibility is now controlled solely by this toggle.
alter table public.events
  add column if not exists wildcards_allowed boolean not null default false;

create or replace function public.use_wildcard(
  p_event_id uuid,
  p_expected_option text,
  p_selected_option text
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  player_id uuid := auth.uid();
  is_open boolean;
  event_row public.events%rowtype;
  old_option text;
  pick_locked boolean;
  uses integer;
begin
  if player_id is null then
    raise exception 'You must be signed in.';
  end if;
  if p_selected_option is null or btrim(p_selected_option) = '' then
    raise exception 'Choose a new selection.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(player_id::text, 0));
  select submissions_open into is_open
  from public.competition_settings where id = true for share;
  if is_open is distinct from false then
    raise exception 'Wildcards are only available after submissions close.';
  end if;

  select * into event_row from public.events where id = p_event_id for share;
  if not found or event_row.locked or event_row.correct_answer is not null
      or not event_row.wildcards_allowed then
    raise exception 'This event is not eligible for a wildcard.';
  end if;

  select selected_option, is_locked into old_option, pick_locked from public.predictions
  where user_id = player_id and event_id = p_event_id for update;
  if not found then
    raise exception 'A saved prediction is required.';
  end if;
  if pick_locked then
    raise exception 'A locked pick cannot be changed with a wildcard.';
  end if;
  if old_option is distinct from p_expected_option then
    raise exception 'Your prediction has changed. Refresh the page and try again.';
  end if;
  if lower(btrim(old_option)) = lower(btrim(p_selected_option)) then
    raise exception 'Choose a different selection.';
  end if;

  select count(*) into uses from public.wildcard_uses where user_id = player_id;
  if uses >= 2 then
    raise exception 'No wildcards remaining.';
  end if;

  update public.predictions
  set selected_option = btrim(p_selected_option), updated_at = clock_timestamp()
  where user_id = player_id and event_id = p_event_id;
  insert into public.wildcard_uses (user_id, event_id, previous_option, selected_option)
  values (player_id, p_event_id, old_option, btrim(p_selected_option));
  return 2 - uses - 1;
end;
$$;
