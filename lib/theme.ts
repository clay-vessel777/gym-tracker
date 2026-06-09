export type Theme = 'normal' | 'dungeon';
export const THEME_KEY = 'gym_theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'normal';
  return (localStorage.getItem(THEME_KEY) as Theme) ?? 'normal';
}

export function setStoredTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, t);
}

export type ThemeText = {
  phases: Record<1 | 2 | 3, { label: string; desc: string }>;
  whoWorkingOut: string;
  workoutDay: string;
  nextUp: string;
  timeQuestion: string;
  cardioTitle: string;
  cardioCta: string;
  cooldownTitle: string;
  cooldownDesc: string;
  finishCta: string;
  historyTitle: string;
  historyEmpty: string;
  historyEmptySub: string;
  doneTitle: string;
  weeklyReminder: string;
  achievedLabel: string;
  btnRadius: string;
  jlordModeDesc: string;
  guestModeName: string;
  guestModeDesc: string;
  logWorkoutLabel: string;
  logWorkoutDesc: string;
  goalsLabel: string;
  goalsDesc: string;
  historyDesc: string;
  phaseBannerExtra: string;
  // emojis
  titleEmoji: string;
  jlordEmoji: string;
  jasmineEmoji: string;
  guestEmoji: string;
  logWorkoutEmoji: string;
  historyEmoji: string;
  cardioEmoji: string;
  cooldownEmoji: string;
  doneEmoji: string;
  inProgressEmoji: string;
};

export const THEME_TEXT: Record<Theme, ThemeText> = {
  normal: {
    phases: {
      1: { label: 'Phase 1', desc: 'Just show up. Cardio + 1–2 machines. Learn the space.' },
      2: { label: 'Phase 2', desc: 'Full templates. Build consistency.' },
      3: { label: 'Phase 3', desc: 'Progressive weight increases every 1–2 weeks.' },
    },
    whoWorkingOut: "Who's working out?",
    workoutDay: 'Workout Day',
    nextUp: 'next up',
    timeQuestion: 'How much time do you have?',
    cardioTitle: 'Cardio Warmup',
    cardioCta: 'Cardio Done → Exercises',
    cooldownTitle: 'Cooldown & Stretch',
    cooldownDesc: 'Take your time — you earned it.',
    finishCta: 'Finish Workout ✓',
    historyTitle: 'Workout History',
    historyEmpty: 'No workouts logged yet.',
    historyEmptySub: 'Your history will appear here after your first session.',
    doneTitle: 'Workout Done!',
    weeklyReminder: '🎯 Time for your weekly check-in!',
    achievedLabel: 'Achieved 🎉',
    btnRadius: 'rounded-2xl',
    phaseBannerExtra: '',
    jlordModeDesc: 'Full workout — tracks history & progression',
    guestModeName: 'Guest / Debug Mode',
    guestModeDesc: 'Full workout — nothing saved to history',
    logWorkoutLabel: 'Log Workout',
    logWorkoutDesc: 'Pick a day and time slot',
    goalsLabel: 'Goals',
    goalsDesc: 'Track measurements & set targets',
    historyDesc: 'View past workouts',
    titleEmoji: '💪',
    jlordEmoji: '💪',
    jasmineEmoji: '💕',
    guestEmoji: '👤',
    logWorkoutEmoji: '🏋️',
    historyEmoji: '📋',
    cardioEmoji: '🚴',
    cooldownEmoji: '🧘',
    doneEmoji: '🎉',
    inProgressEmoji: '⚡',
  },
  dungeon: {
    phases: {
      1: { label: '⚔️ Apprentice', desc: 'Roll your stats. Learn the battlefield. Gain XP.' },
      2: { label: '🛡️ Warrior', desc: 'Full training. Build your power and consistency.' },
      3: { label: '👑 Champion', desc: 'Progressive overload. Push harder. Become legendary.' },
    },
    whoWorkingOut: 'Choose your adventurer',
    workoutDay: 'Choose Your Trial',
    nextUp: 'next quest',
    timeQuestion: 'Time available for battle',
    cardioTitle: 'Prepare for Battle',
    cardioCta: 'Enter the Dungeon →',
    cooldownTitle: 'Rest at the Tavern',
    cooldownDesc: 'You fought well, adventurer.',
    finishCta: 'Complete the Quest ✓',
    historyTitle: 'Quest Log',
    historyEmpty: 'No quests recorded yet.',
    historyEmptySub: 'Your adventures will appear here after your first session.',
    doneTitle: 'Quest Complete!',
    weeklyReminder: '🎲 Time for your weekly check-in!',
    achievedLabel: 'Achieved 🏆',
    btnRadius: 'rounded-lg',
    phaseBannerExtra: 'border-l-[3px] border-l-[#dc2626]',
    jlordModeDesc: 'Gain XP. Suffer consequences.',
    guestModeName: 'One Shot Mode',
    guestModeDesc: 'Test a new character build.',
    logWorkoutLabel: 'Begin Battle',
    logWorkoutDesc: 'Roll for initiative',
    goalsLabel: 'Character Development',
    goalsDesc: 'Plan your build',
    historyDesc: 'The songs they\'ll sing about you',
    titleEmoji: '⚔️',
    jlordEmoji: '⚔️',
    jasmineEmoji: '🌹',
    guestEmoji: '🎭',
    logWorkoutEmoji: '🗡️',
    historyEmoji: '📜',
    cardioEmoji: '🐉',
    cooldownEmoji: '🧙',
    doneEmoji: '🏆',
    inProgressEmoji: '🔥',
  },
};
