import { WorkoutSession, WorkoutDay } from './data';

const SESSIONS_KEY = 'gym_sessions';
const WEIGHTS_KEY = 'gym_weights';
const ROTATION_KEY = 'gym_rotation';

// ---- Sessions ----

export function getSessions(): WorkoutSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch { return []; }
}

export function saveSession(session: WorkoutSession): void {
  const sessions = getSessions();
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  // Update last-used weights
  session.exercises.forEach(ex => {
    if (ex.weightUsed > 0) setLastWeight(ex.id, ex.weightUsed);
  });
  // Advance rotation
  setLastDay(session.day);
}

// ---- Weight memory ----

export function getLastWeight(exerciseId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const map = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || '{}');
    return map[exerciseId] ?? null;
  } catch { return null; }
}

export function setLastWeight(exerciseId: string, weight: number): void {
  const map = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || '{}');
  map[exerciseId] = weight;
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(map));
}

export function getWeightHistory(exerciseId: string): number[] {
  const sessions = getSessions();
  return sessions
    .flatMap(s => s.exercises.filter(e => e.id === exerciseId && e.weightUsed > 0))
    .map(e => e.weightUsed)
    .reverse()
    .slice(-5); // last 5 entries
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
  localStorage.setItem(ROTATION_KEY, day);
}

// ---- Phase ----

export function getCurrentPhase(): 1 | 2 | 3 {
  const count = getSessions().length;
  if (count < 7) return 1;
  if (count < 19) return 2;
  return 3;
}
