-- Existing events need an administrator-supplied start time before wildcards
-- can be used. This migration does not reopen submissions or change picks.
alter table public.events add column if not exists starts_at timestamptz;

create table public.wildcard_uses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id),
  previous_option text not null,
  selected_option text not null,
  used_at timestamptz not null default now()
);

alter table public.wildcard_uses enable row level security;
create policy "Users can view their own wildcard uses"
  on public.wildcard_uses for select to authenticated
  using (auth.uid() = user_id);
grant select on public.wildcard_uses to authenticated;

-- A single transaction serialises uses per player and locks the settings and
-- event rows against concurrent administrative changes.
create function public.use_wildcard(
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
      or event_row.starts_at is null or event_row.starts_at <= clock_timestamp() then
    raise exception 'This event is not eligible for a wildcard.';
  end if;

  select selected_option into old_option from public.predictions
  where user_id = player_id and event_id = p_event_id for update;
  if not found then
    raise exception 'A saved prediction is required.';
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
  if event_row.starts_at <= clock_timestamp() then
    raise exception 'This event is not eligible for a wildcard.';
  end if;

  update public.predictions
  set selected_option = btrim(p_selected_option), updated_at = clock_timestamp()
  where user_id = player_id and event_id = p_event_id;
  insert into public.wildcard_uses (user_id, event_id, previous_option, selected_option)
  values (player_id, p_event_id, old_option, btrim(p_selected_option));
  return 2 - uses - 1;
end;
$$;

revoke all on function public.use_wildcard(uuid, text, text) from public, anon;
grant execute on function public.use_wildcard(uuid, text, text) to authenticated;
