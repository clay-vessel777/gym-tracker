'use client';

type Props = {
  values: number[];
  width?: number;
  height?: number;
};

export default function Sparkline({ values, width = 80, height = 32 }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const last = values[values.length - 1];
  const first = values[0];
  const trending = last >= first;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={polyline}
        fill="none"
        stroke={trending ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const [x, y] = points[points.length - 1].split(',').map(Number);
        return <circle cx={x} cy={y} r={2.5} fill={trending ? '#22c55e' : '#ef4444'} />;
      })()}
    </svg>
  );
}
