-- Run this first.
alter table public.missions
  add column if not exists mission_id_slug text,
  add column if not exists mission text,
  add column if not exists reflection_prompt text,
  add column if not exists mission_path text;

create unique index if not exists missions_mission_id_slug_idx
on public.missions (mission_id_slug);
