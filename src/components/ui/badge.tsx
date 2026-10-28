import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#F0F1F3] text-[#18251D] border border-[#E5E9E6]',
        on_track: 'bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB]',
        at_risk: 'bg-amber-50 text-amber-800 border border-amber-200',
        off_track: 'bg-red-50 text-red-700 border border-red-200',
        todo: 'bg-[#F3F5F4] text-[#5E6962] border border-[#E5E9E6]',
        in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
        ready_for_review: 'bg-purple-50 text-purple-700 border border-purple-200',
        completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        blocked: 'bg-rose-50 text-rose-700 border border-rose-200',
        urgent: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        high: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
        medium: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
        low: 'bg-slate-100 text-slate-700 border border-slate-200',
        lime: 'bg-[#20E34A] text-[#06351F] font-semibold',
        forest: 'bg-[#082F1B] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  dot = false,
  dotColor,
  children,
  ...props
}) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
    </div>
  );
};

