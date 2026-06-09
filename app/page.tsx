'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutDay, TimeSlot } from '@/lib/data';
import { getNextDay, getCurrentPhase, getSessions, getInProgress, loadSessionsFromCloud, loadWeightsFromCloud, getWorkoutStreak, getDaysSinceLastWorkout, getWeeklyStats, WeeklyStats } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';

type Mode = 'jlord' | 'jasmine' | 'guest' | null;
type Screen = 'mode' | 'menu' | 'setup';

export default function Home() {
  const router = useRouter();
  const { theme, t, toggle } = useTheme();
  const [mode, setMode] = useState<Mode>(null);
  const [screen, setScreen] = useState<Screen>('mode');
  const [nextDay, setNextDay] = useState<WorkoutDay>('A');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [sessionCount, setSessionCount] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [streak, setStreak] = useState(0);
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ workouts: 0, totalVolume: 0, prs: 0 });

  useEffect(() => {
    setNextDay(getNextDay());
    setPhase(getCurrentPhase());
    setSessionCount(getSessions().length);
    setInProgress(!!getInProgress());
    setStreak(getWorkoutStreak());
    setDaysSince(getDaysSinceLastWorkout());
    setWeeklyStats(getWeeklyStats());
    Promise.all([loadSessionsFromCloud(), loadWeightsFromCloud()]).then(([sessions]) => {
      setSessionCount(sessions.length);
      setPhase(sessions.length < 7 ? 1 : sessions.length < 19 ? 2 : 3);
      setNextDay(getNextDay());
      setStreak(getWorkoutStreak());
      setDaysSince(getDaysSinceLastWorkout());
      setWeeklyStats(getWeeklyStats());
    });
  }, []);

  const activeDay: WorkoutDay = selectedDay ?? nextDay;

  function startWorkout() {
    if (!timeSlot || !mode) return;
    const params = new URLSearchParams({
      day: mode === 'jasmine' ? 'C' : activeDay,
      time: String(timeSlot),
      jasmine: mode === 'jasmine' ? '1' : '0',
      guest: mode === 'guest' ? '1' : '0',
    });
    router.push(`/workout?${params}`);
  }

  // ── Mode picker screen ──────────────────────────────────────────────────────
  if (screen === 'mode') {
    return (
      <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
        <div>
          <h1 className="text-2xl font-bold">JLord's Gym App {t.titleEmoji}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} logged
          </p>
        </div>

        {/* Days-since nudge — only show if 4+ days and no workout in progress */}
        {!inProgress && daysSince !== null && daysSince >= 4 && (
          <div className="w-full rounded-xl border border-gray-700 px-4 py-3 bg-gray-900/60">
            <p className="text-gray-300 text-sm font-medium">
              {daysSince === 4 ? '⏰' : daysSince >= 7 ? '😬' : '💤'} It's been <span className="text-white font-bold">{daysSince} days</span> since your last workout.
            </p>
            <p className="text-gray-500 text-xs mt-0.5">Time to get back in the dungeon.</p>
          </div>
        )}

        {/* Resume banner */}
        {inProgress && (
          <button
            onClick={() => router.push('/workout?resume=1')}
            className="w-full rounded-xl border px-4 py-3 text-left"
            style={{ backgroundColor: 'var(--accent-10)', borderColor: 'var(--accent-40)' }}
          >
            <p className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{t.inProgressEmoji} Workout in progress</p>
            <p className="text-gray-400 text-xs mt-0.5">Tap to resume where you left off →</p>
          </button>
        )}

        {/* Phase banner */}
        <div className={`rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-3 ${t.phaseBannerExtra}`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{t.phases[phase].label}</span>
            <span className="text-gray-500 text-xs">· {sessionCount} sessions logged</span>
          </div>
          <p className="text-gray-400 text-xs mt-1">{t.phases[phase].desc}</p>
        </div>

        {/* Weekly summary + streak */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 px-3 py-3 text-center">
            <p className="text-2xl font-bold">{weeklyStats.workouts}</p>
            <p className="text-gray-500 text-xs mt-0.5">this week</p>
          </div>
          <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 px-3 py-3 text-center">
            <p className="text-2xl font-bold" style={{ color: streak > 0 ? 'var(--accent)' : undefined }}>
              {streak}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">wk streak</p>
          </div>
          <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{weeklyStats.prs}</p>
            <p className="text-gray-500 text-xs mt-0.5">PRs this wk</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 -mb-2">{t.whoWorkingOut}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setMode('jlord'); setScreen('menu'); }}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">{t.jlordEmoji} JLord Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Full workout — tracks history & progression</p>
          </button>

          <button
            onClick={() => { setMode('jasmine'); setScreen('setup'); }}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">{t.jasmineEmoji} Jasmine Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Day C · simplified layout · couples session</p>
          </button>

          <button
            onClick={() => { setMode('guest'); setScreen('menu'); }}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">{t.guestEmoji} Guest / Debug Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Full workout — nothing saved to history</p>
          </button>
        </div>

        {/* Theme toggle */}
        <div className="mt-auto flex justify-center pb-2">
          <button
            onClick={toggle}
            className="text-xs text-gray-600 active:text-gray-400 underline underline-offset-2"
          >
            {theme === 'dungeon' ? 'Switch to Normal Mode' : '⚔️ Switch to Dungeon Mode'}
          </button>
        </div>
      </main>
    );
  }

  const profileKey = mode === 'jasmine' ? 'jasmine' : 'jlord';

  // ── Mode menu screen ─────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode(null); setScreen('mode'); }} className="text-gray-400 text-sm active:text-white">
            ← Back
          </button>
          <h2 className="font-bold text-lg">
            {mode === 'jlord' ? `${t.jlordEmoji} JLord Mode` : `${t.guestEmoji} Guest Mode`}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setScreen('setup')}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-5 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">{t.logWorkoutEmoji} Log Workout</p>
            <p className="text-gray-400 text-sm mt-0.5">Pick a day and time slot</p>
          </button>

          <button
            onClick={() => router.push(`/goals?profile=${mode === 'guest' ? 'guest' : profileKey}`)}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-5 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">🎯 Goals</p>
            <p className="text-gray-400 text-sm mt-0.5">Track measurements & set targets</p>
          </button>

          <button
            onClick={() => router.push('/history')}
            className="w-full rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-5 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">{t.historyEmoji} History</p>
            <p className="text-gray-400 text-sm mt-0.5">View past workouts</p>
          </button>
        </div>
      </main>
    );
  }

  // ── Workout setup screen ────────────────────────────────────────────────────
  return (
    <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setSelectedDay(null);
            setTimeSlot(null);
            setScreen(mode === 'jasmine' ? 'mode' : 'menu');
          }}
          className="text-gray-400 text-sm active:text-white"
        >
          ← Back
        </button>
        <h2 className="font-bold text-lg">
          {mode === 'jlord' ? `${t.jlordEmoji} JLord Mode` : mode === 'jasmine' ? `${t.jasmineEmoji} Jasmine Mode` : `${t.guestEmoji} Guest Mode`}
        </h2>
      </div>

      {/* Day selection — JLord and Guest only */}
      {mode !== 'jasmine' && (
        <div>
          <p className="text-sm text-gray-400 mb-2">{t.workoutDay}</p>
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', 'C'] as WorkoutDay[]).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="rounded-xl py-4 text-center font-bold text-base transition-all active:scale-95"
                style={activeDay === day
                  ? { backgroundColor: 'var(--accent)', color: 'white' }
                  : { backgroundColor: 'var(--card-bg)', color: 'white', border: `1px solid ${day === nextDay ? 'var(--accent-50)' : '#374151'}` }
                }
              >
                Day {day}
                {day === nextDay && (
                  <div className="text-xs font-normal mt-0.5" style={activeDay === day
                    ? { opacity: 0.6 }
                    : { color: 'var(--accent)', opacity: 0.8 }
                  }>
                    {t.nextUp}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jasmine: show fixed Day C label */}
      {mode === 'jasmine' && (
        <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-3">
          <p className="text-gray-400 text-xs">Workout</p>
          <p className="font-bold mt-0.5">Day C — Couples session</p>
        </div>
      )}

      {/* Time slot */}
      <div>
        <p className="text-sm text-gray-400 mb-2">{t.timeQuestion}</p>
        <div className="grid grid-cols-3 gap-2">
          {([30, 45, 60] as TimeSlot[]).map(slot => (
            <button
              key={slot}
              onClick={() => setTimeSlot(slot)}
              className="rounded-xl py-4 text-center font-bold text-xl transition-all active:scale-95"
              style={timeSlot === slot
                ? { backgroundColor: 'var(--accent)', color: 'white' }
                : { backgroundColor: 'var(--card-bg)', color: 'white', border: '1px solid #374151' }
              }
            >
              {slot}
              <div className="text-xs font-normal mt-0.5" style={{ opacity: timeSlot === slot ? 0.6 : 0.5 }}>min</div>
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startWorkout}
        disabled={!timeSlot}
        className={`w-full py-5 ${t.btnRadius} text-xl font-bold transition-all active:scale-95`}
        style={timeSlot
          ? { backgroundColor: 'var(--accent)', color: 'white' }
          : { backgroundColor: '#1f2937', color: '#6b7280', cursor: 'not-allowed' }
        }
      >
        {timeSlot
          ? `Start ${mode === 'jasmine' ? 'Day C' : `Day ${activeDay}`} · ${timeSlot} min`
          : 'Pick a time slot'}
      </button>
    </main>
  );
}
