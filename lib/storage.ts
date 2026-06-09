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

  // 2. Sync to Supabase in background
  try {
    await supabase.from('workout_sessions').upsert({
      id: session.id,
      date: session.date,
      day: session.day,
      time_slot: session.timeSlot,
      jasmine_mode: session.jasmineMode,
      duration_minutes: session.durationMinutes,
      exercises: session.exercises,
    });

    // Sync weights too
    const weightUpserts = session.exercises
      .filter(ex => ex.weightUsed > 0)
      .map(ex => ({ exercise_id: ex.id, weight: ex.weightUsed }));
    if (weightUpserts.length > 0) {
      await supabase.from('exercise_weights').upsert(weightUpserts);
    }
  } catch (e) {
    console.warn('Supabase sync failed (offline?), data saved locally', e);
  }
}

// Load sessions from Supabase and refresh local cache
export async function loadSessionsFromCloud(): Promise<WorkoutSession[]> {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error || !data) throw error;

    const sessions: WorkoutSession[] = data.map(row => ({
      id: row.id,
      date: row.date,
      day: row.day,
      timeSlot: row.time_slot,
      jasmineMode: row.jasmine_mode,
      durationMinutes: row.duration_minutes,
      exercises: row.exercises,
    }));

    // Refresh local cache
    setLocalSessions(sessions);

    // Refresh weight cache from latest sessions
    sessions.forEach(s => s.exercises.forEach(ex => {
      if (ex.weightUsed > 0) {
        const current = getLocalWeight(ex.id);
        if (current === null) setLocalWeight(ex.id, ex.weightUsed);
      }
    }));

    return sessions;
  } catch (e) {
    console.warn('Could not load from Supabase, using local cache', e);
    return getLocalSessions();
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
