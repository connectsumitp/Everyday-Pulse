import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Coins,
  Compass,
  Dice5,
  Flame,
  Grid2X2,
  Heart,
  Home,
  Leaf,
  Lock,
  LogOut,
  MessageCircle,
  Save,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import './styles.css';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  acceptMission,
  calculateXpEarned,
  calculateWeeklyRecap,
  completeMission,
  getActiveMission,
  getAllVisibleMissions,
  getMissionById,
  getMissionResultsFromFilters,
  getMissionsByCategory,
  getMissionsByWorld,
  getLastSavedMission,
  getNextLevel,
  getNextUnlock,
  getProfile,
  getSavedMissions,
  getSurpriseMission,
  getTodayCompletion,
  getUserLevel,
  getWeeklyCompletionLog,
  saveMission,
  updateCompletionReflection,
} from './lib/gameLogic';
import {
  DAY_ONE_MISSIONS,
  FEELINGS,
  FILTER_GROUPS,
  UNLOCKS,
  WORLDS,
} from './lib/constants';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const AuthContext = createContext(null);
const TODAY_PULSE_CACHE_KEY = 'everyday-pulse-today';
const SAVED_PULSES_CACHE_KEY = 'everyday-pulse-saved';
const COMPLETED_PULSES_CACHE_KEY = 'everyday-pulse-completed';

function withTimeout(promise, fallback, timeoutMs = 3500) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

function localDateKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return localDateKey();
}

function startOfWeekKey() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return localDateKey(date);
}

function weekDayKeys() {
  const [year, month, day] = startOfWeekKey().split('-').map(Number);
  const start = new Date(year, month - 1, day);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
}

function completionDateKeys(completions = []) {
  return [
    ...new Set(
      completions
        .map((item) => (item?.completed_at ? localDateKey(item.completed_at) : null))
        .filter(Boolean),
    ),
  ];
}

function parseFilterParam(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function belongsToUser(item, userId) {
  return !userId || item?.user_id === userId;
}

function readLocalArray(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function cacheTodayPulse(mission, userId) {
  if (!mission) return;
  window.localStorage.setItem(
    TODAY_PULSE_CACHE_KEY,
    JSON.stringify({
      date: todayKey(),
      user_id: userId,
      mission,
    }),
  );
}

function clearCachedTodayPulse() {
  window.localStorage.removeItem(TODAY_PULSE_CACHE_KEY);
}

function getCachedTodayPulse(userId) {
  try {
    const cached = JSON.parse(window.localStorage.getItem(TODAY_PULSE_CACHE_KEY) || 'null');
    if (cached?.date === todayKey() && cached?.mission?.id && belongsToUser(cached, userId)) {
      return {
        mission_id: cached.mission.id,
        missions: cached.mission,
        status: 'accepted',
      };
    }
  } catch {
    clearCachedTodayPulse();
  }
  return null;
}

function getCachedSavedPulses(userId) {
  try {
    const cached = readLocalArray(SAVED_PULSES_CACHE_KEY);
    if (!Array.isArray(cached)) return [];
    return cached
      .filter((item) => item?.mission?.id && belongsToUser(item, userId))
      .map((item) => ({
        id: `local-${item.mission.id}`,
        user_id: item.user_id,
        mission_id: item.mission.id,
        missions: item.mission,
        saved_at: item.saved_at,
        status: 'saved_for_later',
      }));
  } catch {
    window.localStorage.removeItem(SAVED_PULSES_CACHE_KEY);
    return [];
  }
}

function cacheSavedPulse(mission, userId) {
  if (!mission?.id) return;
  const existing = readLocalArray(SAVED_PULSES_CACHE_KEY);
  const otherUsers = existing.filter((item) => item?.user_id && item.user_id !== userId);
  const saved = existing
    .filter((item) => belongsToUser(item, userId) && item?.mission?.id !== mission.id)
    .map((item) => ({ user_id: item.user_id, mission: item.mission, saved_at: item.saved_at }));
  saved.unshift({ user_id: userId, mission, saved_at: new Date().toISOString() });
  window.localStorage.setItem(SAVED_PULSES_CACHE_KEY, JSON.stringify([...saved.slice(0, 30), ...otherUsers]));
}

function mergeSavedPulses(remote = [], userId) {
  const byMission = new Map();
  [...getCachedSavedPulses(userId), ...remote].forEach((item) => {
    if (item?.mission_id && item?.missions) byMission.set(item.mission_id, item);
  });
  return [...byMission.values()].sort((a, b) => new Date(b.saved_at ?? 0) - new Date(a.saved_at ?? 0));
}

function getCachedCompletions(userId) {
  try {
    const cached = readLocalArray(COMPLETED_PULSES_CACHE_KEY);
    return Array.isArray(cached) ? cached.filter((item) => item?.mission_id && item?.missions && belongsToUser(item, userId)) : [];
  } catch {
    window.localStorage.removeItem(COMPLETED_PULSES_CACHE_KEY);
    return [];
  }
}

function cacheCompletion(mission, feeling, reflection = '', userId) {
  const xpEarned = calculateXpEarned(mission?.xp ?? 10, 'full', Boolean(reflection?.trim()));
  const completion = {
    id: `local-${todayKey()}-${mission.id}`,
    user_id: userId,
    mission_id: mission.id,
    completed_at: new Date().toISOString(),
    xp_earned: xpEarned,
    feeling,
    completion_type: 'full',
    one_line_reflection: reflection?.trim() || null,
    missions: mission,
  };
  const existing = readLocalArray(COMPLETED_PULSES_CACHE_KEY);
  const otherUsers = existing.filter((item) => item?.user_id && item.user_id !== userId);
  const rest = existing.filter(
    (item) => belongsToUser(item, userId) && !(item.mission_id === mission.id && localDateKey(item.completed_at) === todayKey()),
  );
  window.localStorage.setItem(COMPLETED_PULSES_CACHE_KEY, JSON.stringify([[completion, ...rest].slice(0, 60), otherUsers].flat()));
  return completion;
}

function getCachedTodayCompletion(userId) {
  return getCachedCompletions(userId).find((item) => localDateKey(item.completed_at) === todayKey()) ?? null;
}

function getCachedWeeklyCompletions(userId) {
  const weekStart = startOfWeekKey();
  return getCachedCompletions(userId).filter((item) => localDateKey(item.completed_at) >= weekStart);
}

function updateCachedCompletionReflection(completionId, reflection = '', userId) {
  const completions = readLocalArray(COMPLETED_PULSES_CACHE_KEY);
  const next = completions.map((item) =>
    item.id === completionId && belongsToUser(item, userId) ? { ...item, one_line_reflection: reflection?.trim() || null } : item,
  );
  window.localStorage.setItem(COMPLETED_PULSES_CACHE_KEY, JSON.stringify(next));
}

function getCachedXp(userId) {
  return getCachedCompletions(userId).reduce((total, item) => total + (item.xp_earned ?? 0), 0);
}

function summarizeCompletions(completions = [], fallback = {}) {
  const countBy = (getter) =>
    completions.reduce((counts, item) => {
      const key = getter(item);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  const topOf = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const dayCount = completionDateKeys(completions).length;
  return {
    ...fallback,
    missions_completed: Math.max(fallback?.missions_completed ?? 0, completions.length),
    xp_earned: Math.max(
      fallback?.xp_earned ?? 0,
      completions.reduce((sum, item) => sum + (item.xp_earned ?? 0), 0),
    ),
    most_felt_emotion: topOf(countBy((item) => item.feeling)) ?? fallback?.most_felt_emotion ?? null,
    top_world: topOf(countBy((item) => item.missions?.world)) ?? fallback?.top_world ?? null,
    top_category: topOf(countBy((item) => item.missions?.category)) ?? fallback?.top_category ?? null,
    weekly_momentum: Math.max(fallback?.weekly_momentum ?? 0, dayCount),
  };
}

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function refreshProfile(userId = session?.user?.id) {
    if (!userId || !isSupabaseConfigured) return null;
    setProfileLoading(true);
    try {
      const nextProfile = await getProfile(userId);
      setProfile(nextProfile);
      window.localStorage.setItem(`everyday-pulse-profile-${userId}`, JSON.stringify(nextProfile));
      return nextProfile;
    } catch (error) {
      console.error('Could not load profile', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function initializeAuth() {
      try {
        const result = await supabase.auth.getSession();
        if (!active) return;
        const nextSession = result?.data?.session ?? null;
        setSession(nextSession);
        if (nextSession?.user) {
          const cached = window.localStorage.getItem(`everyday-pulse-profile-${nextSession.user.id}`);
          if (cached) {
            try {
              setProfile(JSON.parse(cached));
            } catch {
              window.localStorage.removeItem(`everyday-pulse-profile-${nextSession.user.id}`);
            }
          }
          await withTimeout(refreshProfile(nextSession.user.id), null, cached ? 600 : 1000);
        }
      } catch (error) {
        console.error('Could not initialize auth', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) await withTimeout(refreshProfile(nextSession.user.id), null);
      if (!nextSession?.user) {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, profile, setProfile, refreshProfile, loading, profileLoading }),
    [session, profile, loading, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ConfigMissing() {
  return (
    <CenteredShell>
      <div className="card space-y-4">
        <div className="icon-bubble bg-pulse-purpleSoft text-pulse-primary">
          <Sparkles size={24} />
        </div>
        <div>
          <p className="eyebrow">Everyday Pulse</p>
          <h1 className="text-2xl font-bold">Connect Supabase to run the app</h1>
          <p className="mt-2 text-pulse-muted">
            Add your project URL and anon key to <span className="font-semibold">.env</span> using the
            values in <span className="font-semibold">.env.example</span>, then run the Supabase migration.
          </p>
        </div>
      </div>
    </CenteredShell>
  );
}

function RequireAuth({ children }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  if (profileLoading && !profile) return <LoadingScreen />;
  if (!profile && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/first-mission"
            element={
              <RequireAuth>
                <FirstMission />
              </RequireAuth>
            }
          />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <HomeScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/find-mission"
            element={
              <RequireAuth>
                <FindMission />
              </RequireAuth>
            }
          />
          <Route
            path="/mission-results"
            element={
              <RequireAuth>
                <MissionResults />
              </RequireAuth>
            }
          />
          <Route
            path="/mission/:id"
            element={
              <RequireAuth>
                <MissionDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/completion/:missionId"
            element={
              <RequireAuth>
                <CompletionFlow />
              </RequireAuth>
            }
          />
          <Route
            path="/progress"
            element={
              <RequireAuth>
                <ProgressScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/weekly"
            element={
              <RequireAuth>
                <WeeklyScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireAuth>
                <CategoriesScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/categories/:world"
            element={
              <RequireAuth>
                <WorldScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/categories/:world/:category"
            element={
              <RequireAuth>
                <CategoryScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <SavedScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileScreen />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { user, profile, loading, profileLoading } = useAuth();
  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/onboarding" replace />;
  if (profileLoading && !profile) return <LoadingScreen />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/home" replace />;
}

function Onboarding() {
  const { user, profile, setProfile, refreshProfile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar === 'woman' ? 'woman' : 'man');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.onboarding_completed) navigate('/home', { replace: true });
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
    if (profile?.avatar === 'man' || profile?.avatar === 'woman') setAvatar(profile.avatar);
  }, [profile]);

  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return <LoadingScreen />;
  if (user && profileLoading && !profile) return <LoadingScreen />;
  if (user && profile?.onboarding_completed) return <Navigate to="/home" replace />;

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const authCall =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } })
        : supabase.auth.signInWithPassword({ email, password });
    const { error, data } = await authCall;
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session?.user) {
      const nextProfile = await refreshProfile(data.session.user.id);
      if (nextProfile?.onboarding_completed) {
        navigate('/home', { replace: true });
      }
      return;
    }
    if (!data.session && mode === 'signup') {
      setMessage('Check your email to confirm your account, then come back to sign in.');
    }
  }

  async function finishOnboarding(event) {
    event.preventDefault();
    setMessage('');
    setBusy(true);

    try {
      const profilePayload = {
        id: user.id,
        display_name: displayName.trim() || 'Pulse Player',
        avatar,
        onboarding_completed: true,
        level: getUserLevel(profile?.total_xp ?? 0),
      };
      const { error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

      if (error) {
        setMessage(`${error.message}. Run the Supabase migration or the profile RLS fix in SQL Editor.`);
        return;
      }

      const nextProfile = { ...(profile ?? {}), ...profilePayload };
      setProfile(nextProfile);
      window.localStorage.setItem(`everyday-pulse-profile-${user.id}`, JSON.stringify(nextProfile));
      await refreshProfile(user.id);
      navigate('/home', { replace: true });
    } catch (error) {
      setMessage(error.message || 'Could not finish onboarding. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <CenteredShell>
        <div className="card space-y-6">
          <div className="space-y-3">
            <img className="auth-brand-image" src="/everyday-pulse-thumbnail.png" alt="Everyday Pulse" />
            <p className="eyebrow">Everyday Pulse</p>
            <h1 className="text-3xl font-black leading-tight">Do small real-life pulses.</h1>
            <p className="text-lg text-pulse-muted">Earn Life XP. Change the script.</p>
          </div>
          <form onSubmit={submitAuth} className="space-y-3">
            <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input
              className="input"
              type="password"
              placeholder="Password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="btn-primary" disabled={busy}>
              {busy ? 'One moment...' : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>
          <button className="text-sm font-bold text-pulse-primary" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create account'}
          </button>
          {message && <p className="rounded-2xl bg-pulse-yellowSoft p-3 text-sm text-pulse-ink">{message}</p>}
        </div>
      </CenteredShell>
    );
  }

  return (
    <CenteredShell>
      <div className="card space-y-6">
        <div className="space-y-2">
          <p className="eyebrow">Welcome</p>
          <h1 className="text-3xl font-black">Ready to change the script?</h1>
          <p className="text-pulse-muted">Tell Everyday Pulse what to call you, then choose your first small action.</p>
        </div>
        <form onSubmit={finishOnboarding} className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-bold">Display name</span>
            <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-bold">Profile icon</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'man', label: 'Man' },
                { key: 'woman', label: 'Woman' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`avatar-choice ${avatar === item.key ? 'avatar-choice-active' : ''}`}
                  onClick={() => setAvatar(item.key)}
                >
                  <User size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Saving your profile...' : 'Choose first pulse'}
          </button>
        </form>
        {message && <p className="rounded-2xl bg-pulse-yellowSoft p-3 text-sm">{message}</p>}
      </div>
    </CenteredShell>
  );
}

function FirstMission() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    withTimeout(getAllVisibleMissions(), [], 3500)
      .then((all) => setMissions(DAY_ONE_MISSIONS.map((title) => all.find((mission) => mission.title === title)).filter(Boolean)))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <ScreenHeader title="Choose your first pulse" subtitle="Start with one small real-life action." />
      {loading ? <LoadingCard /> : <div className="space-y-3">{missions.map((mission, index) => <StarterMissionCard key={mission.id} mission={mission} index={index} />)}</div>}
    </AppShell>
  );
}

function HomeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [recap, setRecap] = useState(null);
  const [completedDayKeys, setCompletedDayKeys] = useState([]);
  const [recent, setRecent] = useState(null);
  const [savedPrompt, setSavedPrompt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [surpriseBusy, setSurpriseBusy] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [activeDetailsOpen, setActiveDetailsOpen] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function load() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 700);

    getActiveMission(user.id)
      .then((activeMission) => {
        setActive(activeMission ?? getCachedTodayPulse(user.id));
      })
      .catch((error) => {
        console.error('Could not load active pulse', error);
        setActive(getCachedTodayPulse(user.id));
      });

    getTodayCompletion(user.id)
      .then((todayCompletion) => {
        const nextCompletion = todayCompletion ?? getCachedTodayCompletion(user.id);
        setCompletion(nextCompletion);
        setRecent(nextCompletion);
        if (nextCompletion) {
          clearCachedTodayPulse();
          setActive(null);
        }
      })
      .catch((error) => {
        console.error('Could not load today completion', error);
        const cachedCompletion = getCachedTodayCompletion(user.id);
        setCompletion(cachedCompletion);
        setRecent(cachedCompletion);
      });

    Promise.all([
      calculateWeeklyRecap(user.id).catch((error) => {
        console.error('Could not load weekly recap', error);
        return null;
      }),
      getWeeklyCompletionLog(user.id).catch((error) => {
        console.error('Could not load weekly completion days', error);
        return [];
      }),
    ]).then(([weekly, remoteCompletions]) => {
      const weeklyCompletions = [...getCachedWeeklyCompletions(user.id), ...remoteCompletions];
      const dates = completionDateKeys(weeklyCompletions);
      setCompletedDayKeys(dates);
      setRecap(summarizeCompletions(weeklyCompletions, weekly ?? {}));
    });

    refreshProfile(user.id).catch((error) => console.error('Could not refresh profile', error));

    getLastSavedMission(user.id)
      .then(setSavedPrompt)
      .catch((error) => console.error('Could not load saved prompt', error))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const totalXP = (profile?.total_xp ?? 0) + getCachedXp(user.id);
  const displayProfile = { ...(profile ?? {}), total_xp: totalXP, level: getUserLevel(totalXP) };

  async function surprise() {
    if (surpriseBusy) return;
    setSurpriseBusy(true);
    const mission = await withTimeout(getSurpriseMission(user.id), null, 7000).catch(() => null);
    setSurpriseBusy(false);
    if (mission) {
      cacheTodayPulse(mission, user.id);
      navigate(`/mission/${mission.id}`);
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallOpen(true);
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="brand-lockup">
            <img className="brand-logo" src="/everyday-pulse-thumbnail.png" alt="" />
            <p className="home-app-name">Everyday Pulse</p>
          </div>
          <h1 className="mt-1 text-[22px] font-black leading-tight">{getGreeting()}, {firstName(profile?.display_name)}</h1>
          <p className="mt-1 text-[14px] font-bold text-pulse-muted">Ready to change the script?</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InstallButton onClick={installApp} />
          <XpChip xp={totalXP} onClick={() => setXpOpen(true)} />
        </div>
      </div>

      <div className="mb-3">
        <WeeklyMomentum recap={recap} completedDayKeys={completedDayKeys} compact />
      </div>

      {completion ? (
        <CompletedTodayCard completion={completion} onClick={() => setReflectionOpen(true)} />
      ) : active ? (
        <ActiveMissionCard
          active={active}
          onOpenDetails={() => setActiveDetailsOpen(true)}
          onDone={() => navigate(`/completion/${active.mission_id}`)}
          onSave={async () => {
            cacheSavedPulse(active.missions, user.id);
            setActive(null);
            clearCachedTodayPulse();
            await saveMission(user.id, active.mission_id).catch((error) => {
              console.error('Could not save pulse remotely', error);
            });
            navigate('/saved');
          }}
        />
      ) : (
        <>
          {savedPrompt && <SavedYesterdayPrompt item={savedPrompt} />}
          <NoMissionActions onSurprise={surprise} surpriseBusy={surpriseBusy} />
        </>
      )}

      {loading && !active && !completion && (
        <p className="mt-3 text-center text-xs font-bold text-pulse-muted">Syncing your latest pulse data...</p>
      )}

      {completion && (
        <div className="mt-4">
          <Link className="btn-secondary" to="/weekly">
            View this week's log
          </Link>
        </div>
      )}

      <div className="mt-3 space-y-3">
        <NextUnlockCard totalXP={totalXP} />
        {recent && !completion && <RecentMission completion={recent} />}
      </div>

      {xpOpen && <XpModal profile={displayProfile} onClose={() => setXpOpen(false)} />}
      {installOpen && <InstallHelpModal onClose={() => setInstallOpen(false)} />}
      {reflectionOpen && completion && <ReflectionSheet completion={completion} onClose={() => setReflectionOpen(false)} />}
      {activeDetailsOpen && active && <PulseDetailSheet mission={active.missions} onClose={() => setActiveDetailsOpen(false)} />}
    </AppShell>
  );
}

function FindMission() {
  const navigate = useNavigate();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const timeOptions = FILTER_GROUPS.find((group) => group.heading === 'Time')?.options ?? [];
  const allMissionTypes = FILTER_GROUPS.find((group) => group.heading === 'Mission Type')?.options ?? [];
  const openOption = allMissionTypes.find((option) => option.label === "I'm open to anything");
  const missionTypes = allMissionTypes.filter((option) => option.label !== "I'm open to anything");

  function toggle(label) {
    setSelectedType((current) => (current === label ? '' : label));
  }

  function submit() {
    const selected = [selectedTime, selectedType].filter(Boolean);
    const params = new URLSearchParams({ filters: JSON.stringify(selected) });
    navigate(`/mission-results?${params.toString()}`);
  }

  function chooseOpenMode() {
    const selected = [selectedTime, openOption?.label].filter(Boolean);
    const params = new URLSearchParams({ filters: JSON.stringify(selected) });
    navigate(`/mission-results?${params.toString()}`);
  }

  return (
    <AppShell>
      <ScreenHeader title="How much time do you have?" subtitle="Start with time. Then choose the kind of pulse you want." />

      <section>
        <h2 className="section-title">Time</h2>
        <div className="time-choice-row">
          {timeOptions.map((option) => (
            <button
              key={option.label}
              className={`time-choice-button ${selectedTime === option.label ? 'time-choice-button-active' : ''}`}
              onClick={() => setSelectedTime(option.label)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`mission-reveal ${selectedTime ? 'mission-reveal-open' : ''}`} aria-hidden={!selectedTime}>
        <div className="mt-6">
          <h2 className="text-2xl font-black leading-tight">What kind of pulse feels right?</h2>
          <p className="mt-1 text-sm font-semibold text-pulse-muted">Choose one path, or stay open to anything.</p>
        </div>

        {openOption && (
          <>
            <button className="open-mode-card" onClick={chooseOpenMode}>
              <span>I'm open to anything</span>
              <ChevronRight size={20} />
            </button>
            <div className="or-divider">
              <span>or choose one path</span>
            </div>
          </>
        )}

        <div className="mission-type-grid">
          {missionTypes.map((option) => (
            <button
              key={option.label}
              className={`mission-type-card ${selectedType === option.label ? 'mission-type-card-active' : ''}`}
              onClick={() => toggle(option.label)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {selectedTime && selectedType && (
        <button className="btn-primary sticky bottom-24 mt-8" onClick={submit}>
          Reveal Today's Pulse
        </button>
      )}
    </AppShell>
  );
}

function MissionResults() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [results, setResults] = useState([]);
  const [visible, setVisible] = useState(3);
  const [loading, setLoading] = useState(true);
  const filters = parseFilterParam(params.get('filters'));

  useEffect(() => {
    withTimeout(getMissionResultsFromFilters(user.id, filters), null, 7000)
      .then((nextResults) => {
        const nextList = Array.isArray(nextResults) ? nextResults : [];
        setResults(nextList);
        if (nextList[0]) cacheTodayPulse(nextList[0], user.id);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [user.id, params.toString()]);

  return (
    <AppShell>
      <ScreenHeader title="Your pulse for today" subtitle="One small real-life action, matched to your time and path." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(filters.length ? filters : ["I'm open to anything"]).map((filter) => (
          <span key={filter} className="filter-chip-active">
            {filter}
          </span>
        ))}
      </div>
      {loading ? (
        <LoadingCard />
      ) : results.length === 0 ? (
        <EmptyState
          title="Pulse bank is empty"
          body="Run the 96-pulse Supabase migration, then refresh this page."
        />
      ) : (
        <div className="space-y-3">
          {results.slice(0, 1).map((mission) => (
            <MissionCard key={mission.id} mission={mission} primaryLabel="Open Today's Pulse" />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function MissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    withTimeout(getMissionById(id), null, 4500)
      .then(setMission)
      .catch(() => setMission(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><LoadingCard /></AppShell>;
  if (!mission) return <AppShell><EmptyState title="Pulse not found" /></AppShell>;

  async function confirmPulse() {
    if (busy) return;
    setBusy(true);
    cacheTodayPulse(mission, user.id);
    const completed = await withTimeout(getTodayCompletion(user.id), null, 3000).catch(() => null);
    if (completed) {
      navigate('/home');
      return;
    }

    const active = await withTimeout(getActiveMission(user.id), null, 3000).catch(() => null);
    if (!active) {
      await acceptMission(user.id, mission.id, { replaceCurrent: false }).catch((error) => {
        console.error('Could not set today pulse', error);
      });
    }
    navigate('/home');
  }

  return (
    <AppShell>
      <div className="card mission-detail-card space-y-5">
        <div className="space-y-3">
          <span className="soft-pill">{mission.world}</span>
          <h1 className="text-3xl font-black leading-tight">{mission.title}</h1>
          <p className="text-lg font-bold leading-relaxed text-pulse-ink">{getMissionAction(mission)}</p>
          <p className="text-sm font-bold text-pulse-muted">
            {mission.category} / {mission.time_required} / {mission.difficulty} / {mission.xp} XP
          </p>
        </div>

        <InfoBlock title="Why it matters" body={mission.why_it_matters} />
        <InfoBlock title="Done when" body={mission.completion_condition} checked />

        {mission.examples?.length > 0 && (
          <div>
            <h2 className="section-title">Examples</h2>
            <div className="space-y-2">
              {mission.examples.map((example) => (
                <p key={example} className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-pulse-ink">
                  {example}
                </p>
              ))}
            </div>
          </div>
        )}

        {mission.safety_note && (
          <div className="rounded-3xl border border-pulse-border bg-pulse-yellowSoft p-4 text-sm text-pulse-ink">
            {mission.safety_note}
          </div>
        )}

        {mission.unlock_xp > 0 && <p className="text-sm font-semibold text-pulse-muted">Recommended after {mission.unlock_xp} XP.</p>}

        <button className="btn-primary" onClick={confirmPulse} disabled={busy}>
          {busy ? "Setting today's pulse..." : 'Okay'}
        </button>
      </div>
    </AppShell>
  );
}

function CompletionFlow() {
  const { missionId } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [loadingMission, setLoadingMission] = useState(true);
  const [step, setStep] = useState(1);
  const [feeling, setFeeling] = useState('');
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadMission() {
      const [nextMission, existingCompletion] = await Promise.all([
        getMissionById(missionId).catch(() => null),
        withTimeout(getTodayCompletion(user.id), null, 2500).catch(() => null),
      ]);
      if (!mounted) return;
      if (existingCompletion || getCachedTodayCompletion(user.id)) {
        navigate('/home', { replace: true });
        return;
      }
      setMission(nextMission);
      setLoadingMission(false);
    }
    loadMission();
    return () => {
      mounted = false;
    };
  }, [missionId, navigate, user.id]);

  if (loadingMission) {
    return (
      <AppShell hideNav>
        <LoadingCard />
      </AppShell>
    );
  }

  if (!mission) {
    return (
      <AppShell hideNav>
        <EmptyState title="Pulse not found" body="This pulse may have been removed. Go back home and choose another small step." />
      </AppShell>
    );
  }

  async function finish(nextReflection = reflection) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const existingCompletion = await withTimeout(getTodayCompletion(user.id), null, 2500).catch(() => null);
      if (existingCompletion || getCachedTodayCompletion(user.id)) {
        clearCachedTodayPulse();
        navigate('/home', { replace: true });
        return;
      }
      const outcome = await completeMission(user.id, missionId, feeling, 'full', nextReflection);
      clearCachedTodayPulse();
      await refreshProfile(user.id);
      setResult(outcome);
      setStep(3);
    } catch (saveError) {
      console.error('Could not save journal', saveError);
      if (mission) {
        const localCompletion = cacheCompletion(mission, feeling, nextReflection, user.id);
        clearCachedTodayPulse();
        setResult({
          xpEarned: localCompletion.xp_earned,
          totalXP: (profile?.total_xp ?? 0) + localCompletion.xp_earned,
          streak: { daily_streak: Math.max(1, profile?.daily_streak ?? 0) },
          unlocks: [],
          badges: [],
          recap: null,
        });
        setStep(3);
      } else {
        setError('Could not save yet. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell hideNav>
      <div className="card space-y-6">
        {step === 1 && (
          <>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pulse-greenSoft text-pulse-green">
                <CheckCircle2 size={34} />
              </div>
              <h1 className="text-3xl font-black">Pulse Complete</h1>
              <p className="mt-2 text-pulse-muted">You did something real today.</p>
            </div>
            <div>
              <h2 className="section-title">How did it feel?</h2>
              <div className="grid grid-cols-2 gap-2">
                {FEELINGS.map((item) => (
                  <button
                    key={item.label}
                    className={`feeling-card ${feeling === item.label ? 'feeling-card-active' : ''}`}
                    onClick={() => setFeeling(item.label)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" disabled={!feeling} onClick={() => setStep(2)}>
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <ScreenHeader title="Add one tiny note" subtitle={mission?.reflection_prompt || 'What did it feel like?'} compact />
            <div className="journal-entry-box">
              <div className="journal-feeling-chip">
                <span>{FEELINGS.find((item) => item.label === feeling)?.emoji}</span>
                <span>{feeling}</span>
              </div>
              <textarea
                className="input min-h-28 resize-none"
                placeholder="What did it feel like?"
                value={reflection}
                onChange={(event) => setReflection(event.target.value.slice(0, 150))}
                maxLength={150}
              />
              <p className="text-right text-xs font-bold text-pulse-muted">{reflection.length}/150</p>
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => finish()}>
              {busy ? 'Saving...' : 'Save journal'}
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => finish('')}>
              Skip
            </button>
            {error && <p className="text-center text-sm font-bold text-red-500">{error}</p>}
          </>
        )}

        {step === 3 && result && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pulse-yellowSoft text-pulse-gold">
              <Coins size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black">+{result.xpEarned} XP earned</h1>
              <p className="mt-2 font-bold text-pulse-green">Day streak finished: {result.streak.daily_streak}</p>
              <p className="mt-1 font-bold text-pulse-primary">Total XP: {result.totalXP}</p>
              <p className="mt-3 text-pulse-muted">More importantly, you changed the script for a moment.</p>
            </div>
            {result.badges.length > 0 && (
              <div className="rounded-3xl bg-pulse-purpleSoft p-4 text-left">
                <p className="font-black text-pulse-primary">Badge earned</p>
                <p className="text-sm text-pulse-muted">{result.badges.map((badge) => badge.name).join(', ')}</p>
              </div>
            )}
            {result.unlocks.length > 0 && (
              <div className="rounded-3xl bg-pulse-yellowSoft p-4 text-left">
                <p className="font-black text-pulse-gold">Unlocks available</p>
                <p className="text-sm text-pulse-muted">{result.unlocks[result.unlocks.length - 1].name}</p>
              </div>
            )}
            <button className="btn-primary" onClick={() => navigate('/home', { replace: true })}>
              Back Home
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CategoriesScreen() {
  return <LockedCategoriesNotice />;
}

function LockedCategoriesNotice() {
  return (
    <AppShell>
      <ScreenHeader title="Browse Categories" subtitle="This part opens after the first MVP loop is stronger." />
      <div className="card space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-pulse-blueSoft text-pulse-primary">
          <Lock size={30} />
        </div>
        <div>
          <h2 className="text-2xl font-black">Categories are locked for now</h2>
          <p className="mt-2 text-pulse-muted">
            For the MVP, Everyday Pulse focuses on one clear path: choose time, pick one pulse path, do one real thing.
          </p>
        </div>
        <Link className="btn-primary" to="/find-mission">
          Find My Pulse
        </Link>
      </div>
    </AppShell>
  );
}

function WorldScreen() {
  return <LockedCategoriesNotice />;
}

function LockedWorldScreen() {
  const { world } = useParams();
  const decodedWorld = decodeURIComponent(world);
  const worldData = WORLDS.find((item) => item.name === decodedWorld);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    getMissionsByWorld(decodedWorld).then(setMissions);
  }, [decodedWorld]);

  return (
    <AppShell>
      <ScreenHeader title={decodedWorld} subtitle="Choose a category or start from this world." />
      <div className="space-y-3">
        {worldData?.categories.map((category) => (
          <Link
            key={category.name}
            to={`/categories/${encodeURIComponent(decodedWorld)}/${encodeURIComponent(category.name)}`}
            className="card flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-black">{category.name}</h2>
              <p className="text-sm text-pulse-muted">{category.description}</p>
            </div>
            <BookOpen className="text-pulse-primary" size={22} />
          </Link>
        ))}
      </div>
      <h2 className="section-title mt-6">Pulses in this world</h2>
      <div className="space-y-3">{missions.slice(0, 4).map((mission) => <MissionCard key={mission.id} mission={mission} />)}</div>
    </AppShell>
  );
}

function CategoryScreen() {
  return <LockedCategoriesNotice />;
}

function LockedCategoryScreen() {
  const { world, category } = useParams();
  const decodedWorld = decodeURIComponent(world);
  const decodedCategory = decodeURIComponent(category);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    getMissionsByCategory(decodedWorld, decodedCategory).then(setMissions);
  }, [decodedWorld, decodedCategory]);

  return (
    <AppShell>
      <ScreenHeader title={decodedCategory} subtitle={decodedWorld} />
      <div className="space-y-3">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </AppShell>
  );
}

function SavedScreen() {
  const { user } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    withTimeout(getSavedMissions(user.id), [], 3500)
      .then((remoteSaved) => setSaved(mergeSavedPulses(remoteSaved, user.id)))
      .catch(() => setSaved(mergeSavedPulses([], user.id)))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <AppShell>
      <ScreenHeader title="Saved Pulses" subtitle="A gentle shelf for later." />
      <div className="space-y-3">
        {loading ? (
          <LoadingCard />
        ) : saved.length === 0 ? (
          <EmptyState title="Nothing saved yet" body="Save a pulse when it feels like a good future fit." />
        ) : (
          saved.map((item) => <MissionCard key={item.id} mission={item.missions} />)
        )}
      </div>
    </AppShell>
  );
}

function ProgressScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [recap, setRecap] = useState(null);
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState({ completed: 0, topCategory: null, feeling: null });

  useEffect(() => {
    let mounted = true;
    async function load() {
      await withTimeout(refreshProfile(user.id), null, 2500);
      const weekly = await withTimeout(calculateWeeklyRecap(user.id), null, 3500).catch(() => null);
      if (mounted) setRecap(weekly);
      const [{ data: earned }, { data: completions }] = await withTimeout(
        Promise.all([
          supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id),
          supabase.from('completed_missions').select('*, missions(category)').eq('user_id', user.id),
        ]),
        [{ data: [] }, { data: [] }],
        3500,
      ).catch(() => [{ data: [] }, { data: [] }]);
      if (!mounted) return;
      setBadges(earned ?? []);
      const combinedCompletions = [...getCachedCompletions(user.id), ...(completions ?? [])];
      const countBy = (getter) =>
        combinedCompletions.reduce((counts, item) => {
          const key = getter(item);
          if (key) counts[key] = (counts[key] ?? 0) + 1;
          return counts;
        }, {});
      const topOf = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      setStats({
        completed: combinedCompletions.length,
        topCategory: topOf(countBy((item) => item.missions?.category)),
        feeling: topOf(countBy((item) => item.feeling)),
      });
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  const currentLevelXp = (profile?.total_xp ?? 0) + getCachedXp(user.id);
  const nextLevel = getNextLevel(currentLevelXp);
  const progress = nextLevel.xp === currentLevelXp ? 100 : Math.min(100, (currentLevelXp / nextLevel.xp) * 100);

  return (
    <AppShell>
      <ScreenHeader title="Progress" subtitle="Tiny actions count." />
      <div className="card space-y-5 bg-pulse-purpleSoft">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Total XP</p>
            <h2 className="text-4xl font-black">{currentLevelXp}</h2>
            <p className="font-bold text-pulse-primary">{getUserLevel(currentLevelXp)}</p>
          </div>
          <Trophy className="text-pulse-primary" size={42} />
        </div>
        <ProgressBar value={progress} />
        <p className="text-sm text-pulse-muted">Next level: {nextLevel.name}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Streak" value={`${profile?.daily_streak ?? 0} days`} />
      </div>

      <div className="mt-4 space-y-3">
        <WeeklyMomentum recap={recap} />
        <NextUnlockCard totalXP={profile?.total_xp ?? 0} />
      </div>

      <h2 className="section-title mt-6">Badges</h2>
      <div className="grid grid-cols-2 gap-3">
        {badges.length === 0 ? (
          <div className="card col-span-2 text-center text-pulse-muted">Complete your first pulse to start earning badges.</div>
        ) : (
          badges.map((item) => (
            <div key={item.id} className="card text-center">
              <Star className="mx-auto text-pulse-gold" />
              <p className="mt-2 font-black">{item.badges.name}</p>
              <p className="text-xs text-pulse-muted">{item.badges.description}</p>
            </div>
          ))
        )}
      </div>

      {false && <h2 className="section-title mt-6">Locked Packs</h2>}
      <div className="hidden">
        {UNLOCKS.filter((unlock) => unlock.xp > (profile?.total_xp ?? 0)).map((unlock) => (
          <div key={unlock.name} className="card flex items-center justify-between">
            <div>
              <p className="font-black">{unlock.name}</p>
          <p className="text-sm text-pulse-muted">Unlocks at {unlock.xp} XP / Premium coming soon</p>
            </div>
            <Lock className="text-pulse-muted" size={20} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function WeeklyScreen() {
  const { user, profile } = useAuth();
  const [recap, setRecap] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [weekly, completions] = await withTimeout(
        Promise.all([
          calculateWeeklyRecap(user.id).catch(() => null),
          getWeeklyCompletionLog(user.id).catch(() => []),
        ]),
        [null, []],
        4500,
      );
      if (!mounted) return;
      setRecap(weekly);
      const byId = new Map();
      [...getCachedWeeklyCompletions(user.id), ...completions].forEach((item) => {
        if (item?.id) byId.set(item.id, item);
      });
      const mergedItems = [...byId.values()].sort((a, b) => new Date(b.completed_at ?? 0) - new Date(a.completed_at ?? 0));
      setItems(mergedItems);
      setRecap(summarizeCompletions(mergedItems, weekly ?? {}));
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  return (
    <AppShell>
      <ScreenHeader title="Your Week" subtitle="The small things you actually did." />
      <div className="card space-y-4 bg-pulse-blueSoft">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">This week</p>
            <h2 className="text-3xl font-black">{recap?.missions_completed ?? 0} pulses</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-pulse-primary">
            {recap?.xp_earned ?? 0} XP
          </span>
        </div>
        <WeeklyMomentum recap={recap} completedDayKeys={completionDateKeys(items)} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Streak" value={`${profile?.daily_streak ?? 0} days`} />
          <StatCard label="Most felt" value={recap?.most_felt_emotion ?? 'Not yet'} />
        </div>
      </div>

      <h2 className="section-title mt-6">Pulse Log</h2>
      <div className="space-y-3">
        {loading ? (
          <LoadingCard />
        ) : items.length === 0 ? (
          <EmptyState title="No pulses completed this week" body="Complete one pulse to start your weekly log." />
        ) : (
          items.map((item) => <WeeklyLogCard key={item.id} item={item} />)
        )}
      </div>
    </AppShell>
  );
}

function WeeklyLogCard({ item }) {
  const feeling = FEELINGS.find((entry) => entry.label === item.feeling);
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-pulse-muted">
            {new Date(item.completed_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <h3 className="mt-1 text-lg font-black">{item.missions?.title}</h3>
        </div>
        <span className="xp-mini">+{item.xp_earned} XP</span>
      </div>
      <p className="text-sm font-semibold text-pulse-ink">{shorten(getMissionAction(item.missions), 130)}</p>
      <div className="rounded-2xl bg-pulse-purpleSoft p-3">
        <p className="text-sm font-black text-pulse-primary">{feeling?.emoji} {item.feeling ?? 'Felt something'}</p>
        <p className="mt-1 text-sm text-pulse-muted">{item.one_line_reflection || 'No note added.'}</p>
      </div>
    </div>
  );
}

function ProfileScreen() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const totalXP = (profile?.total_xp ?? 0) + getCachedXp(user.id);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/onboarding', { replace: true });
  }

  return (
    <AppShell>
      <ScreenHeader title="Profile" subtitle="Your real-life adventure log." />
      <div className="card space-y-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pulse-purpleSoft text-pulse-primary">
          <User size={36} />
        </div>
        <div>
          <h2 className="text-2xl font-black">{profile?.display_name ?? 'Pulse Player'}</h2>
          <p className="text-pulse-muted">{totalXP} Life XP / {getUserLevel(totalXP)}</p>
        </div>
        <Link className="btn-secondary" to="/saved">
          Saved Pulses
        </Link>
        <button className="btn-ghost flex items-center justify-center gap-2" onClick={signOut}>
          <LogOut size={18} /> Log out
        </button>
      </div>
    </AppShell>
  );
}

function AppShell({ children, hideNav = false }) {
  return (
    <main className="min-h-screen px-0 py-0 text-pulse-ink sm:px-4 sm:py-6">
      <div className="app-frame mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:min-h-[calc(100vh-48px)]">
        <div className={`flex-1 px-4 py-5 ${hideNav ? 'pb-4' : 'pb-28'}`}>{children}</div>
        {!hideNav && <BottomNav />}
      </div>
    </main>
  );
}

function CenteredShell({ children }) {
  return (
    <main className="min-h-screen px-0 py-0 text-pulse-ink sm:px-4 sm:py-6">
      <div className="app-frame mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-4 py-8 sm:min-h-[calc(100vh-48px)]">
        {children}
      </div>
    </main>
  );
}

function BottomNav() {
  const location = useLocation();
  const items = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/find-mission', label: 'Pulses', icon: Target },
    { to: '/saved', label: 'Saved', icon: Save },
    { to: '/weekly', label: 'Weekly', icon: Trophy },
    { to: '/profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 z-20 grid w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 grid-cols-5 rounded-[28px] border border-pulse-border bg-[#fbfdff]/95 p-2 shadow-soft backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to} className={`bottom-nav-item ${active ? 'bottom-nav-active' : ''}`}>
            <Icon size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ScreenHeader({ title, subtitle, compact = false }) {
  return (
    <header className={compact ? 'mb-3' : 'mb-6'}>
      <h1 className="text-3xl font-black leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-pulse-muted">{subtitle}</p>}
    </header>
  );
}

function LoadingScreen() {
  return (
    <CenteredShell>
      <LoadingCard />
    </CenteredShell>
  );
}

function LoadingCard() {
  return (
    <div className="loading-pulse-card">
      <img className="loading-pulse-logo" src="/everyday-pulse-thumbnail.png" alt="Everyday Pulse loading" />
      <p className="mt-4 text-sm font-black text-pulse-primary">Finding your next pulse...</p>
      <p className="mt-1 text-xs font-bold text-pulse-muted">One small moment.</p>
    </div>
  );
}

function StarterMissionCard({ mission, index }) {
  const labels = ['Quick Win', 'Clear Space', 'Fresh Air'];
  const icons = [MessageCircle, Sparkles, Leaf];
  const Icon = icons[index] ?? Sparkles;
  return (
    <Link to={`/mission/${mission.id}`} className="card flex items-center gap-4">
      <div className="icon-bubble bg-pulse-purpleSoft text-pulse-primary">
        <Icon size={23} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-pulse-primary">{labels[index]}</p>
        <h2 className="font-black leading-snug">{mission.title}</h2>
        <p className="mt-1 text-sm text-pulse-muted">
          {mission.category} / {mission.time_required} / {mission.difficulty} / {mission.xp} XP
        </p>
      </div>
    </Link>
  );
}

function XpChip({ xp, onClick }) {
  return (
    <button className="xp-chip" onClick={onClick}>
      <Coins size={17} /> {xp} XP
    </button>
  );
}

function InstallButton({ onClick }) {
  return (
    <button className="install-chip" onClick={onClick} title="Add to Home Screen" aria-label="Add to Home Screen">
      <Home size={17} />
    </button>
  );
}

function NoMissionActions({ onSurprise, surpriseBusy = false }) {
  return (
    <section className="space-y-3">
      <ActionGrid onSurprise={onSurprise} surpriseBusy={surpriseBusy} />
    </section>
  );
}

function TodayPulseLine({ title, done }) {
  if (!title) return null;
  return (
    <div className="today-pulse-line">
      <span>{done ? 'Today completed' : "Today's pulse"}</span>
      <strong>{title}</strong>
    </div>
  );
}

function SavedYesterdayPrompt({ item }) {
  const mission = item?.missions;
  if (!mission) return null;
  return (
    <div className="saved-yesterday-card">
      <div>
        <p className="eyebrow">Saved for later</p>
        <h2 className="mt-1 text-lg font-black">{mission.title}</h2>
        <p className="mt-1 text-sm font-semibold text-pulse-muted">Want to make this today's pulse?</p>
      </div>
      <Link className="btn-secondary py-3" to={`/mission/${mission.id}`}>
        Open
      </Link>
    </div>
  );
}

function ActionGrid({ onSurprise, surpriseBusy = false }) {
  return (
    <div className="space-y-3">
      <ActionCard
        icon={Dice5}
        tone="purple"
        title="Surprise Me"
        description={surpriseBusy ? 'Finding one pulse...' : 'Get one unexpected pulse.'}
        onClick={onSurprise}
        disabled={surpriseBusy}
      />
      <ActionCard
        icon={Target}
        tone="green"
        title="Find My Pulse"
        description="Choose what you need right now."
        to="/find-mission"
      />
      <ActionCard
        icon={Grid2X2}
        tone="gold"
        title="Browse Categories"
        description="Coming soon: explore worlds and pulse types."
        locked
      />
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, onClick, to, tone = 'purple', locked = false, disabled = false }) {
  const content = (
    <>
      <div className={`home-action-icon home-action-icon-${tone}`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-[15px] font-black leading-tight">{title}</h3>
        <p className="mt-1 text-[12px] font-semibold leading-snug text-pulse-muted">{description}</p>
      </div>
      {locked ? <Lock className="text-pulse-muted" size={19} /> : <ChevronRight className={`home-action-chevron home-action-chevron-${tone}`} size={20} />}
    </>
  );
  if (locked) {
    return (
      <button className={`home-action-card home-action-card-${tone} opacity-80`} disabled title="Browse Categories is locked for this MVP">
        {content}
      </button>
    );
  }
  if (to) {
    return (
      <Link to={to} className={`home-action-card home-action-card-${tone}`}>
        {content}
      </Link>
    );
  }
  return (
    <button className={`home-action-card home-action-card-${tone}`} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

function ActiveMissionCard({ active, onOpenDetails, onDone, onSave }) {
  const mission = active.missions;
  return (
    <div className="card space-y-4 bg-gradient-to-br from-pulse-blueSoft via-pulse-purpleSoft to-pulse-yellowSoft">
      <button className="w-full rounded-[24px] text-left transition active:scale-[0.99]" onClick={onOpenDetails}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Today's Pulse</p>
            <h2 className="mt-1 text-2xl font-black leading-tight">{mission.title}</h2>
          </div>
          <span className="status-pill">In Progress</span>
        </div>
        <p className="mt-3 text-sm font-bold text-pulse-muted">
          {mission.category} / {mission.time_required} / {mission.difficulty} / {mission.xp} XP
        </p>
        <p className="mt-3 font-semibold text-pulse-ink">{shorten(getMissionAction(mission))}</p>
        <p className="mt-2 text-xs font-black text-pulse-primary">Tap to see why it matters and done condition</p>
      </button>
      <div className="rounded-[22px] border border-white/70 bg-white/65 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-pulse-green" size={20} />
          <div>
            <p className="eyebrow">Done when</p>
            <p className="mt-1 text-sm font-bold leading-snug text-pulse-ink">{mission.completion_condition}</p>
          </div>
        </div>
      </div>
      <div className="done-confirm-card">
        <div>
          <p className="eyebrow">Check if done</p>
          <h2>Pulse for Today done?</h2>
        </div>
        <button className="btn-primary" onClick={onDone}>
          <CheckCircle2 size={20} />
          Yes, done
        </button>
      </div>
      <div className="space-y-2">
        <button className="btn-ghost flex items-center justify-center gap-2" onClick={onSave}>
          <Save size={18} /> Save for Later
        </button>
      </div>
    </div>
  );
}

function CompletedTodayCard({ completion, onClick }) {
  const feeling = FEELINGS.find((item) => item.label === completion.feeling);
  return (
    <button className="card w-full space-y-4 bg-pulse-greenSoft text-left" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="icon-bubble bg-white text-pulse-green">
          <CheckCircle2 size={25} />
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-pulse-green">+{completion.xp_earned} XP</span>
      </div>
      <div>
        <p className="eyebrow text-pulse-green">Today's Pulse Complete</p>
        <h2 className="mt-1 text-2xl font-black">{completion.missions.title}</h2>
        <p className="mt-2 text-pulse-muted">
          {feeling?.emoji} {completion.feeling} / Tap to view your note
        </p>
      </div>
    </button>
  );
}

function WeeklyMomentum({ recap, completedDayKeys = [], compact = false }) {
  const count = Math.min(7, recap?.weekly_momentum ?? 0);
  const completedSet = new Set(completedDayKeys);
  const days = weekDayKeys();
  return (
    <div className={`home-momentum-card ${compact ? 'home-momentum-card-compact' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1 text-[15px] font-black">Weekly Momentum <Flame aria-hidden="true" size={15} className="text-pulse-gold" /></h2>
        </div>
        <ChevronRight className="text-pulse-muted" size={19} />
      </div>
      <div className={`${compact ? 'mt-3' : 'mt-4'} momentum-week-grid`}>
        {days.map((day, index) => {
          const completed = completedSet.has(day) || (!completedDayKeys.length && index < count);
          return (
            <span key={day} className={`streak-dot ${completed ? 'streak-dot-active' : ''}`}>
              {completed && <CheckCircle2 size={11} strokeWidth={3} />}
            </span>
          );
        })}
      </div>
      <div className="momentum-week-grid mt-2 text-[9px] font-black uppercase text-pulse-muted">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <span key={`${day}-${index}`} className="text-center">{day}</span>
        ))}
      </div>
      <p className={`${compact ? 'mt-2' : 'mt-3'} text-[13px] font-black text-pulse-ink`}>
        {count > 0 ? `${count}/7 mission days this week` : 'Your momentum is resting. Start again today.'}
      </p>
    </div>
  );
}

function NextUnlockCard({ totalXP }) {
  const unlock = getNextUnlock(totalXP);
  const previous = [...UNLOCKS].reverse().find((item) => item.xp <= totalXP) ?? UNLOCKS[0];
  const span = Math.max(1, unlock.xp - previous.xp);
  const progress = unlock.xp <= totalXP ? 100 : ((totalXP - previous.xp) / span) * 100;
  const away = Math.max(0, unlock.xp - totalXP);
  return (
    <div className="home-unlock-card">
      <div className="grid grid-cols-[44px_1fr] items-center gap-3">
        <div className="home-lock-visual">
          <Lock size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[13px] font-black">Next Unlock</h2>
          <p className="text-[12px] font-black leading-snug text-pulse-ink">
            {away === 0 ? `${unlock.name} unlocked` : `${away} XP away from ${unlock.name}`}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={progress} />
      </div>
    </div>
  );
}

function MissionCard({ mission, primaryLabel = 'Start This Pulse' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="icon-bubble bg-pulse-blueSoft text-pulse-blue">
            <Target size={21} />
          </div>
          <div>
            <h2 className="font-black leading-snug">{mission.title}</h2>
            <p className="mt-1 text-sm text-pulse-muted">
              {mission.category} / {mission.time_required} / {mission.difficulty}
            </p>
          </div>
        </div>
        <span className="xp-mini">{mission.xp} XP</span>
      </div>
      <p className="text-sm font-semibold text-pulse-ink">{shorten(getMissionAction(mission))}</p>
      <p className="text-sm text-pulse-muted">{shorten(mission.why_it_matters)}</p>
      {mission.unlock_xp > 0 && <p className="text-xs font-bold text-pulse-gold">Recommended after {mission.unlock_xp} XP</p>}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          className="btn-primary py-3"
          onClick={() => {
            cacheTodayPulse(mission, user.id);
            navigate(`/mission/${mission.id}`);
          }}
        >
          {primaryLabel}
        </button>
        <button
          className="icon-button"
          disabled={saving}
          title="Save pulse"
          onClick={async () => {
            cacheSavedPulse(mission, user.id);
            setSaved(true);
            setSaving(true);
            await saveMission(user.id, mission.id).catch((error) => {
              console.error('Could not save pulse remotely', error);
            });
            setSaving(false);
          }}
        >
          {saved ? <CheckCircle2 size={19} /> : <Save size={19} />}
        </button>
      </div>
    </div>
  );
}

function InfoBlock({ title, body, checked = false }) {
  return (
    <div>
      <h2 className="section-title flex items-center gap-2">
        {checked && <CheckCircle2 size={18} className="text-pulse-green" />}
        {title}
      </h2>
      <p className="leading-relaxed text-pulse-ink">{body}</p>
    </div>
  );
}

function XpModal({ profile, onClose }) {
  const totalXP = profile?.total_xp ?? 0;
  const nextLevel = getNextLevel(totalXP);
  const nextUnlock = getNextUnlock(totalXP);
  const progress = nextLevel.xp <= totalXP ? 100 : Math.min(100, (totalXP / nextLevel.xp) * 100);
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-2xl font-black">Life XP</h2>
        <div className="rounded-3xl bg-pulse-purpleSoft p-4">
          <p className="eyebrow">Current XP</p>
          <p className="text-4xl font-black">{totalXP}</p>
          <p className="font-bold text-pulse-primary">{profile?.level ?? 'Starter'}</p>
        </div>
        <ProgressBar value={progress} />
        <RecapRow label="Next level" value={nextLevel.name} />
        <RecapRow label="Next unlock" value={nextUnlock.name} />
      </div>
    </Modal>
  );
}

function InstallHelpModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <img className="brand-logo h-12 w-12" src="/everyday-pulse-thumbnail.png" alt="" />
          <div>
            <p className="eyebrow">Home screen</p>
            <h2 className="text-2xl font-black">Add Everyday Pulse</h2>
          </div>
        </div>
        <p className="leading-relaxed text-pulse-muted">
          On Android Chrome, tap this icon and confirm the browser prompt. If Chrome does not show it, use the three-dot menu and
          choose Add to Home screen.
        </p>
        <div className="rounded-3xl bg-pulse-blueSoft p-4 text-sm font-bold text-pulse-ink">
          Do not use Download page. That saves an .mht offline copy, not the app shortcut. The correct flow creates an Everyday Pulse
          icon on your home screen or app drawer.
        </div>
        <div className="rounded-3xl bg-pulse-yellowSoft p-4 text-sm font-bold text-pulse-ink">
          The install prompt usually will not appear on localhost. Test from your deployed HTTPS URL after publishing the app.
        </div>
      </div>
    </Modal>
  );
}

function ReflectionSheet({ completion, onClose }) {
  const { user } = useAuth();
  const feeling = FEELINGS.find((item) => item.label === completion.feeling);
  const [draft, setDraft] = useState(completion.one_line_reflection ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveNote() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (`${completion.id}`.startsWith('local-')) {
        updateCachedCompletionReflection(completion.id, draft, user.id);
      } else {
        await updateCompletionReflection(user.id, completion.id, draft);
      }
      onClose();
    } catch (saveError) {
      console.error('Could not save note', saveError);
      setError('Could not save yet. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-2xl font-black">{completion.missions.title}</h2>
        <RecapRow label="Feeling" value={`${feeling?.emoji ?? ''} ${completion.feeling}`} />
        <RecapRow label="XP earned" value={completion.xp_earned} />
        <RecapRow label="Completed" value={new Date(completion.completed_at).toLocaleString()} />
        <div className="rounded-3xl bg-pulse-blueSoft p-4">
          <p className="eyebrow">One-line note</p>
          <textarea
            className="input mt-3 min-h-24 resize-none bg-white"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 150))}
            maxLength={150}
            placeholder="What did it feel like?"
          />
          <p className="mt-1 text-right text-xs font-bold text-pulse-muted">{draft.length}/150</p>
        </div>
        <button className="btn-primary" disabled={saving} onClick={saveNote}>
          {saving ? 'Saving...' : 'Save note'}
        </button>
        {error && <p className="text-center text-sm font-bold text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}

function PulseDetailSheet({ mission, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Today's Pulse</p>
          <h2 className="mt-1 text-2xl font-black leading-tight">{mission.title}</h2>
          <p className="mt-2 text-sm font-bold text-pulse-muted">
            {mission.category} / {mission.time_required} / {mission.difficulty} / {mission.xp} XP
          </p>
        </div>
        <div className="rounded-3xl bg-pulse-purpleSoft p-4">
          <p className="eyebrow">Pulse</p>
          <p className="mt-2 font-bold leading-relaxed text-pulse-ink">{getMissionAction(mission)}</p>
        </div>
        <div className="rounded-3xl bg-pulse-blueSoft p-4">
          <p className="eyebrow">Why it matters</p>
          <p className="mt-2 leading-relaxed text-pulse-ink">{mission.why_it_matters}</p>
        </div>
        <div className="rounded-3xl bg-pulse-greenSoft p-4">
          <p className="eyebrow flex items-center gap-2">
            <CheckCircle2 size={18} className="text-pulse-green" />
            Done when
          </p>
          <p className="mt-2 font-bold leading-relaxed text-pulse-ink">{mission.completion_condition}</p>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-pulse-ink/30 px-4 pb-4" onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-[28px] bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
        {children}
        <button className="btn-secondary mt-5" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="card text-center">
      <Sparkles className="mx-auto text-pulse-primary" />
      <h2 className="mt-2 text-xl font-black">{title}</h2>
      {body && <p className="mt-1 text-pulse-muted">{body}</p>}
    </div>
  );
}

function RecentMission({ completion }) {
  return (
    <div className="card">
      <p className="eyebrow">Recent completed pulse</p>
      <h2 className="font-black">{completion.missions.title}</h2>
      <p className="text-sm text-pulse-muted">+{completion.xp_earned} XP / {completion.feeling}</p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-pulse-muted">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function RecapRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-pulse-muted">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-pulse-border">
      <div
        className="h-full rounded-full bg-gradient-to-r from-pulse-primary via-pulse-blue to-pulse-green"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function shorten(text = '', max = 110) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

function getMissionAction(mission = {}) {
  return mission.mission || mission.action || mission.description || mission.completion_condition || mission.title || '';
}

function firstName(name = 'Alex') {
  return name.trim().split(/\s+/)[0] || 'Alex';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

createRoot(document.getElementById('root')).render(<App />);


