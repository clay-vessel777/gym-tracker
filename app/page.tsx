'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutDay, TimeSlot } from '@/lib/data';
import { getNextDay, getCurrentPhase, getSessions, getInProgress, loadSessionsFromCloud, loadWeightsFromCloud } from '@/lib/storage';

type Mode = 'jlord' | 'jasmine' | 'guest' | null;

const PHASE_INFO = {
  1: { label: 'Phase 1', desc: 'Just show up. Cardio + 1–2 machines. Learn the space.' },
  2: { label: 'Phase 2', desc: 'Full templates. Build consistency.' },
  3: { label: 'Phase 3', desc: 'Progressive weight increases every 1–2 weeks.' },
};

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [nextDay, setNextDay] = useState<WorkoutDay>('A');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [sessionCount, setSessionCount] = useState(0);
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    setNextDay(getNextDay());
    setPhase(getCurrentPhase());
    setSessionCount(getSessions().length);
    setInProgress(!!getInProgress());
    // Sync from cloud in background — refreshes local cache silently
    Promise.all([loadSessionsFromCloud(), loadWeightsFromCloud()]).then(([sessions]) => {
      setSessionCount(sessions.length);
      setPhase(sessions.length < 7 ? 1 : sessions.length < 19 ? 2 : 3);
      setNextDay(getNextDay());
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
  if (mode === null) {
    return (
      <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
        <div>
          <h1 className="text-2xl font-bold">Gym Tracker 💪</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} logged
          </p>
        </div>

        {/* Resume banner */}
        {inProgress && (
          <button
            onClick={() => router.push('/workout?resume=1')}
            className="w-full rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/40 px-4 py-3 text-left active:bg-[#f5a623]/20"
          >
            <p className="text-[#f5a623] font-semibold text-sm">⚡ Workout in progress</p>
            <p className="text-gray-400 text-xs mt-0.5">Tap to resume where you left off →</p>
          </button>
        )}

        {/* Phase banner */}
        <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[#f5a623] font-semibold text-sm">{PHASE_INFO[phase].label}</span>
            <span className="text-gray-500 text-xs">· {sessionCount} sessions logged</span>
          </div>
          <p className="text-gray-400 text-xs mt-1">{PHASE_INFO[phase].desc}</p>
        </div>

        <p className="text-sm text-gray-400 -mb-2">Who's working out?</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('jlord')}
            className="w-full rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">💪 JLord Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Full workout — tracks history & progression</p>
          </button>

          <button
            onClick={() => setMode('jasmine')}
            className="w-full rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">💕 Jasmine Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Day C · simplified layout · couples session</p>
          </button>

          <button
            onClick={() => setMode('guest')}
            className="w-full rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <p className="font-bold text-lg">👤 Guest / Debug Mode</p>
            <p className="text-gray-400 text-sm mt-0.5">Full workout — nothing saved to history</p>
          </button>
        </div>
      </main>
    );
  }

  const profileKey = mode === 'jasmine' ? 'jasmine' : 'jlord';

  // ── Workout setup screen ────────────────────────────────────────────────────
  return (
    <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
      {/* Back + title only */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setMode(null); setSelectedDay(null); setTimeSlot(null); }} className="text-gray-400 text-sm active:text-white">
          ← Back
        </button>
        <h2 className="font-bold text-lg">
          {mode === 'jlord' ? '💪 JLord Mode' : mode === 'jasmine' ? '💕 Jasmine Mode' : '👤 Guest Mode'}
        </h2>
      </div>

      {/* Day selection — JLord and Guest only */}
      {mode !== 'jasmine' && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Workout Day</p>
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', 'C'] as WorkoutDay[]).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl py-4 text-center font-bold text-base transition-all active:scale-95
                  ${activeDay === day
                    ? 'bg-[#f5a623] text-black'
                    : `bg-[#1a1a1a] text-white border ${day === nextDay ? 'border-[#f5a623]/50' : 'border-gray-800'}`
                  }
                `}
              >
                Day {day}
                {day === nextDay && (
                  <div className={`text-xs font-normal mt-0.5 ${activeDay === day ? 'opacity-60' : 'text-[#f5a623] opacity-80'}`}>
                    next up
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jasmine: show fixed Day C label */}
      {mode === 'jasmine' && (
        <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-3">
          <p className="text-gray-400 text-xs">Workout</p>
          <p className="font-bold mt-0.5">Day C — Couples session</p>
        </div>
      )}

      {/* Time slot */}
      <div>
        <p className="text-sm text-gray-400 mb-2">How much time do you have?</p>
        <div className="grid grid-cols-3 gap-2">
          {([30, 45, 60] as TimeSlot[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeSlot(t)}
              className={`rounded-xl py-4 text-center font-bold text-xl transition-all active:scale-95
                ${timeSlot === t
                  ? 'bg-[#f5a623] text-black'
                  : 'bg-[#1a1a1a] border border-gray-800 text-white'
                }
              `}
            >
              {t}
              <div className={`text-xs font-normal mt-0.5 ${timeSlot === t ? 'opacity-60' : 'opacity-50'}`}>min</div>
            </button>
          ))}
        </div>
      </div>

      {/* Start button — immediately after time slots, no push to bottom */}
      <button
        onClick={startWorkout}
        disabled={!timeSlot}
        className={`w-full py-5 rounded-2xl text-xl font-bold transition-all active:scale-95
          ${timeSlot
            ? 'bg-[#f5a623] text-black shadow-lg'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {timeSlot
          ? `Start ${mode === 'jasmine' ? 'Day C' : `Day ${activeDay}`} · ${timeSlot} min`
          : 'Pick a time slot'}
      </button>

      {/* History + Goals — centered at the bottom */}
      <div className="mt-auto flex justify-center gap-6 pb-2">
        <button
          onClick={() => router.push('/history')}
          className="text-sm text-gray-500 active:text-white underline underline-offset-2"
        >
          History
        </button>
        <button
          onClick={() => router.push(`/goals?profile=${mode === 'guest' ? 'guest' : profileKey}`)}
          className="text-sm text-gray-500 active:text-white underline underline-offset-2"
        >
          Goals
        </button>
      </div>
    </main>
  );
}
