import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[#778079]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-xl border border-[#E5E9E6] bg-white px-3 py-1 text-sm text-[#18251D] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8E9891] focus-visible:outline-none focus-visible:border-[#20E34A] focus-visible:ring-2 focus-visible:ring-[#20E34A]/20 disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-9',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

