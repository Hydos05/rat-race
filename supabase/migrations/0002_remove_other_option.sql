-- Remove any stored "Other" entry from every event's options array.
--
-- The prediction form always appends its own "Other" choice (with a
-- free-text box) to each dropdown, so an "Other" value stored in
-- `events.options` was rendered a second time. Databases seeded before
-- this migration may contain that duplicate.
update public.events
set options = coalesce(
  (
    select jsonb_agg(option order by ordinality)
    from jsonb_array_elements_text(options) with ordinality as t(option, ordinality)
    where lower(trim(option)) <> 'other'
  ),
  '[]'::jsonb
)
where exists (
  select 1
  from jsonb_array_elements_text(options) as t(option)
  where lower(trim(option)) = 'other'
);
