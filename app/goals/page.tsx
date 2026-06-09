'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoalEntry, GoalMeasurementType, MEASUREMENT_LABELS, MEASUREMENT_UNITS,
  loadGoalEntries, saveGoalEntries, getLatestValues, daysSinceLastEntry,
} from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

const ALL_METRICS: GoalMeasurementType[] = [
  'weight', 'chest', 'waist', 'hips', 'bicep_left', 'bicep_right',
  'thigh', 'neck', 'shoulders', 'calf',
];

function GoalsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = params.get('profile') ?? 'jlord';
  const profileLabel = profile === 'jasmine' ? '💕 Jasmine' : '💪 JLord';

  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [latest, setLatest] = useState<Partial<Record<GoalMeasurementType, GoalEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Log form state
  const [logValues, setLogValues] = useState<Partial<Record<GoalMeasurementType, string>>>({});
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadGoalEntries(profile).then(data => {
      setEntries(data);
      setLatest(getLatestValues(data));
      setLoading(false);
    });
  }, [profile]);

  const daysSince = daysSinceLastEntry(entries);
  const needsUpdate = daysSince !== null && daysSince >= 7;

  async function handleSave() {
    const toSave = ALL_METRICS
      .filter(m => logValues[m] && logValues[m] !== '')
      .map(m => ({
        profile,
        measurementType: m,
        value: parseFloat(logValues[m]!),
        date: logDate,
        note: logNote || undefined,
      }));
    if (toSave.length === 0) return;
    setSaving(true);
    await saveGoalEntries(toSave, profile);
    const updated = await loadGoalEntries(profile);
    setEntries(updated);
    setLatest(getLatestValues(updated));
    setLogValues({});
    setLogNote('');
    setShowLog(false);
    setSaving(false);
  }

  // Group history entries by date
  const byDate: Record<string, GoalEntry[]> = {};
  entries.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <main className="flex flex-col min-h-dvh w-full max-w-lg mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-400 text-sm active:text-white">← Back</button>
        <span className="text-sm font-medium text-gray-300">Goals · {profileLabel}</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">

        {/* Weekly reminder banner */}
        {needsUpdate && (
          <button
            onClick={() => setShowLog(true)}
            className="w-full rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/50 px-4 py-3 text-left active:bg-[#f5a623]/20"
          >
            <p className="text-[#f5a623] font-semibold text-sm">📅 Time for your weekly check-in!</p>
            <p className="text-gray-400 text-xs mt-0.5">Last logged {daysSince} days ago — tap to update →</p>
          </button>
        )}

        {/* Current snapshot */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Current</p>
          {loading ? (
            <p className="text-gray-600 text-sm">Loading…</p>
          ) : Object.keys(latest).length === 0 ? (
            <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 px-4 py-6 text-center">
              <p className="text-gray-500 text-sm">No data yet.</p>
              <p className="text-gray-600 text-xs mt-1">Log your first entry to start tracking.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#1a1a1a] border border-gray-800 divide-y divide-gray-800">
              {ALL_METRICS.filter(m => latest[m]).map(m => {
                const entry = latest[m]!;
                return (
                  <div key={m} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-300">{MEASUREMENT_LABELS[m]}</span>
                    <span className="text-sm font-bold text-white">
                      {entry.value} <span className="text-gray-500 font-normal text-xs">{MEASUREMENT_UNITS[m]}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Log button */}
        <button
          onClick={() => setShowLog(true)}
          className="w-full py-4 rounded-2xl bg-[#f5a623] text-black font-bold text-lg active:scale-95 transition-transform"
        >
          + Log Today's Numbers
        </button>

        {/* History */}
        {sortedDates.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">History</p>
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
                        <span className="text-sm font-medium">
                          {e.value} <span className="text-gray-500 text-xs font-normal">{MEASUREMENT_UNITS[e.measurementType]}</span>
                        </span>
                      </div>
                    ))}
                    {byDate[date][0]?.note && (
                      <div className="px-4 py-2">
                        <p className="text-xs text-gray-500 italic">{byDate[date][0].note}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log sheet */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={() => setShowLog(false)}>
          <div
            className="bg-[#1a1a1a] rounded-t-2xl overflow-y-auto max-h-[85dvh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#1a1a1a] px-4 pt-4 pb-3 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <p className="font-bold text-base">Log Progress</p>
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="bg-gray-800 text-sm text-gray-300 rounded-lg px-2 py-1 outline-none border border-gray-700"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">Fill in what you want to track — leave the rest blank.</p>
            </div>

            <div className="px-4 py-3 flex flex-col gap-3">
              {ALL_METRICS.map(m => (
                <div key={m} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-gray-300 flex-1">{MEASUREMENT_LABELS[m]}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
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
                <textarea
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  placeholder="e.g. feeling stronger, clothes fitting better…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none focus:border-[#f5a623]"
                  rows={2}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || Object.values(logValues).every(v => !v)}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 mt-1 mb-4
                  ${saving || Object.values(logValues).every(v => !v)
                    ? 'bg-gray-800 text-gray-500'
                    : 'bg-[#f5a623] text-black'
                  }`}
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
