'use client';

import { useEffect, useState, useRef } from 'react';
import { getRestTime, setRestTime } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';

type Props = {
  onDismiss: () => void;
};

const PRESETS = [30, 60, 90, 120, 180];

export default function RestTimer({ onDismiss }: Props) {
  const { t } = useTheme();
  const defaultTime = getRestTime();
  const [seconds, setSeconds] = useState(defaultTime);
  const [total, setTotal] = useState(defaultTime);
  const [showPresets, setShowPresets] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer(duration: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(duration);
    setTotal(duration);
    setShowPresets(false);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    startTimer(defaultTime);
    return () => clearInterval(intervalRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pickPreset(t: number) {
    setRestTime(t);
    startTimer(t);
  }

  const pct = total > 0 ? (seconds / total) * 100 : 0;
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6"
      onClick={() => { if (!showPresets) onDismiss(); }}
    >
      <p className="text-gray-400 text-sm uppercase tracking-widest">{t.restLabel}</p>

      <div className="relative" onClick={e => e.stopPropagation()}>
        <svg width="200" height="200" className="-rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#222" strokeWidth="8" />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={seconds === 0 ? '#22c55e' : 'var(--accent)'}
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

      {/* Preset picker */}
      {showPresets ? (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {PRESETS.map(t => (
            <button
              key={t}
              onClick={() => pickPreset(t)}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-700 active:bg-gray-800"
              style={t === total
                ? { backgroundColor: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                : { color: '#9ca3af' }}
            >
              {t}s
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setShowPresets(true); }}
          className="text-gray-600 text-xs underline underline-offset-2"
        >
          {total}s · change default
        </button>
      )}

      <button
        className="text-gray-500 text-sm border border-gray-700 rounded-full px-6 py-2 active:bg-gray-800"
        onClick={onDismiss}
      >
        {seconds === 0 ? 'Next set' : 'Skip rest'}
      </button>
    </div>
  );
}
