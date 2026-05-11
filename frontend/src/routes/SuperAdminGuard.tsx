import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function SuperAdminGuard() {
  const user = useAuthStore((s) => s.user);

  // AdminShell handles unauthenticated state; this guard only checks role.
  if (!user) return null;

  if (user.role !== 'superadmin') {
    sessionStorage.setItem('storyuu.admin_notice', "You don't have permission to access that page.");
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
