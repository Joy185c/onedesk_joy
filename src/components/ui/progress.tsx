import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'lime' | 'emerald' | 'amber' | 'rose' | 'blue';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color = 'lime',
  className,
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    lime: 'bg-[#20E34A]',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-[#E5E9E6] rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-[#778079] mt-1 font-medium">
          <span>Progress</span>
          <span className="font-semibold text-[#18251D]">{percentage}%</span>
        </div>
      )}
    </div>
  );
};

