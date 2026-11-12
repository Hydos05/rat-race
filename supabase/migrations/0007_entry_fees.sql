create table public.entry_fees (
  user_id uuid primary key references public.users (id) on delete cascade,
  paid boolean not null default false
);

alter table public.entry_fees enable row level security;

-- Only the service-role admin API can read or change payment status.
revoke all on public.entry_fees from anon, authenticated;
grant all on public.entry_fees to service_role;
