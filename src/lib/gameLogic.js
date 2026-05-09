import { requireSupabase } from './supabase';
import { FILTER_GROUPS, LEVELS, UNLOCKS } from './constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function throwIfError(error) {
  if (error) throw error;
}

function localDateKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDate() {
  return localDateKey();
}

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfWeekDate(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeekDate(date = new Date()) {
  const start = startOfWeekDate(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function dateOnly(date) {
  return localDateKey(date);
}

function daysBetween(a, b) {
  const first = new Date(a);
  const second = new Date(b);
  first.setHours(0, 0, 0, 0);
  second.setHours(0, 0, 0, 0);
  return Math.round((second - first) / MS_PER_DAY);
}

export function getUserLevel(totalXP = 0) {
  return [...LEVELS].reverse().find((level) => totalXP >= level.xp)?.name ?? 'Starter';
}

export function getNextUnlock(totalXP = 0) {
  return UNLOCKS.find((unlock) => unlock.xp > totalXP) ?? UNLOCKS[UNLOCKS.length - 1];
}

export function getNextLevel(totalXP = 0) {
  return LEVELS.find((level) => level.xp > totalXP) ?? LEVELS[LEVELS.length - 1];
}

export function calculateXpEarned(baseXp, completionType, hasReflection) {
  const multiplier = completionType === 'partial' ? 0.5 : completionType === 'changed' ? 0.75 : 1;
  return Math.round(baseXp * multiplier) + (hasReflection ? 5 : 0);
}

export function selectedFiltersToTags(selectedFilters = []) {
  const options = FILTER_GROUPS.flatMap((group) => group.options);
  return [...new Set(selectedFilters.flatMap((label) => options.find((option) => option.label === label)?.tags ?? []))];
}

function splitDailyChoice(selectedFilters = []) {
  const timeLabels = new Set(FILTER_GROUPS.find((group) => group.heading === 'Time')?.options.map((option) => option.label) ?? []);
  const typeLabels = new Set(FILTER_GROUPS.find((group) => group.heading === 'Mission Type')?.options.map((option) => option.label) ?? []);
  return {
    timeBucket: selectedFilters.find((label) => timeLabels.has(label)) ?? null,
    missionPath: selectedFilters.find((label) => typeLabels.has(label)) ?? null,
  };
}

function missionMatchesTimeBucket(mission, timeBucket) {
  if (!timeBucket) return true;
  const value = `${mission.time_required ?? ''}`.toLowerCase();
  if (value === timeBucket.toLowerCase()) return true;
  if (timeBucket.includes('5 minutes')) return value.includes('5');
  if (timeBucket.includes('10-15')) return value.includes('10') || value.includes('15');
  if (timeBucket.includes('15-30')) return value.includes('15') || value.includes('25') || value.includes('30');
  if (timeBucket.includes('more than 30')) return value.includes('30') || value.includes('45') || value.includes('60') || value.includes('hour');
  return true;
}

function missionMatchesPath(mission, missionPath) {
  if (!missionPath || missionPath === "I'm open to anything") return true;
  if (mission.mission_path === missionPath) return true;
  const selectedTags = selectedFiltersToTags([missionPath]);
  return selectedTags.some((tag) => (mission.tags ?? []).includes(tag));
}

export async function getUserXP(userId) {
  const db = requireSupabase();
  const { data, error } = await db.from('profiles').select('total_xp').eq('id', userId).single();
  throwIfError(error);
  return data?.total_xp ?? 0;
}

export async function getProfile(userId) {
  const db = requireSupabase();
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
  throwIfError(error);
  return data;
}

export async function getUnlockedMissions(userXP) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('missions')
    .select('*')
    .eq('is_active', true)
    .lte('unlock_xp', userXP)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function getAllVisibleMissions() {
  const db = requireSupabase();
  const { data, error } = await db.from('missions').select('*').eq('is_active', true);
  throwIfError(error);
  return data ?? [];
}

export async function getMissionById(missionId) {
  const db = requireSupabase();
  const { data, error } = await db.from('missions').select('*').eq('id', missionId).single();
  throwIfError(error);
  return data;
}

export async function getMissionByTitle(title) {
  const db = requireSupabase();
  const { data, error } = await db.from('missions').select('*').eq('title', title).maybeSingle();
  throwIfError(error);
  return data;
}

export async function getUserHistory(userId) {
  const db = requireSupabase();
  const [{ data: statuses, error: statusError }, { data: completions, error: completionError }] = await Promise.all([
    db.from('user_mission_status').select('*, missions(world, category, tags)').eq('user_id', userId),
    db.from('completed_missions').select('*, missions(world, category, tags)').eq('user_id', userId),
  ]);
  throwIfError(statusError);
  throwIfError(completionError);
  return { statuses: statuses ?? [], completions: completions ?? [] };
}

function happenedRecently(timestamp, days) {
  if (!timestamp) return false;
  return daysBetween(timestamp, new Date()) <= days;
}

export function scoreMission(mission, selectedTags = [], userHistory = {}, userXP = 0) {
  const tags = mission.tags ?? [];
  const status = (userHistory.statuses ?? []).find((item) => item.mission_id === mission.id);
  const recentCompletion = (userHistory.completions ?? []).find(
    (item) => item.mission_id === mission.id && happenedRecently(item.completed_at, 14),
  );
  const selectedSet = new Set(selectedTags);
  const openMode = selectedSet.has('all') || selectedTags.length === 0;
  let score = openMode ? 2 : 0;

  if (!openMode) {
    tags.forEach((tag) => {
      if (selectedSet.has(tag)) score += 5;
    });
  }

  if (mission.unlock_xp <= userXP) score += 3;
  if (!happenedRecently(status?.last_shown_at, 7)) score += 2;
  if (status?.status === 'skipped' && happenedRecently(status.skipped_at, 14)) score -= 5;
  if (recentCompletion) score -= 10;

  const meaningfulOrBrave = selectedSet.has('deep') || selectedSet.has('brave') || selectedSet.has('confidence');
  if (mission.is_sensitive && !meaningfulOrBrave) score -= 10;

  const completedCategories = (userHistory.completions ?? []).reduce((counts, item) => {
    const key = item.missions?.category;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const categoryCount = completedCategories[mission.category] ?? 0;
  if (categoryCount === 0) score += 2;

  return score;
}

export async function markSuggested(userId, missionId) {
  const db = requireSupabase();
  const { data: existing } = await db
    .from('user_mission_status')
    .select('status')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .maybeSingle();

  if (existing?.status && existing.status !== 'suggested') return;

  const { error } = await db.from('user_mission_status').upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: 'suggested',
      last_shown_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' },
  );
  throwIfError(error);
}

export async function getSurpriseMission(userId) {
  const completed = await getTodayCompletion(userId).catch(() => null);
  if (completed?.missions) return completed.missions;

  const active = await getActiveMission(userId).catch(() => null);
  if (active?.missions) return active.missions;

  const userXP = await getUserXP(userId).catch(() => 0);
  const history = await getUserHistory(userId).catch(() => ({ statuses: [], completions: [] }));
  const seenMissionIds = new Set([
    ...(history.statuses ?? []).map((item) => item.mission_id),
    ...(history.completions ?? []).map((item) => item.mission_id),
  ]);
  const unlocked = await getUnlockedMissions(userXP).catch(() => []);
  const visible = unlocked.length ? unlocked : await getAllVisibleMissions().catch(() => []);
  const missions = visible.filter((mission) => {
    const unlockOk = mission.unlock_xp <= userXP || mission.unlock_xp <= userXP + 1000;
    return unlockOk && !mission.is_sensitive && ['Easy', 'Medium'].includes(mission.difficulty);
  });
  const unseen = missions.filter((mission) => !seenMissionIds.has(mission.id));
  const candidatePool = unseen.length ? unseen : missions;

  const randomPool = candidatePool.length ? candidatePool : visible.filter((mission) => mission.unlock_xp <= userXP + 1000);
  const picked = randomPool[Math.floor(Math.random() * randomPool.length)] ?? null;
  if (picked) await acceptMission(userId, picked.id, { replaceCurrent: false }).catch(() => null);
  return picked;
}

export async function getMissionResultsFromFilters(userId, selectedFilters = []) {
  const completed = await getTodayCompletion(userId).catch(() => null);
  if (completed?.missions) return [completed.missions];

  const active = await getActiveMission(userId).catch(() => null);
  if (active?.missions) return [active.missions];

  const userXP = await getUserXP(userId).catch(() => 0);
  const selectedTags = selectedFiltersToTags(selectedFilters);
  const { timeBucket, missionPath } = splitDailyChoice(selectedFilters);
  const history = await getUserHistory(userId).catch(() => ({ statuses: [], completions: [] }));
  const missions = await getAllVisibleMissions();
  const visibleMissions = missions.filter((mission) => mission.unlock_xp <= userXP || mission.unlock_xp <= userXP + 1000);

  const exactResults = visibleMissions
    .filter((mission) => missionMatchesTimeBucket(mission, timeBucket))
    .filter((mission) => missionMatchesPath(mission, missionPath))
    .map((mission) => ({ mission, score: scoreMission(mission, selectedTags, history, userXP) }))
    .sort((a, b) => b.score - a.score || a.mission.unlock_xp - b.mission.unlock_xp)
    .map(({ mission }) => mission);

  const timeOnlyResults = exactResults.length
    ? exactResults
    : visibleMissions
        .filter((mission) => missionMatchesTimeBucket(mission, timeBucket))
        .map((mission) => ({ mission, score: scoreMission(mission, selectedTags, history, userXP) }))
        .sort((a, b) => b.score - a.score || a.mission.unlock_xp - b.mission.unlock_xp)
        .map(({ mission }) => mission);

  const broadResults = timeOnlyResults.length
    ? timeOnlyResults
    : visibleMissions
        .map((mission) => ({ mission, score: scoreMission(mission, selectedTags, history, userXP) }))
        .sort((a, b) => b.score - a.score || a.mission.unlock_xp - b.mission.unlock_xp)
        .map(({ mission }) => mission);

  const picked = broadResults[0] ? [broadResults[0]] : [];
  await Promise.all(picked.map((mission) => acceptMission(userId, mission.id, { replaceCurrent: false }).catch(() => null)));
  return picked;
}

export async function getActiveMission(userId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('user_mission_status')
    .select('*, missions(*)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .gte('accepted_at', startOfTodayIso())
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function getTodayCompletion(userId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('completed_missions')
    .select('*, missions(*)')
    .eq('user_id', userId)
    .gte('completed_at', startOfTodayIso())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function acceptMission(userId, missionId, { replaceCurrent = true } = {}) {
  const db = requireSupabase();
  if (replaceCurrent) {
    const { data: active, error: activeError } = await db
      .from('user_mission_status')
      .select('id, mission_id')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .gte('accepted_at', startOfTodayIso());
    throwIfError(activeError);

    const activeIds = (active ?? []).filter((item) => item.mission_id !== missionId).map((item) => item.id);
    if (activeIds.length) {
      const { error } = await db
        .from('user_mission_status')
        .update({ status: 'replaced' })
        .in('id', activeIds);
      throwIfError(error);
    }
  }

  const { error } = await db.from('user_mission_status').upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      last_shown_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' },
  );
  throwIfError(error);
}

export async function saveMission(userId, missionId) {
  const db = requireSupabase();
  const { error } = await db.from('user_mission_status').upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: 'saved_for_later',
      saved_at: new Date().toISOString(),
      last_shown_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' },
  );
  throwIfError(error);
}

export async function skipMission(userId, missionId, reason) {
  const db = requireSupabase();
  const { error } = await db.from('user_mission_status').upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: 'skipped',
      skipped_at: new Date().toISOString(),
      skip_reason: reason,
      last_shown_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' },
  );
  throwIfError(error);
}

export async function updateUserXP(userId, xpEarned) {
  const db = requireSupabase();
  const profile = await getProfile(userId);
  const totalXP = (profile?.total_xp ?? 0) + xpEarned;
  const { error } = await db
    .from('profiles')
    .update({ total_xp: totalXP, level: getUserLevel(totalXP) })
    .eq('id', userId);
  throwIfError(error);
  return totalXP;
}

export async function updateStreak(userId) {
  const db = requireSupabase();
  const profile = await getProfile(userId);
  const lastDate = profile?.last_completed_date;
  let dailyStreak = profile?.daily_streak ?? 0;

  if (lastDate === todayDate()) {
    return { daily_streak: dailyStreak, longest_streak: profile?.longest_streak ?? dailyStreak };
  }

  dailyStreak = lastDate && daysBetween(lastDate, new Date()) === 1 ? dailyStreak + 1 : 1;
  const longestStreak = Math.max(profile?.longest_streak ?? 0, dailyStreak);

  const { error } = await db
    .from('profiles')
    .update({
      daily_streak: dailyStreak,
      longest_streak: longestStreak,
      last_completed_date: todayDate(),
    })
    .eq('id', userId);
  throwIfError(error);
  return { daily_streak: dailyStreak, longest_streak: longestStreak };
}

export async function checkUnlocks(userId) {
  const profile = await getProfile(userId);
  return UNLOCKS.filter((unlock) => unlock.xp > 0 && unlock.xp <= profile.total_xp);
}

export async function checkBadges(userId) {
  const db = requireSupabase();
  const [{ data: badges, error: badgeError }, { data: earned, error: earnedError }, { completions }, profile, recap] =
    await Promise.all([
      db.from('badges').select('*'),
      db.from('user_badges').select('badge_id').eq('user_id', userId),
      getCompletedMissions(userId),
      getProfile(userId),
      calculateWeeklyRecap(userId),
    ]);
  throwIfError(badgeError);
  throwIfError(earnedError);

  const earnedIds = new Set((earned ?? []).map((item) => item.badge_id));
  const categoryCounts = completions.reduce((counts, item) => {
    const category = item.missions?.category;
    if (category) counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  const offlineCount = (categoryCounts['Fresh Trails'] ?? 0) + (categoryCounts['Screen Cleanse'] ?? 0);

  const qualifies = (badge) => {
    const value = badge.condition_value ?? 0;
    if (badge.condition_type === 'completed_total') return completions.length >= value;
    if (badge.condition_type === 'daily_streak') return profile.daily_streak >= value;
    if (badge.condition_type === 'weekly_days') return recap.weekly_momentum >= value;
    if (badge.condition_type === 'total_xp') return profile.total_xp >= value;
    if (badge.condition_type === 'offline_categories') return offlineCount >= value;
    if (badge.condition_type?.startsWith('category_')) {
      const category = badge.condition_type.replace('category_', '');
      return (categoryCounts[category] ?? 0) >= value;
    }
    return false;
  };

  const newlyEarned = (badges ?? []).filter((badge) => !earnedIds.has(badge.id) && qualifies(badge));
  if (newlyEarned.length) {
    const { error } = await db
      .from('user_badges')
      .insert(newlyEarned.map((badge) => ({ user_id: userId, badge_id: badge.id })));
    throwIfError(error);
  }

  return newlyEarned;
}

export async function getCompletedMissions(userId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('completed_missions')
    .select('*, missions(*)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  throwIfError(error);
  return { completions: data ?? [] };
}

export async function calculateWeeklyRecap(userId) {
  const db = requireSupabase();
  const start = startOfWeekDate();
  const end = endOfWeekDate();
  const { data, error } = await db
    .from('completed_missions')
    .select('*, missions(world, category)')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString());
  throwIfError(error);

  const completions = data ?? [];
  const countBy = (keyGetter) =>
    completions.reduce((counts, item) => {
      const key = keyGetter(item);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  const topOf = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const uniqueDays = new Set(completions.map((item) => localDateKey(item.completed_at)));
  const profile = await getProfile(userId);

  const recap = {
    user_id: userId,
    week_start: dateOnly(start),
    week_end: dateOnly(end),
    missions_completed: completions.length,
    xp_earned: completions.reduce((sum, item) => sum + (item.xp_earned ?? 0), 0),
    most_felt_emotion: topOf(countBy((item) => item.feeling)),
    top_world: topOf(countBy((item) => item.missions?.world)),
    top_category: topOf(countBy((item) => item.missions?.category)),
    streak_days: profile.daily_streak ?? 0,
    weekly_momentum: uniqueDays.size,
  };

  const { error: upsertError } = await db.from('weekly_recaps').upsert(
    {
      user_id: userId,
      week_start: recap.week_start,
      week_end: recap.week_end,
      missions_completed: recap.missions_completed,
      xp_earned: recap.xp_earned,
      most_felt_emotion: recap.most_felt_emotion,
      top_world: recap.top_world,
      top_category: recap.top_category,
      streak_days: recap.streak_days,
    },
    { onConflict: 'user_id,week_start' },
  );
  throwIfError(upsertError);

  return recap;
}

export async function completeMission(userId, missionId, feeling, completionType, reflection) {
  const db = requireSupabase();
  const mission = await getMissionById(missionId);
  const xpEarned = calculateXpEarned(mission.xp, completionType, Boolean(reflection?.trim()));

  const { error: completionError } = await db.from('completed_missions').insert({
    user_id: userId,
    mission_id: missionId,
    xp_earned: xpEarned,
    feeling,
    completion_type: completionType,
    one_line_reflection: reflection?.trim() || null,
  });
  throwIfError(completionError);

  const { error: statusError } = await db.from('user_mission_status').upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: 'completed',
      last_shown_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' },
  );
  throwIfError(statusError);

  const totalXP = await updateUserXP(userId, xpEarned);
  const streak = await updateStreak(userId);
  const [unlocks, badges, recap] = await Promise.all([
    checkUnlocks(userId),
    checkBadges(userId),
    calculateWeeklyRecap(userId),
  ]);

  return { xpEarned, totalXP, streak, unlocks, badges, recap };
}

export async function getSavedMissions(userId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('user_mission_status')
    .select('*, missions(*)')
    .eq('user_id', userId)
    .eq('status', 'saved_for_later')
    .order('saved_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function getLastSavedMission(userId) {
  const saved = await getSavedMissions(userId);
  return saved[0] ?? null;
}

export async function getWeeklyCompletionLog(userId) {
  const db = requireSupabase();
  const start = startOfWeekDate();
  const end = endOfWeekDate();
  const { data, error } = await db
    .from('completed_missions')
    .select('*, missions(*)')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString())
    .order('completed_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function updateCompletionReflection(userId, completionId, reflection) {
  const db = requireSupabase();
  const { error } = await db
    .from('completed_missions')
    .update({ one_line_reflection: reflection?.trim() || null })
    .eq('user_id', userId)
    .eq('id', completionId);
  throwIfError(error);
}

export async function getMissionsByWorld(world) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('missions')
    .select('*')
    .eq('is_active', true)
    .eq('world', world)
    .order('unlock_xp', { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function getMissionsByCategory(world, category) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('missions')
    .select('*')
    .eq('is_active', true)
    .eq('world', world)
    .eq('category', category)
    .order('unlock_xp', { ascending: true });
  throwIfError(error);
  return data ?? [];
}
