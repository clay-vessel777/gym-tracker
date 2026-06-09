'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoalEntry, GoalTarget, GoalMeasurementType, MEASUREMENT_LABELS, MEASUREMENT_UNITS,
  loadGoalEntries, saveGoalEntries, getLatestValues, daysSinceLastEntry,
  loadGoalTargets, saveGoalTarget, markGoalAchieved,
} from '@/lib/storage';

const ALL_METRICS: GoalMeasurementType[] = [
  'weight', 'chest', 'waist', 'hips', 'bicep_left', 'bicep_right',
  'thigh', 'neck', 'shoulders', 'calf',
];

function GoalCard({
  goal, latest, onAchieved, isGuest,
}: {
  goal: GoalTarget;
  latest: Partial<Record<GoalMeasurementType, GoalEntry>>;
  onAchieved: (id: string) => void;
  isGuest: boolean;
}) {
  const unit = MEASUREMENT_UNITS[goal.measurementType];
  const currentEntry = latest[goal.measurementType];
  const current = currentEntry?.value ?? goal.startValue;
  const start = goal.startValue;
  const target = goal.targetValue;

  // Progress: how far from start to target (handles both gain and loss)
  let pct = 0;
  if (start !== null && current !== null && start !== target) {
    pct = Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  }

  const today = new Date().toISOString().split('T')[0];
  const daysLeft = Math.ceil((new Date(goal.targetDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
  const isPast = daysLeft < 0;
  const isClose = !isPast && daysLeft <= 14;

  return (
    <div className={`rounded-xl bg-[#1a1a1a] border overflow-hidden ${goal.achieved ? 'border-green-700/50' : isClose ? 'border-[#f5a623]/40' : 'border-gray-800'}`}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{MEASUREMENT_LABELS[goal.measurementType]}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Target: <span className="text-white font-medium">{target} {unit}</span>
              {' · '}
              {goal.achieved
                ? <span className="text-green-400">Achieved ✓</span>
                : isPast
                  ? <span className="text-red-400">Overdue by {Math.abs(daysLeft)}d</span>
                  : <span className={isClose ? 'text-[#f5a623]' : 'text-gray-400'}>{daysLeft} days left</span>
              }
            </p>
          </div>
          {current !== null && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold">{current}</p>
              <p className="text-gray-500 text-xs">{unit} now</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {start !== null && current !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Start: {start} {unit}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${goal.achieved ? 'bg-green-500' : 'bg-[#f5a623]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {goal.note && <p className="text-gray-600 text-xs mt-2 italic">{goal.note}</p>}

        {/* Achieve button */}
        {!goal.achieved && !isGuest && (
          <button
            onClick={() => onAchieved(goal.id)}
            className="mt-3 text-xs text-gray-500 border border-gray-700 rounded-lg px-3 py-1.5 active:bg-gray-800"
          >
            Mark as Achieved ✓
          </button>
        )}
      </div>
    </div>
  );
}

function GoalsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = params.get('profile') ?? 'jlord';
  const isGuest = profile === 'guest';
  const profileLabel = isGuest ? '🎭 Guest' : profile === 'jasmine' ? '🌹 Jasmine' : '⚔️ JLord';

  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [latest, setLatest] = useState<Partial<Record<GoalMeasurementType, GoalEntry>>>({});
  const [goalTargets, setGoalTargets] = useState<GoalTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLog, setShowLog] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Log form
  const [logValues, setLogValues] = useState<Partial<Record<GoalMeasurementType, string>>>({});
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Create goal form
  const [newMetric, setNewMetric] = useState<GoalMeasurementType>('weight');
  const [newStartValue, setNewStartValue] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    Promise.all([loadGoalEntries(profile), loadGoalTargets(profile)]).then(([e, g]) => {
      setEntries(e);
      setLatest(getLatestValues(e));
      setGoalTargets(g);
      setLoading(false);
    });
  }, [profile, isGuest]);

  // Auto-fill start value from latest logged when metric changes
  useEffect(() => {
    const latestVal = latest[newMetric]?.value;
    if (latestVal !== undefined) setNewStartValue(String(latestVal));
    else setNewStartValue('');
  }, [newMetric, latest]);

  const daysSince = daysSinceLastEntry(entries);
  const needsUpdate = daysSince !== null && daysSince >= 7;

  async function handleSaveLog() {
    const toSave = ALL_METRICS
      .filter(m => logValues[m] && logValues[m] !== '')
      .map(m => ({ profile, measurementType: m, value: parseFloat(logValues[m]!), date: logDate, note: logNote || undefined }));
    if (toSave.length === 0) return;
    setSaving(true);
    if (!isGuest) {
      await saveGoalEntries(toSave, profile);
      const updated = await loadGoalEntries(profile);
      setEntries(updated);
      setLatest(getLatestValues(updated));
    } else {
      const fakeEntries: GoalEntry[] = toSave.map(e => ({
        id: `guest-${e.measurementType}-${Date.now()}`,
        profile: 'guest', measurementType: e.measurementType, value: e.value, date: e.date, note: e.note,
      }));
      const merged = [...fakeEntries, ...entries];
      setEntries(merged);
      setLatest(getLatestValues(merged));
    }
    setLogValues({}); setLogNote(''); setShowLog(false); setSaving(false);
  }

  async function handleCreateGoal() {
    if (!newTargetValue || !newTargetDate) return;
    setSaving(true);
    const goal = {
      profile,
      measurementType: newMetric,
      startValue: newStartValue ? parseFloat(newStartValue) : null,
      targetValue: parseFloat(newTargetValue),
      startDate: new Date().toISOString().split('T')[0],
      targetDate: newTargetDate,
      note: newNote || undefined,
    };
    if (!isGuest) {
      await saveGoalTarget(goal);
      const updated = await loadGoalTargets(profile);
      setGoalTargets(updated);
    } else {
      const fakeGoal: GoalTarget = { ...goal, id: `guest-goal-${Date.now()}`, achieved: false };
      setGoalTargets(g => [...g, fakeGoal]);
    }
    setNewTargetValue(''); setNewTargetDate(''); setNewNote('');
    setShowCreate(false); setSaving(false);
  }

  async function handleAchieved(id: string) {
    await markGoalAchieved(id);
    setGoalTargets(g => g.map(t => t.id === id ? { ...t, achieved: true } : t));
  }

  const activeGoals = goalTargets.filter(g => !g.achieved);
  const achievedGoals = goalTargets.filter(g => g.achieved);

  const byDate: Record<string, GoalEntry[]> = {};
  entries.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <main className="flex flex-col min-h-dvh w-full max-w-lg mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-400 text-sm active:text-white">← Back</button>
        <span className="text-sm font-medium text-gray-300">Goals · {profileLabel}</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">

        {/* Guest notice */}
        {isGuest && (
          <div className="rounded-xl bg-gray-800/50 border border-gray-700 px-4 py-3">
            <p className="text-gray-400 text-sm font-medium">🎭 Guest / Debug Mode</p>
            <p className="text-gray-500 text-xs mt-0.5">Goals and entries are visible this session only — nothing is saved.</p>
          </div>
        )}

        {/* Weekly reminder */}
        {needsUpdate && (
          <button onClick={() => setShowLog(true)} className="w-full rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/50 px-4 py-3 text-left active:bg-[#f5a623]/20">
            <p className="text-[#f5a623] font-semibold text-sm">🎲 Time for your weekly check-in!</p>
            <p className="text-gray-400 text-xs mt-0.5">Last logged {daysSince} days ago — tap to update →</p>
          </button>
        )}

        {/* Active goals */}
        {!loading && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Active Goals</p>
            {activeGoals.length === 0 ? (
              <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-6 text-center">
                <p className="text-gray-500 text-sm">No active goals.</p>
                <p className="text-gray-600 text-xs mt-1">Create one below to start tracking your progress.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeGoals.map(g => (
                  <GoalCard key={g.id} goal={g} latest={latest} onAchieved={handleAchieved} isGuest={isGuest} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-4 rounded-2xl bg-[#f5a623] text-black font-bold text-lg active:scale-95 transition-transform"
        >
          + Create New Goal
        </button>
        <button
          onClick={() => setShowLog(true)}
          className="w-full py-4 rounded-2xl bg-[#1a1a1a] border border-gray-700 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          Log Today's Numbers
        </button>

        {/* Achieved goals (collapsed) */}
        {achievedGoals.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Achieved 🏆</p>
            <div className="flex flex-col gap-2">
              {achievedGoals.map(g => (
                <div key={g.id} className="rounded-xl bg-[#1a1a1a] border border-green-800/40 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{MEASUREMENT_LABELS[g.measurementType]}</p>
                    <p className="text-xs text-gray-500">{g.targetValue} {MEASUREMENT_UNITS[g.measurementType]}</p>
                  </div>
                  <span className="text-green-400 text-sm">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current snapshot */}
        {Object.keys(latest).length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Current Measurements</p>
            <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 divide-y divide-gray-800">
              {ALL_METRICS.filter(m => latest[m]).map(m => (
                <div key={m} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-300">{MEASUREMENT_LABELS[m]}</span>
                  <span className="text-sm font-bold">{latest[m]!.value} <span className="text-gray-500 font-normal text-xs">{MEASUREMENT_UNITS[m]}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log history */}
        {sortedDates.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Log History</p>
            <div className="flex flex-col gap-3">
              {sortedDates.map(date => (
                <div key={date} className="rounded-xl bg-[#1a1a1a] border border-gray-800 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-xs text-gray-400">
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-800/60">
                    {byDate[date].map(e => (
                      <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-300">{MEASUREMENT_LABELS[e.measurementType]}</span>
                        <span className="text-sm font-medium">{e.value} <span className="text-gray-500 text-xs font-normal">{MEASUREMENT_UNITS[e.measurementType]}</span></span>
                      </div>
                    ))}
                    {byDate[date][0]?.note && <div className="px-4 py-2"><p className="text-xs text-gray-500 italic">{byDate[date][0].note}</p></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Goal sheet ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a1a1a] rounded-t-2xl overflow-y-auto max-h-[85dvh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1a1a1a] px-4 pt-4 pb-3 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <p className="font-bold text-base">Create New Goal</p>
              <p className="text-gray-500 text-xs mt-0.5">Set a target and a deadline.</p>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4">

              {/* Metric picker */}
              <div>
                <p className="text-gray-400 text-xs mb-2">What are you tracking?</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_METRICS.map(m => (
                    <button
                      key={m}
                      onClick={() => setNewMetric(m)}
                      className={`py-2.5 px-3 rounded-xl text-sm text-left transition-all
                        ${newMetric === m ? 'bg-[#f5a623] text-black font-semibold' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}
                    >
                      {MEASUREMENT_LABELS[m]}
                      <span className={`text-xs ml-1 ${newMetric === m ? 'opacity-60' : 'text-gray-500'}`}>{MEASUREMENT_UNITS[m]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start value */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-gray-400 text-xs mb-1.5">Starting value <span className="text-gray-600">(optional)</span></p>
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                    <input
                      type="text" inputMode="decimal"
                      value={newStartValue}
                      onChange={e => setNewStartValue(e.target.value)}
                      placeholder="e.g. 185"
                      className="flex-1 bg-transparent text-white text-sm outline-none"
                    />
                    <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[newMetric]}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs mb-1.5">Target value</p>
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 focus-within:border-[#f5a623]">
                    <input
                      type="text" inputMode="decimal"
                      value={newTargetValue}
                      onChange={e => setNewTargetValue(e.target.value)}
                      placeholder="e.g. 170"
                      className="flex-1 bg-transparent text-white text-sm outline-none"
                    />
                    <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[newMetric]}</span>
                  </div>
                </div>
              </div>

              {/* Target date */}
              <div>
                <p className="text-gray-400 text-xs mb-1.5">Target date</p>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={e => setNewTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#f5a623]"
                />
              </div>

              {/* Note */}
              <div>
                <p className="text-gray-400 text-xs mb-1.5">Note <span className="text-gray-600">(optional)</span></p>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. for the beach trip in August…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none resize-none focus:border-[#f5a623]"
                  rows={2}
                />
              </div>

              <button
                onClick={handleCreateGoal}
                disabled={saving || !newTargetValue || !newTargetDate}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mb-4
                  ${saving || !newTargetValue || !newTargetDate ? 'bg-gray-800 text-gray-500' : 'bg-[#f5a623] text-black'}`}
              >
                {saving ? 'Saving…' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log numbers sheet ── */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowLog(false)}>
          <div className="bg-[#1a1a1a] rounded-t-2xl overflow-y-auto max-h-[85dvh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1a1a1a] px-4 pt-4 pb-3 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <p className="font-bold text-base">Log Progress</p>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  className="bg-gray-800 text-sm text-gray-300 rounded-lg px-2 py-1 outline-none border border-gray-700" />
              </div>
              <p className="text-gray-500 text-xs mt-1">Fill in what you want to track — leave the rest blank.</p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
              {ALL_METRICS.map(m => (
                <div key={m} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-gray-300 flex-1">{MEASUREMENT_LABELS[m]}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text" inputMode="decimal"
                      value={logValues[m] ?? ''}
                      onChange={e => setLogValues(v => ({ ...v, [m]: e.target.value }))}
                      placeholder="—"
                      className="w-20 text-right bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-[#f5a623]"
                    />
                    <span className="text-gray-500 text-xs w-6">{MEASUREMENT_UNITS[m]}</span>
                  </div>
                </div>
              ))}
              <div className="mt-1">
                <p className="text-gray-400 text-xs mb-1">Note (optional)</p>
                <textarea value={logNote} onChange={e => setLogNote(e.target.value)}
                  placeholder="e.g. feeling stronger, clothes fitting better…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none focus:border-[#f5a623]"
                  rows={2} />
              </div>
              <button
                onClick={handleSaveLog}
                disabled={saving || Object.values(logValues).every(v => !v)}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mt-1 mb-4
                  ${saving || Object.values(logValues).every(v => !v) ? 'bg-gray-800 text-gray-500' : 'bg-[#f5a623] text-black'}`}
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh text-gray-400">Loading…</div>}>
      <GoalsInner />
    </Suspense>
  );
}
