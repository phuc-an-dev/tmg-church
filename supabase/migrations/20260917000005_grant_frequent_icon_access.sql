-- RLS policies require matching table privileges for authenticated leaders.
grant select, insert, update, delete on table public.frequent_icon to authenticated;
