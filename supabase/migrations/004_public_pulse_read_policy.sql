-- Run this if SQL Editor shows pulses exist but the app still says the pulse bank is empty.
-- It ensures the public app client can read active pulse content.

alter table public.missions enable row level security;
alter table public.mission_packs enable row level security;
alter table public.badges enable row level security;

drop policy if exists "Missions are public readable" on public.missions;
create policy "Missions are public readable"
on public.missions
for select
using (is_active = true);

drop policy if exists "Mission packs are public readable" on public.mission_packs;
create policy "Mission packs are public readable"
on public.mission_packs
for select
using (is_active = true);

drop policy if exists "Badges are public readable" on public.badges;
create policy "Badges are public readable"
on public.badges
for select
using (true);

select
  count(*) as active_pulses_public_check,
  count(*) filter (where mission_path is not null) as pulses_with_paths_public_check
from public.missions
where is_active = true;
