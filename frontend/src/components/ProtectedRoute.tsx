'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiresAdmin?: boolean;
  requiresManager?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiresAdmin = false,
  requiresManager = false
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Проверка выполняется только когда загрузка завершена
    if (!loading) {
      if (!user) {
        // Пользователь не аутентифицирован, перенаправляем на страницу входа
        router.push('/login');
      } else if (requiresAdmin && !isAdmin()) {
        // Страница требует прав администратора
        router.push('/dashboard');
      } else if (requiresManager && !(isAdmin() || isManager())) {
        // Страница требует прав руководителя или выше
        router.push('/dashboard');
      }
    }
  }, [user, loading, requiresAdmin, requiresManager, router, isAdmin, isManager]);

  // Показываем заглушку во время загрузки или если нет прав
  if (loading || !user || (requiresAdmin && !isAdmin()) || (requiresManager && !(isAdmin() || isManager()))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1929]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 