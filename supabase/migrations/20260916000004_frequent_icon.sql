-- Frequently used Lucide icons shared across administrators
create table if not exists public.frequent_icon (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.frequent_icon enable row level security;

create policy "Leader full access on frequent_icon"
  on public.frequent_icon for all to authenticated
  using ((select public.is_leader()))
  with check ((select public.is_leader()));

create index if not exists frequent_icon_display_order_idx
  on public.frequent_icon (display_order asc, created_at asc);

create trigger trg_frequent_icon_set_updated_at
before update on public.frequent_icon
for each row
execute function public.set_updated_at();

-- Seed initial frequently used icons
insert into public.frequent_icon (name, display_order)
values
  ('church', 0),
  ('cross', 1),
  ('users', 2),
  ('heart', 3),
  ('sparkles', 4),
  ('book-open', 5),
  ('flame', 6),
  ('music-2', 7)
on conflict (name) do nothing;
