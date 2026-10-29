'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/lib/types';

export interface AvatarProps {
  user?: UserProfile;
  initials?: string;
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showStatus?: boolean;
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  initials: propInitials,
  name: propName,
  src: propSrc,
  size = 'md',
  showStatus = false,
  status: propStatus,
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  const name = propName || user?.name || '';
  const src = propSrc || user?.avatarUrl;
  const status = propStatus || user?.status || 'offline';

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials =
    propInitials ||
    user?.initials ||
    (name
      ? name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'U');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
  };

  const statusColors = {
    online: 'bg-[#20E34A]',
    busy: 'bg-rose-500',
    away: 'bg-amber-400',
    offline: 'bg-slate-400',
  };

  // Deterministic color generator for initials background
  const getBgColor = (seed: string) => {
    const colors = [
      'bg-emerald-900 text-emerald-100',
      'bg-teal-900 text-teal-100',
      'bg-slate-800 text-slate-100',
      'bg-emerald-800 text-lime-200',
      'bg-[#06351F] text-[#20E34A]',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const hasValidImage = Boolean(src) && !imageError;

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      <div
        className={cn(
          'flex items-center justify-center font-bold rounded-full overflow-hidden border border-white/60 shadow-xs',
          sizeClasses[size],
          !hasValidImage && getBgColor(name || initials)
        )}
      >
        {hasValidImage ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            size === 'xs'
              ? 'w-1.5 h-1.5'
              : size === 'sm'
              ? 'w-2 h-2'
              : size === 'md'
              ? 'w-2.5 h-2.5'
              : 'w-3.5 h-3.5',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

// Universal export as required by Section 3 of user specification
export const UserAvatar = Avatar;

export interface AvatarGroupProps {
  users: UserProfile[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 4,
  size = 'sm',
  className,
}) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] -ml-1.5',
    sm: 'w-7 h-7 text-xs -ml-2',
    md: 'w-9 h-9 text-sm -ml-2.5',
  };

  return (
    <div className={cn('flex items-center pl-2', className)}>
      {visibleUsers.map((u, i) => (
        <div key={u.id || i} className={sizeClasses[size]} title={`${u.name} (${u.role})`}>
          <UserAvatar user={u} size={size} className="ring-2 ring-white" />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center font-medium rounded-full bg-[#E5E9E6] text-[#5E6962] ring-2 ring-white',
            sizeClasses[size]
          )}
          title={`${remainingCount} more members`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
