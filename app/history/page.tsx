'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, loadSessionsFromCloud } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';
import { WorkoutSession } from '@/lib/data';

export default function HistoryPage() {
  const router = useRouter();
  const { t } = useTheme();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getSessions()); // show local cache immediately
    loadSessionsFromCloud().then(setSessions); // then update from cloud
  }, []);

  return (
    <main className="flex flex-col min-h-dvh max-w-lg mx-auto px-4 py-6 gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-sm active:text-white">
          ← Back
        </button>
        <h1 className="text-xl font-bold">{t.historyTitle}</h1>
      </div>

      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
          <span className="text-5xl">{t.historyEmoji}</span>
          <p className="text-gray-400">{t.historyEmpty}</p>
          <p className="text-gray-600 text-sm">{t.historyEmptySub}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map(session => {
          const date = new Date(session.date);
          const isOpen = expanded === session.id;
          return (
            <div key={session.id} className="bg-[var(--card-bg)] border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : session.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-gray-800/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--accent)] font-bold">Day {session.day}</span>
                    {session.jasmineMode && <span className="text-pink-400 text-xs">{t.jasmineEmoji} Jasmine</span>}
                    <span className="text-gray-500 text-xs">{session.timeSlot} min slot</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{session.durationMinutes} min actual
                  </div>
                </div>
                <span className="text-gray-500 text-lg">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-800 divide-y divide-gray-800/60">
                  {session.notes && (
                    <div className="px-4 py-2.5 bg-gray-900/40">
                      <p className="text-xs text-gray-500 italic">📝 {session.notes}</p>
                    </div>
                  )}
                  {session.exercises.map(ex => {
                    const isPR = session.prs?.includes(ex.id);
                    return (
                      <div key={ex.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-200 flex items-center gap-1.5">
                            {ex.name}
                            {isPR && <span className="text-xs text-green-400 font-semibold">PR</span>}
                          </span>
                          <span className="text-xs text-gray-500">
                            {ex.setsCompleted}/{ex.totalSets} sets
                            {ex.weightUsed > 0 && ` · ${ex.weightUsed} lbs`}
                          </span>
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">{ex.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
