'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EXERCISES, EXERCISE_GROUPS, WORKOUT_TEMPLATES, CARDIO_MINUTES, COOLDOWN_MINUTES, WorkoutDay, TimeSlot, ExerciseLog } from '@/lib/data';
import { getLastWeight, saveSession, getWeightHistory, saveInProgress, clearInProgress, getInProgress } from '@/lib/storage';
import RestTimer from '@/components/RestTimer';
import { useTheme } from '@/components/ThemeProvider';
import { v4 as uuidv4 } from 'uuid';

function WorkoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTheme();
  const isResume = params.get('resume') === '1';

  // Resolve params — either from URL or from saved in-progress state
  const savedProgress = isResume ? getInProgress() : null;

  const day = (savedProgress?.day ?? params.get('day') ?? 'A') as WorkoutDay;
  const timeSlot = (savedProgress?.timeSlot ?? Number(params.get('time') ?? 45)) as TimeSlot;
  const jasmineMode = savedProgress?.jasmineMode ?? params.get('jasmine') === '1';
  const guestMode = savedProgress?.guestMode ?? params.get('guest') === '1';

  const exerciseIds = WORKOUT_TEMPLATES[day][timeSlot];
  const cardioMin = CARDIO_MINUTES[timeSlot];
  const cooldownMin = COOLDOWN_MINUTES[timeSlot];

  const [currentIdx, setCurrentIdx] = useState(() => savedProgress?.currentIdx ?? -1);
  const [showTimer, setShowTimer] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const startTimeRef = useRef<number>(savedProgress?.startTime ?? Date.now());

  const [logs, setLogs] = useState<ExerciseLog[]>(() => {
    if (savedProgress?.logs) return savedProgress.logs;
    return exerciseIds.map(id => {
      const ex = EXERCISES[id];
      return {
        id,
        name: ex.name,
        setsCompleted: 0,
        totalSets: 3,
        weightUsed: ex.startingWeight, // will be overridden on mount by last-used weight
        notes: '',
      };
    });
  });

  // Hydrate weights from localStorage after mount (useState initializer runs on server where localStorage is unavailable)
  useEffect(() => {
    if (savedProgress?.logs) return; // resume path already has correct weights
    setLogs(ls => ls.map(log => {
      const lastWeight = getLastWeight(log.id);
      return lastWeight !== null ? { ...log, weightUsed: lastWeight } : log;
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on every meaningful state change (skip guest mode)
  useEffect(() => {
    if (guestMode) return;
    saveInProgress({ day, timeSlot, jasmineMode, guestMode, currentIdx, startTime: startTimeRef.current, logs });
  }, [currentIdx, logs]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateLog(idx: number, patch: Partial<ExerciseLog>) {
    setLogs(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function completeSet(logIdx: number) {
    const log = logs[logIdx];
    if (log.setsCompleted >= log.totalSets) return;
    updateLog(logIdx, { setsCompleted: log.setsCompleted + 1 });
    setShowTimer(true);
  }

  function swapExercise(newId: string) {
    const ex = EXERCISES[newId];
    setLogs(ls => ls.map((l, i) => i !== currentIdx ? l : {
      ...l,
      id: newId,
      name: ex.name,
      setsCompleted: 0,
      weightUsed: getLastWeight(newId) ?? ex.startingWeight,
      notes: '',
    }));
    setShowSwap(false);
  }

  async function finishWorkout() {
    const duration = Math.round((Date.now() - startTimeRef.current) / 60000);
    if (!guestMode) {
      await saveSession({
        id: uuidv4(),
        date: new Date().toISOString(),
        day,
        timeSlot,
        jasmineMode,
        durationMinutes: duration,
        exercises: logs,
      });
    }
    clearInProgress();
    router.push(guestMode ? '/' : '/done');
  }

  const isCardio = currentIdx === -1;
  const isDone = currentIdx === exerciseIds.length;
  const currentLog = !isCardio && !isDone ? logs[currentIdx] : null;
  const currentExercise = currentLog ? EXERCISES[currentLog.id] : null;
  const history = currentLog ? getWeightHistory(currentLog.id) : [];

  return (
    <div className="flex flex-col min-h-dvh w-full max-w-lg mx-auto overflow-x-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => {
            // Don't clear in-progress — let them resume later
            router.push('/');
          }}
          className="text-gray-400 text-sm active:text-white"
        >
          ← Home
        </button>
        <span className="text-sm font-medium text-gray-300">
          Day {day} · {timeSlot} min
          {jasmineMode ? ' 🌹' : ''}
          {guestMode ? ' 🎭' : ''}
        </span>
        <span className="text-xs text-gray-500">
          {isCardio ? '0' : isDone ? exerciseIds.length : currentIdx + 1}/{exerciseIds.length}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">

        {/* CARDIO SCREEN */}
        {isCardio && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🐉</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t.cardioTitle}</h2>
              <p className="text-[var(--accent)] text-4xl font-bold mt-2">{cardioMin} min</p>
              <p className="text-gray-400 text-sm mt-3">
                Rowing machine (preferred) · Bike · Elliptical
              </p>
              <p className="text-gray-500 text-xs mt-2">All are knee-safe ✓</p>
            </div>
            <button
              onClick={() => setCurrentIdx(0)}
              className={`mt-6 w-full max-w-xs py-4 bg-[var(--accent)] text-white font-bold ${t.btnRadius} text-lg active:scale-95 transition-transform`}
            >
              {t.cardioCta}
            </button>
          </div>
        )}

        {/* EXERCISE SCREEN */}
        {currentExercise && currentLog && (
          <>
            {/* Progress bar */}
            <div className="flex gap-1">
              {exerciseIds.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i < currentIdx ? 'bg-[var(--accent)]' : i === currentIdx ? 'bg-gray-600' : 'bg-gray-800'}`}
                />
              ))}
            </div>

            {/* Exercise header */}
            <div>
              <p className="text-[var(--accent)] text-xs uppercase tracking-widest font-medium">
                {currentExercise.muscleGroup}
              </p>
              <div className="flex items-start justify-between gap-2 mt-1">
                <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
                {(EXERCISE_GROUPS[currentLog.id]?.length ?? 0) > 1 && (
                  <button
                    onClick={() => setShowSwap(true)}
                    className="flex-shrink-0 text-xs text-gray-400 border border-gray-700 rounded-lg px-2.5 py-1.5 mt-1 active:bg-gray-800"
                  >
                    swap ⇄
                  </button>
                )}
              </div>
              {!jasmineMode && (
                <p className="text-gray-400 text-sm mt-2 italic">{currentExercise.formCue}</p>
              )}
            </div>

            {/* Weight */}
            <div className="bg-[var(--card-bg)] border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-xs mb-2">Weight (lbs)</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateLog(currentIdx, { weightUsed: Math.max(0, currentLog.weightUsed - 5) })}
                  className="w-12 h-12 rounded-full bg-gray-800 text-2xl font-bold active:bg-gray-700 flex items-center justify-center"
                >−</button>
                <input
                  type="text"
                  value={currentLog.weightUsed || ''}
                  onChange={e => updateLog(currentIdx, { weightUsed: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                  className="flex-1 min-w-0 text-center text-3xl font-bold bg-transparent outline-none"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
            <div className="bg-[var(--card-bg)] border border-gray-800 rounded-xl px-4 py-3">
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
                  const isNext = setNum === currentLog.setsCompleted + 1;
                  return (
                    <button
                      key={setNum}
                      onClick={() => !done && completeSet(currentIdx)}
                      className={`flex-1 rounded-xl font-bold transition-all active:scale-95 py-4
                        ${done ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}
                        ${isNext ? 'ring-2 ring-gray-500' : ''}
                      `}
                    >
                      {done ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xl">✓</span>
                          <span className="text-xs font-normal opacity-70">Set {setNum}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-lg">Set {setNum}</span>
                          <span className={`text-xs font-normal ${isNext ? 'text-gray-300' : 'opacity-40'}`}>
                            {isNext ? 'tap when done' : ''}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            {!jasmineMode && (
              <div className="bg-[var(--card-bg)] border border-gray-800 rounded-xl px-4 py-3">
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
                className={`flex-1 py-4 ${t.btnRadius} bg-[var(--accent)] text-white font-bold text-lg active:scale-95 transition-transform`}
              >
                {currentIdx < exerciseIds.length - 1 ? 'Next Exercise →' : 'All Done →'}
              </button>
            </div>
          </>
        )}

        {/* COOLDOWN / FINISH SCREEN */}
        {isDone && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🧙</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t.cooldownTitle}</h2>
              <p className="text-[var(--accent)] text-4xl font-bold mt-2">{cooldownMin} min</p>
              <p className="text-gray-400 text-sm mt-3">{t.cooldownDesc}</p>
              {guestMode && (
                <p className="text-gray-600 text-xs mt-2">Guest mode — this session won't be saved.</p>
              )}
            </div>
            <button
              onClick={finishWorkout}
              className={`mt-6 w-full max-w-xs py-4 bg-[var(--accent)] text-white font-bold ${t.btnRadius} text-lg active:scale-95 transition-transform`}
            >
              {guestMode ? 'Done → Home' : t.finishCta}
            </button>
          </div>
        )}
      </div>

      {/* Swap exercise bottom sheet */}
      {showSwap && currentLog && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowSwap(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Swap Exercise</p>
            <div className="flex flex-col gap-2">
              {(EXERCISE_GROUPS[currentLog.id] ?? [currentLog.id]).map(altId => {
                const alt = EXERCISES[altId];
                const isCurrent = altId === currentLog.id;
                const lastW = getLastWeight(altId);
                return (
                  <button
                    key={altId}
                    onClick={() => !isCurrent && swapExercise(altId)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${isCurrent ? 'cursor-default' : 'bg-gray-800/60 border border-gray-700 active:bg-gray-700'}`}
                    style={isCurrent ? { backgroundColor: 'var(--accent-10)', border: '1px solid var(--accent-40)' } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm ${isCurrent ? 'text-[var(--accent)]' : 'text-white'}`}>
                        {alt.name} {isCurrent && '✓'}
                      </span>
                      {lastW !== null && (
                        <span className="text-gray-500 text-xs">last: {lastW} lbs</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{alt.muscleGroup}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowSwap(false)} className="w-full mt-4 py-3 text-gray-500 text-sm active:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

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
