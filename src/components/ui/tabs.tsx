import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1 select-none overflow-x-auto no-scrollbar',
        variant === 'underline' && 'border-b border-[#E5E9E6] px-1',
        variant === 'pills' && 'bg-[#F0F1F3] p-1 rounded-xl',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'pills') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-white text-[#18251D] shadow-sm'
                  : 'text-[#5E6962] hover:text-[#18251D] hover:bg-white/50'
              )}
            >
              {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    isActive ? 'bg-[#082F1B] text-white' : 'bg-[#E5E9E6] text-[#5E6962]'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
              isActive
                ? 'border-[#20E34A] text-[#18251D] font-bold'
                : 'border-transparent text-[#778079] hover:text-[#18251D] hover:border-[#CBD3CE]'
            )}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  isActive ? 'bg-[#E9FBEA] text-[#064E24]' : 'bg-[#F0F1F3] text-[#778079]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

