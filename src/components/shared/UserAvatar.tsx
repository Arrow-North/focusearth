import React from 'react';
import { cn } from '@/lib/utils';
import { getInitials, getUserTypeColor } from '@/lib/formatters';
import { colorMap } from '@/lib/constants';
import type { UserType } from '@/types/database';

export interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  userType?: UserType | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function UserAvatar({
  firstName,
  lastName,
  userType,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const colorName = getUserTypeColor(userType);
  const bgClass = colorMap[colorName] ?? 'bg-muted';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white select-none',
        sizeClasses[size],
        bgClass,
        className,
      )}
      aria-label={`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'User avatar'}
    >
      {initials}
    </div>
  );
}
