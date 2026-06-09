'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';
import { WorkoutSession } from '@/lib/data';

export default function DonePage() {
  const router = useRouter();
  const { t } = useTheme();
  const [session, setSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    const sessions = getSessions();
    if (sessions.length > 0) setSession(sessions[0]);
  }, []);

  function shareWorkout() {
    if (!session) return;
    const lines = [
      `⚔️ Gym Tracker — Day ${session.day} (${session.timeSlot} min)`,
      `📅 ${new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      `⏱️ ${session.durationMinutes} min actual`,
      '',
      ...session.exercises.map(e =>
        `• ${e.name}: ${e.setsCompleted}/${e.totalSets} sets @ ${e.weightUsed > 0 ? `${e.weightUsed} lbs` : 'bodyweight'}${e.notes ? ` (${e.notes})` : ''}`
      ),
    ];
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Copied to clipboard!');
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh max-w-lg mx-auto px-4 py-6 gap-6 text-center">
      <div className="text-7xl">🏆</div>
      <div>
        <h1 className="text-3xl font-bold">{t.doneTitle}</h1>
        {session && (
          <p className="text-gray-400 mt-2">
            Day {session.day} · {session.durationMinutes} min · {session.exercises.length} exercises
          </p>
        )}
      </div>

      {session && (
        <div className="w-full bg-[var(--card-bg)] border border-gray-800 rounded-xl divide-y divide-gray-800">
          {session.exercises.map(ex => (
            <div key={ex.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-gray-300">{ex.name}</span>
              <span className="text-gray-500">
                {ex.setsCompleted}/{ex.totalSets} sets
                {ex.weightUsed > 0 && ` · ${ex.weightUsed} lbs`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={shareWorkout}
          className="w-full py-4 rounded-xl border border-gray-700 text-gray-300 font-medium active:bg-gray-800"
        >
          Share / Export 📜
        </button>
        <button
          onClick={() => router.push('/')}
          className={`w-full py-4 ${t.btnRadius} bg-[var(--accent)] text-white font-bold text-lg active:scale-95 transition-transform`}
        >
          Back Home
        </button>
      </div>
    </main>
  );
}
