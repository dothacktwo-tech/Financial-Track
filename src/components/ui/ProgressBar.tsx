import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100+
  max?: number;
  showLabel?: boolean;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  color = 'emerald',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-700">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full rounded-full bg-slate-100 overflow-hidden ${sizes[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
