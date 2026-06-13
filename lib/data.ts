export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  startingWeight: number;
  formCue: string;
  skip?: boolean;
  skipReason?: string;
  targetSeconds?: number; // for timed exercises
  targetReps?: number;    // default 12
};

export type WorkoutDay = 'A' | 'B' | 'C';
export type TimeSlot = 30 | 45 | 60;

export const EXERCISES: Record<string, Exercise> = {
  // ── Chest compound ──────────────────────────────────────────────────────────
  "chest-press":         { id: "chest-press",         name: "Chest Press Machine",         muscleGroup: "Chest / Triceps",              startingWeight: 50,  formCue: "Sit back fully, push forward — don't shrug your shoulders" },
  "smith-chest-press":   { id: "smith-chest-press",   name: "Smith Machine Chest Press",   muscleGroup: "Chest / Triceps",              startingWeight: 45,  formCue: "Arch slightly, bar to lower chest — elbows at ~45°" },
  "cable-chest-press":   { id: "cable-chest-press",   name: "Cable Chest Press",           muscleGroup: "Chest / Triceps",              startingWeight: 25,  formCue: "Arms at chest height, press forward and together — don't lock elbows" },

  // ── Back / Lat ───────────────────────────────────────────────────────────────
  "lat-pulldown":        { id: "lat-pulldown",        name: "Lat Pulldown",                muscleGroup: "Back / Biceps",                startingWeight: 60,  formCue: "Pull to collarbone, not behind neck — lead with elbows" },
  "assisted-pullup":     { id: "assisted-pullup",     name: "Assisted Pull-up Machine",    muscleGroup: "Back / Biceps",                startingWeight: 50,  formCue: "Full hang at top, pull chest to bar — don't swing" },
  "cable-pulldown":      { id: "cable-pulldown",      name: "Cable Straight-arm Pulldown", muscleGroup: "Back / Biceps",                startingWeight: 25,  formCue: "Straight arms, push bar to thighs — hinge at hips slightly" },

  // ── Back / Row ───────────────────────────────────────────────────────────────
  "cable-row":           { id: "cable-row",           name: "Seated Cable Row",            muscleGroup: "Mid-Back / Biceps",            startingWeight: 50,  formCue: "Sit tall, pull to belly button — don't round your back" },
  "machine-row":         { id: "machine-row",         name: "Machine Row",                 muscleGroup: "Mid-Back / Biceps",            startingWeight: 50,  formCue: "Chest on pad, pull handles to sides — squeeze shoulder blades" },
  "tbar-row":            { id: "tbar-row",            name: "T-Bar Row",                   muscleGroup: "Mid-Back / Biceps",            startingWeight: 35,  formCue: "Hinge at hips, pull to lower chest — keep back flat" },

  // ── Chest isolation ──────────────────────────────────────────────────────────
  "chest-fly":           { id: "chest-fly",           name: "Chest Fly Machine",           muscleGroup: "Chest (isolation)",            startingWeight: 30,  formCue: "Controlled motion — don't let arms fly back past chest" },
  "cable-fly":           { id: "cable-fly",           name: "Cable Fly",                   muscleGroup: "Chest (isolation)",            startingWeight: 15,  formCue: "Slight bend in elbows, bring hands together in front of chest" },
  "pec-deck":            { id: "pec-deck",            name: "Pec Deck",                    muscleGroup: "Chest (isolation)",            startingWeight: 30,  formCue: "Keep forearms on pads, squeeze chest at the center" },

  // ── Biceps ───────────────────────────────────────────────────────────────────
  "bicep-curl":          { id: "bicep-curl",          name: "Bicep Curl Machine",          muscleGroup: "Biceps",                       startingWeight: 25,  formCue: "Full range of motion, slow on the way down" },
  "dumbbell-curl":       { id: "dumbbell-curl",       name: "Dumbbell Curl",               muscleGroup: "Biceps",                       startingWeight: 15,  formCue: "Palms up, don't swing — strict form, slow negative" },
  "cable-curl":          { id: "cable-curl",          name: "Cable Curl",                  muscleGroup: "Biceps",                       startingWeight: 20,  formCue: "Elbows pinned, curl all the way up — constant tension from cable" },

  // ── Triceps ──────────────────────────────────────────────────────────────────
  "tricep-pushdown":     { id: "tricep-pushdown",     name: "Tricep Pushdown (cable)",     muscleGroup: "Triceps",                      startingWeight: 30,  formCue: "Keep elbows pinned to your sides throughout" },
  "tricep-machine":      { id: "tricep-machine",      name: "Tricep Machine",              muscleGroup: "Triceps",                      startingWeight: 30,  formCue: "Keep upper arms still — only forearms move" },
  "rope-pushdown":       { id: "rope-pushdown",       name: "Rope Pushdown",               muscleGroup: "Triceps",                      startingWeight: 25,  formCue: "Spread rope at the bottom, elbows tucked — full extension" },

  // ── Legs compound ────────────────────────────────────────────────────────────
  "leg-press":           { id: "leg-press",           name: "Leg Press",                   muscleGroup: "Quads / Glutes / Hamstrings",  startingWeight: 90,  formCue: "Stop at 90° — don't go deeper, protects the right knee" },
  "smith-squat":         { id: "smith-squat",         name: "Smith Machine Squat",         muscleGroup: "Quads / Glutes / Hamstrings",  startingWeight: 45,  formCue: "Feet slightly forward, stop at 90° — don't let knees cave" },

  // ── Hamstrings ───────────────────────────────────────────────────────────────
  "leg-curl":            { id: "leg-curl",            name: "Leg Curl",                    muscleGroup: "Hamstrings",                   startingWeight: 40,  formCue: "Full range, slow on the return — don't let it snap back" },
  "nordic-curl":         { id: "nordic-curl",         name: "Nordic Curl (bodyweight)",    muscleGroup: "Hamstrings",                   startingWeight: 0,   formCue: "Anchor feet, lower slowly with straight body — very challenging" },

  // ── Glutes / Hips ────────────────────────────────────────────────────────────
  "hip-abductor":        { id: "hip-abductor",        name: "Hip Abductor Machine",        muscleGroup: "Outer Glutes / Hips",          startingWeight: 60,  formCue: "Controlled push out and slow return — sit tall" },
  "cable-kickback-hip":  { id: "cable-kickback-hip",  name: "Cable Hip Kickback",          muscleGroup: "Outer Glutes / Hips",          startingWeight: 15,  formCue: "Hinge slightly, kick leg straight back — squeeze glute at top" },

  // ── Glutes ───────────────────────────────────────────────────────────────────
  "glute-kickback":      { id: "glute-kickback",      name: "Glute Kickback Machine",      muscleGroup: "Glutes",                       startingWeight: 25,  formCue: "Squeeze at the top, slow return" },
  "cable-glute-kick":    { id: "cable-glute-kick",    name: "Cable Glute Kickback",        muscleGroup: "Glutes",                       startingWeight: 15,  formCue: "Keep hips square, kick straight back — don't rotate" },

  // ── Core ─────────────────────────────────────────────────────────────────────
  "ab-crunch":           { id: "ab-crunch",           name: "Ab Crunch Machine",           muscleGroup: "Core",                         startingWeight: 40,  formCue: "Slow and controlled — exhale on the crunch", targetReps: 15 },
  "cable-crunch":        { id: "cable-crunch",        name: "Cable Crunch",                muscleGroup: "Core",                         startingWeight: 30,  formCue: "Kneel, crunch elbows toward knees — don't pull with arms", targetReps: 15 },
  "dead-bug":            { id: "dead-bug",            name: "Dead Bug (bodyweight)",       muscleGroup: "Core",                         startingWeight: 0,   formCue: "Lower back flat to floor — opposite arm and leg, slow and controlled", targetReps: 10 },

  // ── Plank / Core hold ────────────────────────────────────────────────────────
  "plank":               { id: "plank",               name: "Plank",                       muscleGroup: "Core",                         startingWeight: 0,   formCue: "Straight line from head to heels — don't let hips sag", targetSeconds: 30 },
  "bird-dog":            { id: "bird-dog",            name: "Bird Dog (bodyweight)",       muscleGroup: "Core",                         startingWeight: 0,   formCue: "Extend opposite arm and leg — hold 2s, keep hips level", targetReps: 10 },

  // ── Skipped ──────────────────────────────────────────────────────────────────
  "shoulder-press":      { id: "shoulder-press",      name: "Shoulder Press Machine",      muscleGroup: "Shoulders",                    startingWeight: 0,   formCue: "", skip: true, skipReason: "right shoulder — avoid" },
  "leg-extension":       { id: "leg-extension",       name: "Leg Extension Machine",       muscleGroup: "Quads",                        startingWeight: 0,   formCue: "", skip: true, skipReason: "right knee — avoid" },
};

// Maps each exercise to the group of alternatives (including itself)
export const EXERCISE_GROUPS: Record<string, string[]> = {
  // Chest compound
  "chest-press":        ["chest-press", "smith-chest-press", "cable-chest-press"],
  "smith-chest-press":  ["chest-press", "smith-chest-press", "cable-chest-press"],
  "cable-chest-press":  ["chest-press", "smith-chest-press", "cable-chest-press"],
  // Back / Lat
  "lat-pulldown":       ["lat-pulldown", "assisted-pullup", "cable-pulldown"],
  "assisted-pullup":    ["lat-pulldown", "assisted-pullup", "cable-pulldown"],
  "cable-pulldown":     ["lat-pulldown", "assisted-pullup", "cable-pulldown"],
  // Back / Row
  "cable-row":          ["cable-row", "machine-row", "tbar-row"],
  "machine-row":        ["cable-row", "machine-row", "tbar-row"],
  "tbar-row":           ["cable-row", "machine-row", "tbar-row"],
  // Chest isolation
  "chest-fly":          ["chest-fly", "cable-fly", "pec-deck"],
  "cable-fly":          ["chest-fly", "cable-fly", "pec-deck"],
  "pec-deck":           ["chest-fly", "cable-fly", "pec-deck"],
  // Biceps
  "bicep-curl":         ["bicep-curl", "dumbbell-curl", "cable-curl"],
  "dumbbell-curl":      ["bicep-curl", "dumbbell-curl", "cable-curl"],
  "cable-curl":         ["bicep-curl", "dumbbell-curl", "cable-curl"],
  // Triceps
  "tricep-pushdown":    ["tricep-pushdown", "tricep-machine", "rope-pushdown"],
  "tricep-machine":     ["tricep-pushdown", "tricep-machine", "rope-pushdown"],
  "rope-pushdown":      ["tricep-pushdown", "tricep-machine", "rope-pushdown"],
  // Legs compound
  "leg-press":          ["leg-press", "smith-squat"],
  "smith-squat":        ["leg-press", "smith-squat"],
  // Hamstrings
  "leg-curl":           ["leg-curl", "nordic-curl"],
  "nordic-curl":        ["leg-curl", "nordic-curl"],
  // Glutes / Hips
  "hip-abductor":       ["hip-abductor", "cable-kickback-hip"],
  "cable-kickback-hip": ["hip-abductor", "cable-kickback-hip"],
  // Glutes
  "glute-kickback":     ["glute-kickback", "cable-glute-kick"],
  "cable-glute-kick":   ["glute-kickback", "cable-glute-kick"],
  // Core
  "ab-crunch":          ["ab-crunch", "cable-crunch", "dead-bug"],
  "cable-crunch":       ["ab-crunch", "cable-crunch", "dead-bug"],
  "dead-bug":           ["ab-crunch", "cable-crunch", "dead-bug"],
  // Plank
  "plank":              ["plank", "bird-dog"],
  "bird-dog":           ["plank", "bird-dog"],
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
  durationSeconds?: number; // for timed holds (e.g. Plank) — used instead of weight
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
  notes?: string;
  prs?: string[]; // exercise IDs that hit a PR this session
};
