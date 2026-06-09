'use client';

import { useEffect, useState, useRef } from 'react';

type Props = {
  onDismiss: () => void;
};

export default function RestTimer({ onDismiss }: Props) {
  const [seconds, setSeconds] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const pct = (seconds / 60) * 100;
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-8"
      onClick={onDismiss}
    >
      <p className="text-gray-400 text-sm uppercase tracking-widest">Rest</p>

      <div className="relative">
        <svg width="200" height="200" className="-rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#222" strokeWidth="8" />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={seconds === 0 ? '#22c55e' : '#f5a623'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold tabular-nums">
            {seconds === 0 ? '✓' : seconds}
          </span>
        </div>
      </div>

      <button
        className="text-gray-500 text-sm border border-gray-700 rounded-full px-6 py-2 active:bg-gray-800"
        onClick={onDismiss}
      >
        {seconds === 0 ? 'Next set' : 'Skip rest'}
      </button>
    </div>
  );
}
