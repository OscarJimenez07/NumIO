import { Navigate } from 'react-router-dom';
import { Role, useAuthStore } from '@/lib/auth';

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
