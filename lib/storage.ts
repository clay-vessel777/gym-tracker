import { WorkoutSession, WorkoutDay, TimeSlot, ExerciseLog } from './data';
import { supabase } from './supabase';

// ---- Goal Tracker ----

export type GoalMeasurementType =
  | 'weight'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'bicep_left'
  | 'bicep_right'
  | 'thigh'
  | 'neck'
  | 'shoulders'
  | 'calf';

export const MEASUREMENT_LABELS: Record<GoalMeasurementType, string> = {
  weight:       'Body Weight',
  chest:        'Chest',
  waist:        'Waist',
  hips:         'Hips',
  bicep_left:   'Bicep (Left)',
  bicep_right:  'Bicep (Right)',
  thigh:        'Thigh',
  neck:         'Neck',
  shoulders:    'Shoulders',
  calf:         'Calf',
};

export const MEASUREMENT_UNITS: Record<GoalMeasurementType, string> = {
  weight:      'lbs',
  chest:       'in',
  waist:       'in',
  hips:        'in',
  bicep_left:  'in',
  bicep_right: 'in',
  thigh:       'in',
  neck:        'in',
  shoulders:   'in',
  calf:        'in',
};

export type GoalEntry = {
  id: string;
  profile: string; // 'jlord' | 'jasmine'
  measurementType: GoalMeasurementType;
  value: number;
  date: string; // ISO date string
  note?: string;
};

export async function saveGoalEntries(entries: Omit<GoalEntry, 'id'>[], profile: string): Promise<void> {
  const rows = entries.map(e => ({
    id: `${profile}-${e.measurementType}-${e.date}-${Date.now()}`,
    profile,
    type: e.measurementType === 'weight' ? 'weight' : 'measurement',
    measurement_type: e.measurementType,
    value: e.value,
    unit: MEASUREMENT_UNITS[e.measurementType],
    date: e.date,
    note: e.note ?? null,
  }));
  await supabase.from('goal_entries').insert(rows);
}

export async function loadGoalEntries(profile: string): Promise<GoalEntry[]> {
  const { data, error } = await supabase
    .from('goal_entries')
    .select('*')
    .eq('profile', profile)
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    profile: row.profile,
    measurementType: row.measurement_type as GoalMeasurementType,
    value: Number(row.value),
    date: row.date,
    note: row.note ?? undefined,
  }));
}

export function getLatestValues(entries: GoalEntry[]): Partial<Record<GoalMeasurementType, GoalEntry>> {
  const latest: Partial<Record<GoalMeasurementType, GoalEntry>> = {};
  for (const entry of entries) {
    if (!latest[entry.measurementType]) {
      latest[entry.measurementType] = entry;
    }
  }
  return latest;
}

export function daysSinceLastEntry(entries: GoalEntry[]): number | null {
  if (entries.length === 0) return null;
  const latest = entries[0].date;
  const diff = Date.now() - new Date(latest).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ---- Goals (targets) ----

export type GoalTarget = {
  id: string;
  profile: string;
  measurementType: GoalMeasurementType;
  startValue: number | null;
  targetValue: number;
  startDate: string;
  targetDate: string;
  note?: string;
  achieved: boolean;
};

export async function saveGoalTarget(goal: Omit<GoalTarget, 'id' | 'achieved'>): Promise<void> {
  await supabase.from('goals').insert({
    id: `goal-${goal.profile}-${goal.measurementType}-${Date.now()}`,
    profile: goal.profile,
    measurement_type: goal.measurementType,
    start_value: goal.startValue,
    target_value: goal.targetValue,
    start_date: goal.startDate,
    target_date: goal.targetDate,
    note: goal.note ?? null,
    achieved: false,
  });
}

export async function loadGoalTargets(profile: string): Promise<GoalTarget[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('profile', profile)
    .order('target_date', { ascending: true });
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    profile: row.profile,
    measurementType: row.measurement_type as GoalMeasurementType,
    startValue: row.start_value ? Number(row.start_value) : null,
    targetValue: Number(row.target_value),
    startDate: row.start_date,
    targetDate: row.target_date,
    note: row.note ?? undefined,
    achieved: row.achieved,
  }));
}

export async function markGoalAchieved(id: string): Promise<void> {
  await supabase.from('goals').update({ achieved: true }).eq('id', id);
}

// ---- In-progress workout (localStorage only — session state) ----

export type InProgressWorkout = {
  day: WorkoutDay;
  timeSlot: TimeSlot;
  jasmineMode: boolean;
  guestMode: boolean;
  currentIdx: number;
  startTime: number;
  logs: ExerciseLog[];
};

const IN_PROGRESS_KEY = 'gym_in_progress';
const SESSIONS_CACHE_KEY = 'gym_sessions';
const WEIGHTS_CACHE_KEY = 'gym_weights';
const ROTATION_KEY = 'gym_rotation';

export function saveInProgress(state: InProgressWorkout): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
}

export function getInProgress(): InProgressWorkout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IN_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearInProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IN_PROGRESS_KEY);
}

// ---- Sessions ----

function getLocalSessions(): WorkoutSession[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SESSIONS_CACHE_KEY) || '[]'); }
  catch { return []; }
}

function setLocalSessions(sessions: WorkoutSession[]): void {
  localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions));
}

export function getSessions(): WorkoutSession[] {
  return getLocalSessions();
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  // 1. Save to localStorage immediately (works offline)
  const sessions = getLocalSessions();
  sessions.unshift(session);
  setLocalSessions(sessions);

  // Update weight cache
  session.exercises.forEach(ex => {
    if (ex.weightUsed > 0) setLocalWeight(ex.id, ex.weightUsed);
  });
  setLastDay(session.day);

  // 2. Sync to Supabase
  const { error } = await supabase.from('workout_sessions').upsert({
    id: session.id,
    date: session.date,
    day: session.day,
    time_slot: session.timeSlot,
    jasmine_mode: session.jasmineMode,
    duration_minutes: session.durationMinutes,
    exercises: session.exercises,
  });

  if (error) {
    console.error('Supabase session save failed:', error);
  } else {
    // Sync weights only if session saved successfully
    const weightUpserts = session.exercises
      .filter(ex => ex.weightUsed > 0)
      .map(ex => ({ exercise_id: ex.id, weight: ex.weightUsed }));
    if (weightUpserts.length > 0) {
      await supabase.from('exercise_weights').upsert(weightUpserts);
    }
  }
}

// Load sessions from Supabase, merge with localStorage, push any missing ones up
export async function loadSessionsFromCloud(): Promise<WorkoutSession[]> {
  const local = getLocalSessions();

  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error || !data) throw error;

    const cloudSessions: WorkoutSession[] = data.map(row => ({
      id: row.id,
      date: row.date,
      day: row.day,
      timeSlot: row.time_slot,
      jasmineMode: row.jasmine_mode,
      durationMinutes: row.duration_minutes,
      exercises: row.exercises,
    }));

    const cloudIds = new Set(cloudSessions.map(s => s.id));

    // Push any local-only sessions up to Supabase
    const localOnly = local.filter(s => !cloudIds.has(s.id));
    if (localOnly.length > 0) {
      await supabase.from('workout_sessions').upsert(
        localOnly.map(s => ({
          id: s.id, date: s.date, day: s.day,
          time_slot: s.timeSlot, jasmine_mode: s.jasmineMode,
          duration_minutes: s.durationMinutes, exercises: s.exercises,
        }))
      );
    }

    // Merge: cloud + any local-only, sorted by date desc
    const merged = [...cloudSessions, ...localOnly]
      .sort((a, b) => b.date.localeCompare(a.date));

    setLocalSessions(merged);
    return merged;
  } catch (e) {
    console.warn('Could not load from Supabase, using local cache', e);
    return local;
  }
}

// Load weights from Supabase and refresh local cache
export async function loadWeightsFromCloud(): Promise<void> {
  try {
    const { data, error } = await supabase.from('exercise_weights').select('*');
    if (error || !data) throw error;
    data.forEach(row => setLocalWeight(row.exercise_id, row.weight));
  } catch (e) {
    console.warn('Could not load weights from Supabase', e);
  }
}

// ---- Weight memory ----

function getLocalWeight(exerciseId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const map = JSON.parse(localStorage.getItem(WEIGHTS_CACHE_KEY) || '{}');
    return map[exerciseId] ?? null;
  } catch { return null; }
}

function setLocalWeight(exerciseId: string, weight: number): void {
  const map = JSON.parse(localStorage.getItem(WEIGHTS_CACHE_KEY) || '{}');
  map[exerciseId] = weight;
  localStorage.setItem(WEIGHTS_CACHE_KEY, JSON.stringify(map));
}

export function getLastWeight(exerciseId: string): number | null {
  return getLocalWeight(exerciseId);
}

export function getWeightHistory(exerciseId: string): number[] {
  return getLocalSessions()
    .flatMap(s => s.exercises.filter(e => e.id === exerciseId && e.weightUsed > 0))
    .map(e => e.weightUsed)
    .reverse()
    .slice(-5);
}

// ---- Rotation ----

const DAY_ORDER: WorkoutDay[] = ['A', 'B', 'C'];

export function getNextDay(): WorkoutDay {
  if (typeof window === 'undefined') return 'A';
  const last = localStorage.getItem(ROTATION_KEY) as WorkoutDay | null;
  if (!last) return 'A';
  const idx = DAY_ORDER.indexOf(last);
  return DAY_ORDER[(idx + 1) % 3];
}

export function setLastDay(day: WorkoutDay): void {
  if (typeof window !== 'undefined') localStorage.setItem(ROTATION_KEY, day);
}

// ---- Phase ----

export function getCurrentPhase(): 1 | 2 | 3 {
  const count = getLocalSessions().length;
  if (count < 7) return 1;
  if (count < 19) return 2;
  return 3;
}

// ---- Streak ----

// Returns the number of consecutive calendar weeks (Mon–Sun) with at least 1 workout,
// counting back from the most recent week that has a workout.
export function getWorkoutStreak(): number {
  const sessions = getLocalSessions();
  if (sessions.length === 0) return 0;

  // Get Monday of a given date
  function getMonday(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // adjust for Sunday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  const weekSet = new Set(sessions.map(s => getMonday(new Date(s.date))));
  const weeks = Array.from(weekSet).sort().reverse();

  let streak = 0;
  let current = getMonday(new Date());

  for (const week of weeks) {
    if (week === current) {
      streak++;
      // Go back one week
      const d = new Date(current);
      d.setDate(d.getDate() - 7);
      current = d.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  return streak;
}

export function getDaysSinceLastWorkout(): number | null {
  const sessions = getLocalSessions();
  if (sessions.length === 0) return null;
  const last = new Date(sessions[0].date);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

// ---- Weekly stats ----

export type WeeklyStats = {
  workouts: number;
  totalVolume: number; // sum of weight × sets across all exercises
  prs: number;
};

export function getWeeklyStats(): WeeklyStats {
  const sessions = getLocalSessions();
  const now = new Date();
  // Start of this week (Monday)
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = sessions.filter(s => new Date(s.date) >= weekStart);
  const workouts = thisWeek.length;
  const totalVolume = thisWeek.reduce((acc, s) =>
    acc + s.exercises.reduce((a, e) => a + (e.weightUsed * e.setsCompleted), 0), 0);
  const prs = thisWeek.reduce((acc, s) => acc + (s.prs?.length ?? 0), 0);

  return { workouts, totalVolume, prs };
}

// ---- PR detection ----

// Returns exercise IDs where the session's weight beats all-time best BEFORE this session
export function detectPRs(session: WorkoutSession, priorSessions: WorkoutSession[]): string[] {
  const prs: string[] = [];
  for (const ex of session.exercises) {
    if (ex.weightUsed <= 0) continue;
    const best = priorSessions
      .flatMap(s => s.exercises.filter(e => e.id === ex.id && e.weightUsed > 0))
      .reduce((max, e) => Math.max(max, e.weightUsed), 0);
    if (ex.weightUsed > best) prs.push(ex.id);
  }
  return prs;
}

export function getExerciseBest(exerciseId: string): number {
  return getLocalSessions()
    .flatMap(s => s.exercises.filter(e => e.id === exerciseId && e.weightUsed > 0))
    .reduce((max, e) => Math.max(max, e.weightUsed), 0);
}

// ---- Rest timer preference ----

const REST_TIME_KEY = 'gym_rest_time';

export function getRestTime(): number {
  if (typeof window === 'undefined') return 90;
  return Number(localStorage.getItem(REST_TIME_KEY) ?? 90);
}

export function setRestTime(seconds: number): void {
  if (typeof window !== 'undefined') localStorage.setItem(REST_TIME_KEY, String(seconds));
}
