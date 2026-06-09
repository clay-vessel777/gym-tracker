'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutDay, TimeSlot } from '@/lib/data';
import { getNextDay, getCurrentPhase, getSessions } from '@/lib/storage';

const PHASE_INFO = {
  1: { label: 'Phase 1', desc: 'Just show up. Cardio + 1–2 machines. Learn the space.' },
  2: { label: 'Phase 2', desc: 'Full templates. Build consistency.' },
  3: { label: 'Phase 3', desc: 'Progressive weight increases every 1–2 weeks.' },
};

export default function Home() {
  const router = useRouter();
  const [nextDay, setNextDay] = useState<WorkoutDay>('A');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [jasmineMode, setJasmineMode] = useState(false);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    setNextDay(getNextDay());
    setPhase(getCurrentPhase());
    setSessionCount(getSessions().length);
  }, []);

  const activeDay: WorkoutDay = jasmineMode ? 'C' : (selectedDay ?? nextDay);

  function startWorkout() {
    if (!timeSlot) return;
    const params = new URLSearchParams({
      day: activeDay,
      time: String(timeSlot),
      jasmine: jasmineMode ? '1' : '0',
    });
    router.push(`/workout?${params}`);
  }

  return (
    <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gym Tracker 💪</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} logged
          </p>
        </div>
        <button
          onClick={() => router.push('/history')}
          className="text-sm text-gray-400 border border-gray-700 rounded-lg px-3 py-2 active:bg-gray-800"
        >
          History
        </button>
      </div>

      {/* Phase banner */}
      <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[#f5a623] font-semibold text-sm">{PHASE_INFO[phase].label}</span>
          <span className="text-gray-500 text-xs">· {sessionCount} sessions logged</span>
        </div>
        <p className="text-gray-400 text-xs mt-1">{PHASE_INFO[phase].desc}</p>
      </div>

      {/* Jasmine Mode */}
      <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Jasmine Mode 💕</p>
          <p className="text-gray-400 text-xs mt-0.5">Day C · simplified layout</p>
        </div>
        <button
          onClick={() => setJasmineMode(j => !j)}
          className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${jasmineMode ? 'bg-[#f5a623]' : 'bg-gray-700'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${jasmineMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Day Selection */}
      {!jasmineMode && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Workout Day</p>
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', 'C'] as WorkoutDay[]).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl py-4 text-center font-bold text-xl transition-all active:scale-95
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

      {/* Time Slot */}
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

      {/* Start Button */}
      <div className="mt-auto pt-4">
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
          {timeSlot ? `Start Day ${activeDay} · ${timeSlot} min` : 'Pick a time slot'}
        </button>
      </div>
    </main>
  );
}
