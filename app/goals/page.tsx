'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoalEntry, GoalTarget, GoalMeasurementType, MEASUREMENT_LABELS, MEASUREMENT_UNITS,
  loadGoalEntries, saveGoalEntries, getLatestValues, daysSinceLastEntry,
  loadGoalTargets, saveGoalTarget, markGoalAchieved, updateGoalTarget, deleteGoalTarget,
  ActivityGoal, ActivityGoalType, getActivityGoals, saveActivityGoal, deleteActivityGoal, getActivityGoalProgress,
  getSeenMilestones, setMilestoneSeen,
} from '@/lib/storage';
import Sparkline from '@/components/Sparkline';

const ALL_METRICS: GoalMeasurementType[] = [
  'weight', 'chest', 'waist', 'hips', 'bicep_left', 'bicep_right',
  'thigh', 'neck', 'shoulders', 'calf',
];

const MILESTONE_THRESHOLDS = [25, 50, 75, 100];

function milestoneEmoji(pct: number) {
  if (pct >= 100) return '🏆';
  if (pct >= 75) return '🔥';
  if (pct >= 50) return '💪';
  return '🌱';
}

function milestoneLabel(pct: number) {
  if (pct >= 100) return 'Goal achieved!';
  return `${pct}% of the way there!`;
}

// ── Milestone celebration overlay ─────────────────────────────────────────────

function MilestoneCelebration({
  goalName, pct, onDismiss,
}: { goalName: string; pct: number; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6" onClick={onDismiss}>
      <div
        className="w-full max-w-sm rounded-2xl border text-center px-6 py-8 flex flex-col items-center gap-4"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--accent-40)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-7xl">{milestoneEmoji(pct)}</div>
        <div>
          <p className="text-2xl font-bold">{milestoneLabel(pct)}</p>
          <p className="text-gray-400 text-sm mt-1">{goalName}</p>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Keep going!
        </button>
      </div>
    </div>
  );
}

// ── Progress chart sheet ──────────────────────────────────────────────────────

function ProgressChartSheet({
  goal, entries, onClose,
}: {
  goal: GoalTarget;
  entries: GoalEntry[];
  onClose: () => void;
}) {
  const unit = MEASUREMENT_UNITS[goal.measurementType];
  const label = MEASUREMENT_LABELS[goal.measurementType];

  const points = entries
    .filter(e => e.measurementType === goal.measurementType)
    .sort((a, b) => a.date.localeCompare(b.date));

  const current = points.length > 0 ? points[points.length - 1].value : goal.startValue;
  const start = goal.startValue;
  const target = goal.targetValue;

  const delta = current !== null && start !== null ? current - start : null;
  const goalDir = start !== null && target !== start ? Math.sign(target - start) : 0;
  const isGoodDelta = delta !== null && goalDir !== 0 && Math.sign(delta) === goalDir;
  const deltaColor = delta === null || delta === 0 ? '#ffffff' : isGoodDelta ? '#22c55e' : '#ef4444';

  let pct = 0;
  if (start !== null && current !== null && start !== target) {
    pct = Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  }

  const W = 340, H = 210;
  const PL = 44, PR = 14, PT = 14, PB = 34;
  const CW = W - PL - PR;
  const CH = H - PT - PB;

  const allVals = [...points.map(p => p.value), ...(start !== null ? [start] : []), target];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const rawRange = rawMax - rawMin || 1;
  const yPad = rawRange * 0.2;
  const yLow = rawMin - yPad;
  const yHigh = rawMax + yPad;

  const sy = (v: number) => PT + CH * (1 - (v - yLow) / (yHigh - yLow));

  const toMs = (d: string) => new Date(d + 'T12:00:00').getTime();
  const x0 = toMs(goal.startDate);
  const xTarget = toMs(goal.targetDate);
  const xToday = Date.now();
  const xLast = points.length > 0 ? toMs(points[points.length - 1].date) : 0;
  const x1 = Math.max(xTarget, xToday, xLast);
  const xSpan = Math.max(x1 - x0, 86400000);

  const sx = (ms: number) => PL + ((ms - x0) / xSpan) * CW;
  const sxd = (d: string) => sx(toMs(d));

  const txTarget = sx(xTarget);
  const txToday = sx(xToday);
  const targetY = sy(target);
  const idealY1 = start !== null ? sy(start) : null;

  const yTicks = [0, 1, 2, 3].map(i => Math.round((yLow + (yHigh - yLow) * (i / 3)) * 10) / 10);

  const dataPts = points.map(p => ({ x: sxd(p.date), y: sy(p.value), v: p.value, date: p.date, id: p.id }));
  const polyline = dataPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let lineColor = '#4b5563';
  if (dataPts.length >= 2 && goalDir !== 0) {
    const lastV = dataPts[dataPts.length - 1].v;
    const prevV = dataPts[dataPts.length - 2].v;
    lineColor = Math.sign(lastV - prevV) === goalDir ? '#22c55e' : '#ef4444';
  } else if (dataPts.length === 1) {
    lineColor = 'var(--accent)';
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={onClose}>
      <div className="bg-[var(--card-bg)] rounded-t-2xl overflow-y-auto max-h-[90dvh]" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[var(--card-bg)] px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-base">{label}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {start !== null ? `${start} → ${target} ${unit}` : `Target: ${target} ${unit}`}
                {' · '}by {new Date(goal.targetDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{Math.round(pct)}%</p>
              <p className="text-gray-500 text-xs">of goal</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-4 flex flex-col gap-4">
          {points.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-gray-400 text-sm">No check-ins logged yet</p>
              <p className="text-gray-600 text-xs mt-1">Use &quot;Log Today&apos;s Numbers&quot; to start tracking</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }} overflow="visible">
              {/* Y grid + labels */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={PL} y1={sy(v)} x2={W - PR} y2={sy(v)} stroke="#1f2937" strokeWidth="1" />
                  <text x={PL - 5} y={sy(v) + 4} textAnchor="end" fontSize="9" fill="#6b7280">{v}</text>
                </g>
              ))}

              {/* Ideal pace dashed line */}
              {idealY1 !== null && (
                <line x1={PL} y1={idealY1} x2={txTarget} y2={targetY}
                  stroke="#374151" strokeWidth="1.5" strokeDasharray="4 3" />
              )}

              {/* Target reference line */}
              <line x1={PL} y1={targetY} x2={W - PR} y2={targetY}
                stroke="#6b7280" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
              <text x={W - PR - 2} y={targetY - 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                Goal: {target}
              </text>

              {/* Today vertical line */}
              {txToday > PL + 10 && txToday < W - PR - 10 && (
                <>
                  <line x1={txToday} y1={PT} x2={txToday} y2={PT + CH}
                    stroke="#374151" strokeWidth="1" strokeDasharray="2 3" />
                  <text x={txToday} y={H - 4} textAnchor="middle" fontSize="9" fill="#4b5563">Today</text>
                </>
              )}

              {/* Actual data line */}
              {dataPts.length >= 2 && (
                <polyline points={polyline} fill="none" stroke={lineColor}
                  strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              )}

              {/* Data dots + last value label */}
              {dataPts.map((p, i) => (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r={4} fill={lineColor} stroke="var(--card-bg)" strokeWidth="1.5" />
                  {i === dataPts.length - 1 && (
                    <text
                      x={p.x + (p.x > W - PR - 30 ? -8 : 8)}
                      y={p.y - 6}
                      textAnchor={p.x > W - PR - 30 ? 'end' : 'start'}
                      fontSize="10" fill={lineColor} fontWeight="600"
                    >
                      {p.v}
                    </text>
                  )}
                </g>
              ))}

              {/* Start dot */}
              {idealY1 !== null && (
                <circle cx={PL} cy={idealY1} r={3.5} fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
              )}

              {/* X-axis labels */}
              <text x={PL} y={H - 4} textAnchor="middle" fontSize="9" fill="#6b7280">
                {fmtDate(goal.startDate)}
              </text>
              <text x={txTarget} y={H - 4}
                textAnchor={txTarget > W - 40 ? 'end' : 'middle'} fontSize="9" fill="#6b7280">
                {fmtDate(goal.targetDate)} 🎯
              </text>
            </svg>
          )}

          {/* Stats row */}
          {points.length > 0 && (
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-gray-800/40 px-3 py-3 text-center">
                <p className="text-xs text-gray-500">Current</p>
                <p className="text-sm font-bold mt-0.5">
                  {current} <span className="text-xs text-gray-500 font-normal">{unit}</span>
                </p>
              </div>
              {delta !== null && start !== null && (
                <div className="flex-1 rounded-xl bg-gray-800/40 px-3 py-3 text-center">
                  <p className="text-xs text-gray-500">Changed</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: deltaColor }}>
                    {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10}
                    <span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>
                  </p>
                </div>
              )}
              <div className="flex-1 rounded-xl bg-gray-800/40 px-3 py-3 text-center">
                <p className="text-xs text-gray-500">Check-ins</p>
                <p className="text-sm font-bold mt-0.5">{points.length}</p>
              </div>
              <div className="flex-1 rounded-xl bg-gray-800/40 px-3 py-3 text-center">
                <p className="text-xs text-gray-500">To go</p>
                <p className="text-sm font-bold mt-0.5">
                  {current !== null ? Math.abs(Math.round((target - current) * 10) / 10) : '—'}
                  <span className="text-xs text-gray-500 font-normal ml-0.5">{unit}</span>
                </p>
              </div>
            </div>
          )}

          {/* Check-in history */}
          {points.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Check-in History</p>
              <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 divide-y divide-gray-800">
                {[...points].reverse().map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-gray-400">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-medium">
                      {p.value} <span className="text-gray-500 text-xs font-normal">{unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ── Measurement goal card ─────────────────────────────────────────────────────

function GoalCard({
  goal, latest, onAchieved, onEdit, onDelete, onProgress, isGuest,
}: {
  goal: GoalTarget;
  latest: Partial<Record<GoalMeasurementType, GoalEntry>>;
  onAchieved: (id: string) => void;
  onEdit: (goal: GoalTarget) => void;
  onDelete: (id: string) => void;
  onProgress: (goal: GoalTarget) => void;
  isGuest: boolean;
}) {
  const unit = MEASUREMENT_UNITS[goal.measurementType];
  const currentEntry = latest[goal.measurementType];
  const current = currentEntry?.value ?? goal.startValue;
  const start = goal.startValue;
  const target = goal.targetValue;

  let pct = 0;
  if (start !== null && current !== null && start !== target) {
    pct = Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  }

  const daysLeft = Math.ceil((new Date(goal.targetDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
  const isPast = daysLeft < 0;
  const isClose = !isPast && daysLeft <= 14;

  return (
    <div className={`rounded-xl bg-[var(--card-bg)] border overflow-hidden ${goal.achieved ? 'border-green-700/50' : isClose ? 'border-[var(--accent)]' : 'border-gray-800'}`}>
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
                  : <span className={isClose ? 'text-[var(--accent)]' : 'text-gray-400'}>{daysLeft} days left</span>
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

        {start !== null && current !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Start: {start} {unit}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${goal.achieved ? 'bg-green-500' : 'bg-[var(--accent)]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {goal.note && <p className="text-gray-600 text-xs mt-2 italic">{goal.note}</p>}

        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => onProgress(goal)}
            className="text-xs font-medium border rounded-lg px-3 py-1.5 active:opacity-70"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent-40)' }}
          >
            See Progress →
          </button>
          {!goal.achieved && !isGuest && (
            <>
              <button
                onClick={() => onAchieved(goal.id)}
                className="text-xs text-gray-500 border border-gray-700 rounded-lg px-3 py-1.5 active:bg-gray-800"
              >
                Mark Achieved ✓
              </button>
              <button
                onClick={() => onEdit(goal)}
                className="text-xs text-gray-500 border border-gray-700 rounded-lg px-3 py-1.5 active:bg-gray-800"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this goal?')) onDelete(goal.id);
                }}
                className="text-xs text-red-800 border border-red-900/40 rounded-lg px-3 py-1.5 active:bg-red-900/20"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity goal card ────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<ActivityGoalType, string> = {
  workout_count: 'Total Workouts',
  streak: 'Week Streak',
};

const ACTIVITY_UNITS: Record<ActivityGoalType, string> = {
  workout_count: 'workouts',
  streak: 'weeks',
};

function ActivityGoalCard({
  goal, onDelete,
}: { goal: ActivityGoal; onDelete: (id: string) => void }) {
  const { current, pct } = getActivityGoalProgress(goal);
  const daysLeft = Math.ceil((new Date(goal.targetDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
  const isPast = daysLeft < 0;
  const isClose = !isPast && daysLeft <= 14;
  const unit = ACTIVITY_UNITS[goal.type];

  return (
    <div className={`rounded-xl bg-[var(--card-bg)] border overflow-hidden ${goal.achieved ? 'border-green-700/50' : isClose ? 'border-[var(--accent)]' : 'border-gray-800'}`}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{ACTIVITY_LABELS[goal.type]}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Target: <span className="text-white font-medium">{goal.targetValue} {unit}</span>
              {' · '}
              {goal.achieved
                ? <span className="text-green-400">Achieved ✓</span>
                : isPast
                  ? <span className="text-red-400">Overdue by {Math.abs(daysLeft)}d</span>
                  : <span className={isClose ? 'text-[var(--accent)]' : 'text-gray-400'}>{daysLeft} days left</span>
              }
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold">{current}</p>
            <p className="text-gray-500 text-xs">{unit}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>0 {unit}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${goal.achieved ? 'bg-green-500' : 'bg-[var(--accent)]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {goal.note && <p className="text-gray-600 text-xs mt-2 italic">{goal.note}</p>}

        <button
          onClick={() => { if (confirm('Delete this goal?')) onDelete(goal.id); }}
          className="mt-3 text-xs text-red-800 border border-red-900/40 rounded-lg px-3 py-1.5 active:bg-red-900/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function GoalsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = params.get('profile') ?? 'jlord';
  const isGuest = profile === 'guest';
  const profileLabel = isGuest ? '🎭 Guest' : profile === 'jasmine' ? '🌹 Jasmine' : '⚔️ JLord';

  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [latest, setLatest] = useState<Partial<Record<GoalMeasurementType, GoalEntry>>>({});
  const [goalTargets, setGoalTargets] = useState<GoalTarget[]>([]);
  const [activityGoals, setActivityGoals] = useState<ActivityGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLog, setShowLog] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Milestone celebration
  const [celebration, setCelebration] = useState<{ goalId: string; goalName: string; pct: number } | null>(null);

  // Progress chart
  const [progressGoal, setProgressGoal] = useState<GoalTarget | null>(null);

  // Log form
  const [logValues, setLogValues] = useState<Partial<Record<GoalMeasurementType, string>>>({});
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Create goal form
  const [createTab, setCreateTab] = useState<'measurement' | 'activity'>('measurement');
  const [newMetric, setNewMetric] = useState<GoalMeasurementType>('weight');
  const [newStartValue, setNewStartValue] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newActivityType, setNewActivityType] = useState<ActivityGoalType>('workout_count');
  const [newActivityTarget, setNewActivityTarget] = useState('');

  // Edit goal
  const [editingGoal, setEditingGoal] = useState<GoalTarget | null>(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editStartValue, setEditStartValue] = useState('');
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    Promise.all([loadGoalEntries(profile), loadGoalTargets(profile)]).then(([e, g]) => {
      setEntries(e);
      setLatest(getLatestValues(e));
      setGoalTargets(g);
      setActivityGoals(getActivityGoals().filter(ag => !isGuest));
      setLoading(false);
    });
  }, [profile, isGuest]);

  // Check for newly crossed milestones after data loads
  useEffect(() => {
    if (loading || celebration) return;
    const activeGoals = goalTargets.filter(g => !g.achieved);
    for (const goal of activeGoals) {
      if (goal.startValue === null) continue;
      const current = latest[goal.measurementType]?.value ?? goal.startValue;
      const start = goal.startValue;
      const target = goal.targetValue;
      if (start === target) continue;
      const pct = Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
      const seen = getSeenMilestones(goal.id);
      for (const threshold of MILESTONE_THRESHOLDS) {
        if (pct >= threshold && !seen.includes(threshold)) {
          setMilestoneSeen(goal.id, threshold);
          setCelebration({ goalId: goal.id, goalName: MEASUREMENT_LABELS[goal.measurementType], pct: threshold });
          return;
        }
      }
    }
  }, [loading, goalTargets, latest]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (createTab === 'measurement') {
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
        setGoalTargets(g => [...g, { ...goal, id: `guest-goal-${Date.now()}`, achieved: false }]);
      }
    } else {
      if (!newActivityTarget) { setSaving(false); return; }
      const ag: ActivityGoal = {
        id: `ag-${Date.now()}`,
        type: newActivityType,
        targetValue: parseInt(newActivityTarget),
        startDate: new Date().toISOString().split('T')[0],
        targetDate: newTargetDate,
        note: newNote || undefined,
        achieved: false,
      };
      saveActivityGoal(ag);
      setActivityGoals(getActivityGoals());
    }
    setNewTargetValue(''); setNewTargetDate(''); setNewNote(''); setNewActivityTarget('');
    setShowCreate(false); setSaving(false);
  }

  async function handleAchieved(id: string) {
    if (!isGuest) await markGoalAchieved(id);
    setGoalTargets(g => g.map(t => t.id === id ? { ...t, achieved: true } : t));
  }

  async function handleDelete(id: string) {
    if (!isGuest) await deleteGoalTarget(id);
    setGoalTargets(g => g.filter(t => t.id !== id));
  }

  function openEdit(goal: GoalTarget) {
    setEditingGoal(goal);
    setEditTargetValue(String(goal.targetValue));
    setEditTargetDate(goal.targetDate);
    setEditStartValue(goal.startValue !== null ? String(goal.startValue) : '');
    setEditNote(goal.note ?? '');
  }

  async function handleSaveEdit() {
    if (!editingGoal || !editTargetValue || !editTargetDate) return;
    setSaving(true);
    const patch = {
      targetValue: parseFloat(editTargetValue),
      targetDate: editTargetDate,
      startValue: editStartValue ? parseFloat(editStartValue) : null,
      note: editNote || undefined,
    };
    if (!isGuest) await updateGoalTarget(editingGoal.id, patch);
    setGoalTargets(g => g.map(t => t.id === editingGoal.id ? { ...t, ...patch } : t));
    setEditingGoal(null); setSaving(false);
  }

  const activeGoals = goalTargets.filter(g => !g.achieved);
  const achievedGoals = goalTargets.filter(g => g.achieved);
  const activeActivityGoals = activityGoals.filter(g => !g.achieved);

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
          <button onClick={() => setShowLog(true)} className="w-full rounded-xl border px-4 py-3 text-left" style={{ backgroundColor: 'var(--accent-10)', borderColor: 'var(--accent-50)' }}>
            <p className="text-[var(--accent)] font-semibold text-sm">📏 Weekly check-in due!</p>
            <p className="text-gray-400 text-xs mt-0.5">Last logged {daysSince} days ago — tap to update →</p>
          </button>
        )}

        {/* Active measurement goals */}
        {!loading && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Active Goals</p>
            {activeGoals.length === 0 && activeActivityGoals.length === 0 ? (
              <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 px-4 py-6 text-center">
                <p className="text-gray-500 text-sm">No active goals.</p>
                <p className="text-gray-600 text-xs mt-1">Create one below to start tracking your progress.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeGoals.map(g => (
                  <GoalCard key={g.id} goal={g} latest={latest} onAchieved={handleAchieved}
                    onEdit={openEdit} onDelete={handleDelete} onProgress={setProgressGoal} isGuest={isGuest} />
                ))}
                {activeActivityGoals.map(g => (
                  <ActivityGoalCard key={g.id} goal={g}
                    onDelete={id => { deleteActivityGoal(id); setActivityGoals(getActivityGoals()); }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-bold text-lg active:scale-95 transition-transform"
        >
          + Create New Goal
        </button>
        <button
          onClick={() => setShowLog(true)}
          className="w-full py-4 rounded-2xl bg-[var(--card-bg)] border border-gray-700 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          Log Today's Numbers
        </button>

        {/* Achieved goals */}
        {(achievedGoals.length > 0) && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Achieved 🏆</p>
            <div className="flex flex-col gap-2">
              {achievedGoals.map(g => (
                <div key={g.id} className="rounded-xl bg-[var(--card-bg)] border border-green-800/40 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{MEASUREMENT_LABELS[g.measurementType]}</p>
                    <p className="text-xs text-gray-500">{g.targetValue} {MEASUREMENT_UNITS[g.measurementType]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setProgressGoal(g)}
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      See Progress →
                    </button>
                    <span className="text-green-400 text-sm">✓</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current measurements with sparklines */}
        {Object.keys(latest).length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Current Measurements</p>
            <div className="rounded-xl bg-[var(--card-bg)] border border-gray-800 divide-y divide-gray-800">
              {ALL_METRICS.filter(m => latest[m]).map(m => {
                const metricHistory = entries
                  .filter(e => e.measurementType === m)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(e => e.value);
                return (
                  <div key={m} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-gray-300">{MEASUREMENT_LABELS[m]}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {metricHistory.length >= 2 && (
                        <Sparkline values={metricHistory} width={60} height={24} />
                      )}
                      <span className="text-sm font-bold text-right">
                        {latest[m]!.value} <span className="text-gray-500 font-normal text-xs">{MEASUREMENT_UNITS[m]}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Log history */}
        {sortedDates.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Log History</p>
            <div className="flex flex-col gap-3">
              {sortedDates.map(date => (
                <div key={date} className="rounded-xl bg-[var(--card-bg)] border border-gray-800 overflow-hidden">
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

      {/* ── Progress chart sheet ── */}
      {progressGoal && (
        <ProgressChartSheet
          goal={progressGoal}
          entries={entries}
          onClose={() => setProgressGoal(null)}
        />
      )}

      {/* ── Milestone celebration overlay ── */}
      {celebration && (
        <MilestoneCelebration
          goalName={celebration.goalName}
          pct={celebration.pct}
          onDismiss={() => setCelebration(null)}
        />
      )}

      {/* ── Create Goal sheet ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl overflow-x-hidden overflow-y-auto max-h-[90dvh] w-full" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--card-bg)] px-4 pt-4 pb-3 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <p className="font-bold text-base">Create New Goal</p>
              {/* Tab switcher */}
              <div className="flex gap-2 mt-3">
                {(['measurement', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCreateTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${createTab === tab ? 'bg-[var(--accent)] text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    {tab === 'measurement' ? '📏 Body Measurement' : '🏃 Fitness Challenge'}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-4 flex flex-col gap-4">
              {createTab === 'measurement' ? (
                <>
                  {/* Metric picker */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2">What are you tracking?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_METRICS.map(m => (
                        <button
                          key={m}
                          onClick={() => setNewMetric(m)}
                          className={`py-2.5 px-3 rounded-xl text-sm text-left transition-all
                            ${newMetric === m ? 'bg-[var(--accent)] text-white font-semibold' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}
                        >
                          {MEASUREMENT_LABELS[m]}
                          <span className={`text-xs ml-1 ${newMetric === m ? 'opacity-60' : 'text-gray-500'}`}>{MEASUREMENT_UNITS[m]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs mb-1.5">Starting value <span className="text-gray-600">(optional)</span></p>
                      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                        <input type="text" inputMode="decimal" value={newStartValue}
                          onChange={e => setNewStartValue(e.target.value)}
                          placeholder="e.g. 185" className="flex-1 bg-transparent text-white text-sm outline-none" />
                        <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[newMetric]}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs mb-1.5">Target value</p>
                      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                        <input type="text" inputMode="decimal" value={newTargetValue}
                          onChange={e => setNewTargetValue(e.target.value)}
                          placeholder="e.g. 170" className="flex-1 bg-transparent text-white text-sm outline-none" />
                        <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[newMetric]}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Activity type */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2">What's the challenge?</p>
                    <div className="flex gap-2">
                      {(['workout_count', 'streak'] as ActivityGoalType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setNewActivityType(type)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${newActivityType === type ? 'bg-[var(--accent)] text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}
                        >
                          {type === 'workout_count' ? '🏋️ Total Workouts' : '🔥 Week Streak'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400 text-xs mb-1.5">
                      Target {newActivityType === 'workout_count' ? '(# of workouts)' : '(# of weeks)'}
                    </p>
                    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                      <input type="text" inputMode="numeric" value={newActivityTarget}
                        onChange={e => setNewActivityTarget(e.target.value)}
                        placeholder={newActivityType === 'workout_count' ? 'e.g. 20' : 'e.g. 8'}
                        className="flex-1 bg-transparent text-white text-sm outline-none" />
                      <span className="text-gray-500 text-xs">{ACTIVITY_UNITS[newActivityType]}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Shared: Target date + note */}
              <div>
                <p className="text-gray-400 text-xs mb-1.5">Target date</p>
                <input type="date" value={newTargetDate} onChange={e => setNewTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-gray-500" />
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-1.5">Note <span className="text-gray-600">(optional)</span></p>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. for the beach trip in August…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none resize-none"
                  rows={2} />
              </div>

              <button
                onClick={handleCreateGoal}
                disabled={saving || !newTargetDate || (createTab === 'measurement' ? !newTargetValue : !newActivityTarget)}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mb-4
                  ${saving || !newTargetDate ? 'bg-gray-800 text-gray-500' : 'bg-[var(--accent)] text-white'}`}
              >
                {saving ? 'Saving…' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Goal sheet ── */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setEditingGoal(null)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl overflow-x-hidden overflow-y-auto max-h-[85dvh] w-full" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--card-bg)] px-4 pt-4 pb-3 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <p className="font-bold text-base">Edit Goal</p>
              <p className="text-gray-500 text-xs mt-0.5">{MEASUREMENT_LABELS[editingGoal.measurementType]}</p>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-xs mb-1.5">Starting value</p>
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                    <input type="text" inputMode="decimal" value={editStartValue}
                      onChange={e => setEditStartValue(e.target.value)}
                      placeholder="—" className="flex-1 min-w-0 bg-transparent text-white text-sm outline-none" />
                    <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[editingGoal.measurementType]}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-xs mb-1.5">Target value</p>
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                    <input type="text" inputMode="decimal" value={editTargetValue}
                      onChange={e => setEditTargetValue(e.target.value)}
                      placeholder="—" className="flex-1 min-w-0 bg-transparent text-white text-sm outline-none" />
                    <span className="text-gray-500 text-xs">{MEASUREMENT_UNITS[editingGoal.measurementType]}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-1.5">Target date</p>
                <input type="date" value={editTargetDate} onChange={e => setEditTargetDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm outline-none" />
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-1.5">Note <span className="text-gray-600">(optional)</span></p>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
                  placeholder="e.g. for the beach trip in August…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none resize-none"
                  rows={2} />
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={saving || !editTargetValue || !editTargetDate}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mb-4
                  ${saving || !editTargetValue || !editTargetDate ? 'bg-gray-800 text-gray-500' : 'bg-[var(--accent)] text-white'}`}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log numbers sheet ── */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowLog(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl overflow-y-auto max-h-[85dvh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--card-bg)] px-4 pt-4 pb-3 border-b border-gray-800">
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
                    <input type="text" inputMode="decimal"
                      value={logValues[m] ?? ''}
                      onChange={e => setLogValues(v => ({ ...v, [m]: e.target.value }))}
                      placeholder="—"
                      className="w-20 text-right bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-gray-500" />
                    <span className="text-gray-500 text-xs w-6">{MEASUREMENT_UNITS[m]}</span>
                  </div>
                </div>
              ))}
              <div className="mt-1">
                <p className="text-gray-400 text-xs mb-1">Note (optional)</p>
                <textarea value={logNote} onChange={e => setLogNote(e.target.value)}
                  placeholder="e.g. feeling stronger, clothes fitting better…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none"
                  rows={2} />
              </div>
              <button
                onClick={handleSaveLog}
                disabled={saving || Object.values(logValues).every(v => !v)}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mt-1 mb-4
                  ${saving || Object.values(logValues).every(v => !v) ? 'bg-gray-800 text-gray-500' : 'bg-[var(--accent)] text-white'}`}
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
