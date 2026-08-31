import { RISK_LEVELS } from '../data/mockData';

export default function RiskBadge({ level, size = 'md' }) {
  const info = RISK_LEVELS[level] ?? RISK_LEVELS.LOW;
  const sizeClasses = size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium tracking-wide uppercase ${sizeClasses}`}
      style={{ backgroundColor: info.bg, color: info.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.color }}
      />
      {info.label}
    </span>
  );
}
