import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'dark' = inside dark sidebar, 'light' = on light page
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'dark',
  showText = true,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Geometric OneDesk Brandmark: Isometric multi-tier workspace blocks with lime core */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Base Diamond Tier - Deep Forest */}
          <path
            d="M18 3L32 10.5V25.5L18 33L4 25.5V10.5L18 3Z"
            fill={isDark ? '#06351F' : '#082F1B'}
            stroke={isDark ? '#14482E' : '#12452C'}
            strokeWidth="1.5"
          />
          {/* Inner Layer 1 - Forest Hover */}
          <path
            d="M18 7.5L28 13V23L18 28.5L8 23V13L18 7.5Z"
            fill={isDark ? '#12452C' : '#175235'}
          />
          {/* Central Active Node - Vibrant Electric Lime */}
          <rect
            x="13"
            y="13"
            width="10"
            height="10"
            rx="2.5"
            transform="rotate(45 18 18)"
            fill="#20E34A"
          />
          {/* Inner Core Spark */}
          <circle cx="18" cy="18" r="2" fill="#06351F" />
        </svg>
      </div>

      {showText && (
        <span className={`flex items-center leading-none ${textSizes[size]}`}>
          <span className={isDark ? 'text-white font-extrabold' : 'text-[#082F1B] font-extrabold'}>
            One
          </span>
          <span className={isDark ? 'text-[#D2DFD7] font-semibold' : 'text-[#18251D] font-semibold'}>
            Desk
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#20E34A] ml-1 self-end mb-1" />
        </span>
      )}
    </div>
  );
};

