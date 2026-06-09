export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  startingWeight: number;
  formCue: string;
  skip?: boolean;
  skipReason?: string;
  targetSeconds?: number; // for plank
  targetReps?: number;    // default 12
};

export type WorkoutDay = 'A' | 'B' | 'C';
export type TimeSlot = 30 | 45 | 60;

export const EXERCISES: Record<string, Exercise> = {
  "chest-press": { id: "chest-press", name: "Chest Press Machine", muscleGroup: "Chest / Triceps", startingWeight: 50, formCue: "Sit back fully, push forward — don't shrug your shoulders" },
  "lat-pulldown": { id: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back / Biceps", startingWeight: 60, formCue: "Pull to collarbone, not behind neck — lead with elbows" },
  "cable-row": { id: "cable-row", name: "Seated Cable Row", muscleGroup: "Mid-Back / Biceps", startingWeight: 50, formCue: "Sit tall, pull to belly button — don't round your back" },
  "chest-fly": { id: "chest-fly", name: "Chest Fly Machine", muscleGroup: "Chest (isolation)", startingWeight: 30, formCue: "Controlled motion — don't let arms fly back past chest" },
  "bicep-curl": { id: "bicep-curl", name: "Bicep Curl Machine", muscleGroup: "Biceps", startingWeight: 25, formCue: "Full range of motion, slow on the way down" },
  "tricep-pushdown": { id: "tricep-pushdown", name: "Tricep Pushdown (cable)", muscleGroup: "Triceps", startingWeight: 30, formCue: "Keep elbows pinned to your sides throughout" },
  "shoulder-press": { id: "shoulder-press", name: "Shoulder Press Machine", muscleGroup: "Shoulders", startingWeight: 0, formCue: "", skip: true, skipReason: "right shoulder — avoid" },
  "leg-press": { id: "leg-press", name: "Leg Press", muscleGroup: "Quads / Glutes / Hamstrings", startingWeight: 90, formCue: "Stop at 90° — don't go deeper, protects the right knee" },
  "leg-curl": { id: "leg-curl", name: "Leg Curl", muscleGroup: "Hamstrings", startingWeight: 40, formCue: "Full range, slow on the return — don't let it snap back" },
  "hip-abductor": { id: "hip-abductor", name: "Hip Abductor Machine", muscleGroup: "Outer Glutes / Hips", startingWeight: 60, formCue: "Controlled push out and slow return — sit tall" },
  "glute-kickback": { id: "glute-kickback", name: "Glute Kickback Machine", muscleGroup: "Glutes", startingWeight: 25, formCue: "Squeeze at the top, slow return" },
  "leg-extension": { id: "leg-extension", name: "Leg Extension Machine", muscleGroup: "Quads", startingWeight: 0, formCue: "", skip: true, skipReason: "right knee — avoid" },
  "ab-crunch": { id: "ab-crunch", name: "Ab Crunch Machine", muscleGroup: "Core", startingWeight: 40, formCue: "Slow and controlled — exhale on the crunch", targetReps: 15 },
  "plank": { id: "plank", name: "Plank", muscleGroup: "Core", startingWeight: 0, formCue: "Straight line from head to heels — don't let hips sag", targetSeconds: 30 },
};

export const WORKOUT_TEMPLATES: Record<WorkoutDay, Record<TimeSlot, string[]>> = {
  A: {
    30: ["chest-press", "lat-pulldown", "leg-press"],
    45: ["chest-press", "lat-pulldown", "leg-press", "ab-crunch"],
    60: ["chest-press", "lat-pulldown", "leg-press", "ab-crunch", "bicep-curl", "leg-curl"],
  },
  B: {
    30: ["cable-row", "chest-fly", "leg-curl"],
    45: ["cable-row", "chest-fly", "leg-curl", "plank", "tricep-pushdown"],
    60: ["cable-row", "chest-fly", "leg-curl", "plank", "tricep-pushdown", "hip-abductor", "glute-kickback"],
  },
  C: {
    30: ["chest-press", "lat-pulldown"],
    45: ["chest-press", "lat-pulldown", "leg-press", "hip-abductor"],
    60: ["chest-press", "lat-pulldown", "leg-press", "hip-abductor", "cable-row", "leg-curl"],
  },
};

export const CARDIO_MINUTES: Record<TimeSlot, number> = { 30: 8, 45: 10, 60: 12 };
export const COOLDOWN_MINUTES: Record<TimeSlot, number> = { 30: 5, 45: 5, 60: 8 };

export type ExerciseLog = {
  id: string;
  name: string;
  setsCompleted: number;
  totalSets: number;
  weightUsed: number;
  notes: string;
};

export type WorkoutSession = {
  id: string;
  date: string;
  day: WorkoutDay;
  timeSlot: TimeSlot;
  jasmineMode: boolean;
  durationMinutes: number;
  exercises: ExerciseLog[];
};
