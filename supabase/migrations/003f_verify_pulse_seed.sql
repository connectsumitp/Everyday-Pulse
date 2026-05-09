select
  count(*) as active_pulses,
  count(*) filter (where mission_path is not null) as pulses_with_paths
from public.missions
where is_active = true;
