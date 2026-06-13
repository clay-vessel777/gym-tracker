'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  duration: number; // target hold time in seconds
};

export default function HoldTimer({ duration }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown when the target changes (e.g. user adjusts hold time) while idle
  useEffect(() => {
    if (!running) setRemaining(duration);
  }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(400);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function toggle() {
    if (remaining === 0) { setRemaining(duration); setRunning(true); return; }
    setRunning(r => !r);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration);
  }

  const pct = duration > 0 ? (remaining / duration) * 100 : 0;
  const startLabel = running ? 'Pause' : remaining === 0 ? 'Restart' : remaining === duration ? 'Start' : 'Resume';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
        {remaining}s
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={toggle}
          className="flex-1 py-2.5 rounded-lg font-semibold text-white active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {startLabel}
        </button>
        <button
          onClick={reset}
          className="py-2.5 px-4 rounded-lg font-medium text-gray-400 border border-gray-700 active:bg-gray-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
