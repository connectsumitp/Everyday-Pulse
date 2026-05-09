create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar text,
  total_xp int default 0 not null,
  level text default 'Starter' not null,
  daily_streak int default 0 not null,
  longest_streak int default 0 not null,
  last_completed_date date,
  onboarding_completed boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  world text not null,
  category text not null,
  pack text default 'Starter',
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')),
  xp int not null,
  time_required text,
  tags text[] default '{}',
  unlock_xp int default 0 not null,
  why_it_matters text,
  completion_condition text,
  examples text[] default '{}',
  safety_note text,
  is_sensitive boolean default false not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists public.mission_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unlock_xp int default 0 not null,
  world text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists public.user_mission_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  status text check (status in ('suggested', 'accepted', 'completed', 'skipped', 'saved_for_later', 'replaced')),
  accepted_at timestamptz,
  saved_at timestamptz,
  skipped_at timestamptz,
  skip_reason text,
  last_shown_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, mission_id)
);

create table if not exists public.completed_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  completed_at timestamptz default now() not null,
  xp_earned int not null,
  feeling text,
  completion_type text check (completion_type in ('full', 'partial', 'changed')),
  one_line_reflection text
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  condition_type text,
  condition_value int,
  icon text,
  created_at timestamptz default now() not null
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  earned_at timestamptz default now() not null,
  unique(user_id, badge_id)
);

create table if not exists public.weekly_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  week_start date,
  week_end date,
  missions_completed int default 0,
  xp_earned int default 0,
  most_felt_emotion text,
  top_world text,
  top_category text,
  streak_days int default 0,
  created_at timestamptz default now() not null,
  unique(user_id, week_start)
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_type text,
  product_id text,
  status text,
  payment_provider text,
  payment_id text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_user_mission_status_updated_at
before update on public.user_mission_status
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_packs enable row level security;
alter table public.user_mission_status enable row level security;
alter table public.completed_missions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.weekly_recaps enable row level security;
alter table public.user_entitlements enable row level security;

drop policy if exists "Profiles are owned by user" on public.profiles;
create policy "Profiles are owned by user"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Missions are public readable" on public.missions;
create policy "Missions are public readable"
on public.missions for select
using (is_active = true);

drop policy if exists "Mission packs are public readable" on public.mission_packs;
create policy "Mission packs are public readable"
on public.mission_packs for select
using (is_active = true);

drop policy if exists "Users manage own mission statuses" on public.user_mission_status;
create policy "Users manage own mission statuses"
on public.user_mission_status for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own completions" on public.completed_missions;
create policy "Users manage own completions"
on public.completed_missions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Badges are public readable" on public.badges;
create policy "Badges are public readable"
on public.badges for select
using (true);

drop policy if exists "Users manage own earned badges" on public.user_badges;
create policy "Users manage own earned badges"
on public.user_badges for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own recaps" on public.weekly_recaps;
create policy "Users manage own recaps"
on public.weekly_recaps for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own entitlements" on public.user_entitlements;
create policy "Users manage own entitlements"
on public.user_entitlements for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.mission_packs (name, description, unlock_xp, world)
select name, description, unlock_xp, world
from (values
  ('Starter Missions', 'Small first steps for breaking autopilot.', 0, null),
  ('5-Minute Wins Pack', 'Tiny missions for busy days.', 250, null),
  ('Weekend Reset Pack', 'Light reset missions for your space and energy.', 500, 'Reset'),
  ('Reconnect Pack', 'Kind ways to reopen quiet connections.', 750, 'Connect'),
  ('Tiny Dares Pack', 'Small courage missions for confidence.', 1500, 'Connect'),
  ('Screen Cleanse Pack', 'Gentle digital cleanup and offline moments.', 2000, 'Reset'),
  ('7-Day Life Reset Pack', 'A guided week of real-life momentum.', 3000, null),
  ('Brave Conversations Pack', 'Deeper relationship missions for safer moments.', 5000, 'Connect')
) as seed(name, description, unlock_xp, world)
where not exists (
  select 1 from public.mission_packs p where p.name = seed.name
);

insert into public.badges (name, description, condition_type, condition_value, icon)
select name, description, condition_type, condition_value, icon
from (values
  ('First Step', 'Complete your first mission.', 'completed_total', 1, 'footprints'),
  ('The Reconnector', 'Complete 5 Open Lines missions.', 'category_Open Lines', 5, 'message-circle'),
  ('The Brave One', 'Complete 5 Tiny Dares missions.', 'category_Tiny Dares', 5, 'flame'),
  ('Kind Human', 'Complete 10 Good Sparks missions.', 'category_Good Sparks', 10, 'heart'),
  ('Clear Space Hero', 'Complete 10 Clear Space missions.', 'category_Clear Space', 10, 'sparkles'),
  ('Offline Explorer', 'Complete 5 Fresh Trails or Screen Cleanse missions.', 'offline_categories', 5, 'compass'),
  ('Deep Worker', 'Complete 5 Deep Work missions.', 'category_Deep Work', 5, 'target'),
  ('Momentum Maker', 'Complete missions 3 days in a row.', 'daily_streak', 3, 'flame'),
  ('Weekly Winner', 'Complete 5 mission days in a week.', 'weekly_days', 5, 'trophy'),
  ('Life Builder', 'Reach 1500 XP.', 'total_xp', 1500, 'star')
) as seed(name, description, condition_type, condition_value, icon)
where not exists (
  select 1 from public.badges b where b.name = seed.name
);

insert into public.missions (
  title, world, category, pack, difficulty, xp, time_required, tags, unlock_xp,
  why_it_matters, completion_condition, examples, safety_note, is_sensitive
)
select title, world, category, pack, difficulty, xp, time_required, tags, unlock_xp,
  why_it_matters, completion_condition, examples, safety_note, is_sensitive
from (values
  ('Reply to one message you have been delaying', 'Connect', 'Open Lines', 'Starter', 'Easy', 10, '5 mins', array['quick','easy','social','relationship']::text[], 0, 'A tiny reply can reopen a line before it goes quiet.', 'You send one honest reply to one delayed message.', array['Thanks for waiting on me.','I saw this and wanted to reply.','Can I get back to you tonight?']::text[], null, false),
  ('Send a quiet check-in', 'Connect', 'Open Lines', 'Starter', 'Easy', 10, '5 mins', array['quick','social','meaningful']::text[], 0, 'Small messages keep relationships alive before they fade.', 'You send one honest check-in message to someone.', array['How have you been?','Thinking of you today.','Just wanted to say hi.']::text[], null, false),
  ('Thank someone for a small thing', 'Connect', 'Good Sparks', 'Starter', 'Easy', 10, '5 mins', array['quick','kindness','gratitude','social']::text[], 0, 'Gratitude makes ordinary support visible.', 'You thank one person for one specific thing.', array['Thanks for making that easier.','I appreciated what you said.','That helped more than you know.']::text[], null, false),
  ('Give one genuine compliment', 'Connect', 'Good Sparks', 'Starter', 'Easy', 10, '5 mins', array['quick','kindness','confidence']::text[], 0, 'A clear compliment can brighten a normal day.', 'You give one sincere compliment in person or by message.', array['You handled that well.','Your effort really shows.','That was thoughtful.']::text[], null, false),
  ('Ask one brave tiny question', 'Connect', 'Tiny Dares', 'Tiny Dares Pack', 'Medium', 25, '10 mins', array['brave','confidence','discomfort','social']::text[], 1500, 'Confidence grows through small honest attempts.', 'You ask one question you would usually avoid.', array['Could you explain that part?','Can I join?','Would you be open to trying this?']::text[], 'Only do this if it feels safe and appropriate.', true),
  ('Say one clean no', 'Connect', 'Tiny Dares', 'Tiny Dares Pack', 'Medium', 25, '10 mins', array['brave','confidence','boundaries']::text[], 1500, 'Gentle boundaries protect your energy.', 'You decline one small request or draft the words you would use.', array['I cannot take that on today.','That does not work for me.','I need to pass this time.']::text[], 'Writing without sending also counts if sending does not feel safe.', true),
  ('Write three honest lines', 'Reflect', 'Inner Pages', 'Starter', 'Easy', 10, '5 mins', array['reflection','quick','calm','mindful']::text[], 0, 'A few honest lines can make a noisy day clearer.', 'You write three lines about what is true right now.', array['I feel...','I need...','One thing I know is...']::text[], null, false),
  ('Name the thing you are avoiding', 'Reflect', 'Inner Pages', 'Starter', 'Easy', 10, '5 mins', array['reflection','deep','reset','focus']::text[], 0, 'Naming avoidance makes it smaller and easier to meet.', 'You write or say the one thing you have been avoiding.', array['The email.','The call.','The decision.']::text[], null, false),
  ('Choose one value for today', 'Reflect', 'North Star', 'Starter', 'Easy', 10, '5 mins', array['purpose','meaningful','reflection']::text[], 0, 'A value gives the day a quiet direction.', 'You pick one value and one tiny action that matches it.', array['Patience.','Courage.','Kindness.']::text[], null, false),
  ('Review one small spending moment', 'Reflect', 'Money Mirror', '5-Minute Wins Pack', 'Easy', 10, '5 mins', array['money','admin','reflection','quick']::text[], 250, 'Money awareness starts with noticing, not judging.', 'You look at one recent purchase and name what it was really for.', array['Convenience.','Comfort.','Connection.']::text[], null, false),
  ('Clear one small surface near you', 'Reset', 'Clear Space', 'Starter', 'Easy', 10, '10 mins', array['easy','reset','doable','clean']::text[], 0, 'A small clear space can make the whole room feel more possible.', 'One surface is visibly clearer than when you started.', array['Desk corner.','Nightstand.','Kitchen counter.']::text[], null, false),
  ('Remove five things from the floor', 'Reset', 'Clear Space', 'Starter', 'Easy', 10, '5 mins', array['quick','reset','easy','movement']::text[], 0, 'Your environment can send calmer signals after one small reset.', 'Five floor items are moved, tossed, or put away.', array['Shoes.','Receipts.','Laundry.']::text[], null, false),
  ('Delete ten old screenshots', 'Reset', 'Screen Cleanse', 'Screen Cleanse Pack', 'Easy', 10, '5 mins', array['quick','offline','admin','reset']::text[], 2000, 'A lighter phone can make your attention feel less crowded.', 'You delete ten screenshots or files you do not need.', array['Duplicate screenshots.','Old tickets.','Random saved images.']::text[], null, false),
  ('Put your phone away for ten minutes', 'Reset', 'Screen Cleanse', 'Starter', 'Easy', 10, '10 mins', array['offline','calm','mindful','rest']::text[], 0, 'A short phone break helps you notice the room you are already in.', 'Your phone is out of reach for ten minutes.', array['Across the room.','In a drawer.','Face down in another space.']::text[], null, false),
  ('Step outside for 5 minutes without scrolling', 'Reset', 'Fresh Trails', 'Starter', 'Easy', 10, '5 mins', array['quick','offline','nature','movement']::text[], 0, 'A few minutes outside can reset the body faster than overthinking.', 'You step outside for five minutes without scrolling.', array['Balcony.','Street corner.','Garden or terrace.']::text[], null, false),
  ('Take a different route for one errand', 'Reset', 'Fresh Trails', 'Weekend Reset Pack', 'Easy', 10, '10 mins', array['offline','nature','play','movement']::text[], 500, 'Novelty wakes up attention in a gentle way.', 'You take a slightly different safe route for one normal errand.', array['Different lane.','Longer walk.','New shop path.']::text[], null, false),
  ('Drink a full glass of water', 'Recharge', 'Refuel', 'Starter', 'Easy', 10, '5 mins', array['quick','rest','health','easy']::text[], 0, 'Basic care counts because your body is where life happens.', 'You drink one full glass of water.', array['Before coffee.','After a meeting.','Before bed.']::text[], null, false),
  ('Prep one simple rest cue', 'Recharge', 'Refuel', 'Starter', 'Easy', 10, '5 mins', array['rest','calm','doable']::text[], 0, 'Rest gets easier when your environment invites it.', 'You set up one cue that makes rest easier later.', array['Fill a bottle.','Dim one light.','Put sleep clothes out.']::text[], null, false),
  ('Move for one song', 'Recharge', 'Body Quest', 'Starter', 'Easy', 10, '5 mins', array['movement','fun','quick','energy']::text[], 0, 'One song of movement reminds your body it is alive.', 'You move your body for one full song.', array['Stretch.','Walk.','Dance lightly.']::text[], null, false),
  ('Do ten slow breaths', 'Recharge', 'Body Quest', 'Starter', 'Easy', 10, '5 mins', array['calm','mindful','rest','quick']::text[], 0, 'A short breathing pause can soften the rush.', 'You take ten slow breaths with your attention on the exhale.', array['At your desk.','Before a call.','Outside.']::text[], null, false),
  ('Play for ten minutes', 'Recharge', 'Fun Fuel', '5-Minute Wins Pack', 'Easy', 10, '10 mins', array['fun','joy','play','rest']::text[], 250, 'Play is not a reward for finishing life. It is part of life.', 'You do something playful for ten minutes.', array['Doodle.','Game.','Music.']::text[], null, false),
  ('Restart one old hobby for five minutes', 'Recharge', 'Fun Fuel', 'Weekend Reset Pack', 'Easy', 10, '5 mins', array['joy','creative','play','quick']::text[], 500, 'Tiny contact with an old hobby keeps that part of you reachable.', 'You spend five minutes with a hobby you have missed.', array['Guitar.','Sketching.','Cooking idea.']::text[], null, false),
  ('Open one learning tab only', 'Build', 'Next Chapter', 'Starter', 'Easy', 10, '5 mins', array['learning','focus','quick','purpose']::text[], 0, 'Starting small lowers the friction around growth.', 'You open one useful learning resource and read the first part.', array['Article.','Course lesson.','Documentation page.']::text[], null, false),
  ('Write tomorrow''s first work step', 'Build', 'Next Chapter', 'Starter', 'Easy', 10, '5 mins', array['admin','focus','reset','doable']::text[], 0, 'A clear next step makes tomorrow less foggy.', 'You write the first concrete work or study step for tomorrow.', array['Open the draft.','Send the note.','Review chapter two.']::text[], null, false),
  ('Focus for one clean block', 'Build', 'Deep Work', '5-Minute Wins Pack', 'Medium', 25, '15 mins', array['focus','doable','discipline','admin']::text[], 250, 'A short protected block can rebuild trust with your attention.', 'You work on one task with distractions closed for fifteen minutes.', array['One email batch.','One code function.','One study section.']::text[], null, false),
  ('Close three distraction tabs', 'Build', 'Deep Work', 'Starter', 'Easy', 10, '5 mins', array['quick','focus','screen','reset']::text[], 0, 'Focus often begins by removing one bit of noise.', 'You close three tabs or apps you do not need right now.', array['Shopping tab.','Old article.','Unused chat window.']::text[], null, false),
  ('Make one tiny thing', 'Build', 'Spark Lab', 'Starter', 'Easy', 10, '10 mins', array['creative','expression','craft','play']::text[], 0, 'Making something small turns passive time into evidence of life.', 'You create one tiny thing without judging it.', array['Four-line poem.','Tiny sketch.','One photo edit.']::text[], null, false),
  ('Capture one idea before it fades', 'Build', 'Spark Lab', 'Starter', 'Easy', 10, '5 mins', array['creative','quick','expression']::text[], 0, 'Ideas become more usable when they have somewhere to land.', 'You write, record, or sketch one idea.', array['Voice memo.','Notes app.','Notebook line.']::text[], null, false),
  ('Do a two-minute kindness errand', 'Connect', 'Good Sparks', 'Reconnect Pack', 'Easy', 10, '5 mins', array['kindness','helpful','quick','social']::text[], 750, 'Tiny helpful acts make everyday life feel less isolated.', 'You do one small helpful thing for someone.', array['Refill water.','Share a useful link.','Carry something.']::text[], null, false),
  ('Plan one low-pressure hangout', 'Connect', 'Open Lines', 'Reconnect Pack', 'Medium', 25, '15 mins', array['social','relationship','meaningful','doable']::text[], 750, 'Connection gets easier when the invitation is simple.', 'You suggest one low-pressure way to spend time.', array['Tea this week?','Walk sometime?','Want to catch up for 20 minutes?']::text[], null, false),
  ('Sort one small money pile', 'Reflect', 'Money Mirror', 'Weekend Reset Pack', 'Medium', 25, '15 mins', array['money','admin','reset','focus']::text[], 500, 'Small money clarity reduces background stress.', 'You sort one small money-related pile or list.', array['Bills.','Receipts.','Subscriptions.']::text[], null, false)
) as seed(title, world, category, pack, difficulty, xp, time_required, tags, unlock_xp, why_it_matters, completion_condition, examples, safety_note, is_sensitive)
where not exists (
  select 1 from public.missions m where m.title = seed.title
);
