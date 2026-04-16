import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserType } from '@/types/database';

interface RoleGuardProps {
  allowedRoles: UserType[];
  children: React.ReactNode;
  fallback?: string;
}

export function RoleGuard({ allowedRoles, children, fallback = '/' }: RoleGuardProps) {
  const { userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!userType || !allowedRoles.includes(userType)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
