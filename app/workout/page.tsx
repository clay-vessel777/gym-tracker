'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EXERCISES, WORKOUT_TEMPLATES, CARDIO_MINUTES, COOLDOWN_MINUTES, WorkoutDay, TimeSlot, ExerciseLog } from '@/lib/data';
import { getLastWeight, saveSession, getWeightHistory } from '@/lib/storage';
import RestTimer from '@/components/RestTimer';
import { v4 as uuidv4 } from 'uuid';

function WorkoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const day = (params.get('day') || 'A') as WorkoutDay;
  const timeSlot = Number(params.get('time') || 45) as TimeSlot;
  const jasmineMode = params.get('jasmine') === '1';

  const exerciseIds = WORKOUT_TEMPLATES[day][timeSlot];
  const cardioMin = CARDIO_MINUTES[timeSlot];
  const cooldownMin = COOLDOWN_MINUTES[timeSlot];

  // Current exercise index (-1 = cardio, exerciseIds.length = done)
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showTimer, setShowTimer] = useState(false);
  const [startTime] = useState(() => Date.now());

  // Per-exercise state
  const [logs, setLogs] = useState<ExerciseLog[]>(() =>
    exerciseIds.map(id => {
      const ex = EXERCISES[id];
      return {
        id,
        name: ex.name,
        setsCompleted: 0,
        totalSets: 3,
        weightUsed: getLastWeight(id) ?? ex.startingWeight,
        notes: '',
      };
    })
  );

  function updateLog(idx: number, patch: Partial<ExerciseLog>) {
    setLogs(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function completeSet(logIdx: number) {
    const log = logs[logIdx];
    if (log.setsCompleted >= log.totalSets) return;
    updateLog(logIdx, { setsCompleted: log.setsCompleted + 1 });
    setShowTimer(true);
  }

  function finishWorkout() {
    const duration = Math.round((Date.now() - startTime) / 60000);
    saveSession({
      id: uuidv4(),
      date: new Date().toISOString(),
      day,
      timeSlot,
      jasmineMode,
      durationMinutes: duration,
      exercises: logs,
    });
    router.push('/done');
  }

  const isCardio = currentIdx === -1;
  const isDone = currentIdx === exerciseIds.length;
  const currentLog = !isCardio && !isDone ? logs[currentIdx] : null;
  const currentExercise = currentLog ? EXERCISES[currentLog.id] : null;
  const history = currentLog ? getWeightHistory(currentLog.id) : [];

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-400 text-sm active:text-white">
          ← Back
        </button>
        <span className="text-sm font-medium text-gray-300">
          Day {day} · {timeSlot} min{jasmineMode ? ' 💕' : ''}
        </span>
        <span className="text-xs text-gray-500">
          {isCardio ? '0' : isDone ? exerciseIds.length : currentIdx + 1}/{exerciseIds.length}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">

        {/* CARDIO SCREEN */}
        {isCardio && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🚴</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Cardio Warmup</h2>
              <p className="text-[#f5a623] text-4xl font-bold mt-2">{cardioMin} min</p>
              <p className="text-gray-400 text-sm mt-3">
                Rowing machine (preferred) · Bike · Elliptical
              </p>
              <p className="text-gray-500 text-xs mt-2">All are knee-safe ✓</p>
            </div>
            <button
              onClick={() => setCurrentIdx(0)}
              className="mt-6 w-full max-w-xs py-4 bg-[#f5a623] text-black font-bold rounded-2xl text-lg active:scale-95 transition-transform"
            >
              Cardio Done → Exercises
            </button>
          </div>
        )}

        {/* EXERCISE SCREEN */}
        {currentExercise && currentLog && (
          <>
            {/* Progress */}
            <div className="flex gap-1">
              {exerciseIds.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i < currentIdx ? 'bg-[#f5a623]' : i === currentIdx ? 'bg-[#f5a623]/60' : 'bg-gray-800'}`}
                />
              ))}
            </div>

            {/* Exercise header */}
            <div>
              <p className="text-[#f5a623] text-xs uppercase tracking-widest font-medium">
                {currentExercise.muscleGroup}
              </p>
              <h2 className="text-2xl font-bold mt-1">{currentExercise.name}</h2>
              {!jasmineMode && (
                <p className="text-gray-400 text-sm mt-2 italic">"{currentExercise.formCue}"</p>
              )}
            </div>

            {/* Weight */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-xs mb-2">Weight (lbs)</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateLog(currentIdx, { weightUsed: Math.max(0, currentLog.weightUsed - 5) })}
                  className="w-12 h-12 rounded-full bg-gray-800 text-2xl font-bold active:bg-gray-700 flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  value={currentLog.weightUsed || ''}
                  onChange={e => updateLog(currentIdx, { weightUsed: Number(e.target.value) })}
                  className="flex-1 text-center text-3xl font-bold bg-transparent outline-none"
                  inputMode="numeric"
                  placeholder={String(currentExercise.startingWeight)}
                />
                <button
                  onClick={() => updateLog(currentIdx, { weightUsed: currentLog.weightUsed + 5 })}
                  className="w-12 h-12 rounded-full bg-gray-800 text-2xl font-bold active:bg-gray-700 flex items-center justify-center"
                >+</button>
              </div>
              {history.length > 0 && (
                <p className="text-gray-500 text-xs text-center mt-2">
                  Last: {history[history.length - 1]} lbs
                  {history.length > 1 && ` · Best: ${Math.max(...history)} lbs`}
                </p>
              )}
            </div>

            {/* Sets */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-xs">Sets</p>
                <p className="text-gray-500 text-xs">
                  {currentExercise.targetSeconds
                    ? `3 × ${currentExercise.targetSeconds}s`
                    : `3 × ${currentExercise.targetReps ?? 12} reps`}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                {[1, 2, 3].map(setNum => {
                  const done = setNum <= currentLog.setsCompleted;
                  return (
                    <button
                      key={setNum}
                      onClick={() => !done && completeSet(currentIdx)}
                      className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all active:scale-95
                        ${done ? 'bg-[#f5a623] text-black' : 'bg-gray-800 text-gray-400 border border-gray-700'}
                      `}
                    >
                      {done ? '✓' : setNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            {!jasmineMode && (
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3">
                <p className="text-gray-400 text-xs mb-2">Notes (optional)</p>
                <textarea
                  value={currentLog.notes}
                  onChange={e => updateLog(currentIdx, { notes: e.target.value })}
                  placeholder="e.g. felt good, knee bothered me on set 2..."
                  className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none"
                  rows={2}
                />
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex gap-3 mt-auto">
              {currentIdx > 0 && (
                <button
                  onClick={() => setCurrentIdx(i => i - 1)}
                  className="py-4 px-5 rounded-xl border border-gray-700 text-gray-400 font-medium active:bg-gray-800"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => {
                  if (currentIdx < exerciseIds.length - 1) {
                    setCurrentIdx(i => i + 1);
                  } else {
                    setCurrentIdx(exerciseIds.length);
                  }
                }}
                className="flex-1 py-4 rounded-xl bg-[#f5a623] text-black font-bold text-lg active:scale-95 transition-transform"
              >
                {currentIdx < exerciseIds.length - 1 ? 'Next Exercise →' : 'All Done →'}
              </button>
            </div>
          </>
        )}

        {/* COOLDOWN / DONE SCREEN */}
        {isDone && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🧘</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Cooldown & Stretch</h2>
              <p className="text-[#f5a623] text-4xl font-bold mt-2">{cooldownMin} min</p>
              <p className="text-gray-400 text-sm mt-3">Take your time — you earned it.</p>
            </div>
            <button
              onClick={finishWorkout}
              className="mt-6 w-full max-w-xs py-4 bg-[#f5a623] text-black font-bold rounded-2xl text-lg active:scale-95 transition-transform"
            >
              Finish Workout ✓
            </button>
          </div>
        )}
      </div>

      {/* Rest timer overlay */}
      {showTimer && <RestTimer onDismiss={() => setShowTimer(false)} />}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh text-gray-400">Loading…</div>}>
      <WorkoutInner />
    </Suspense>
  );
}
