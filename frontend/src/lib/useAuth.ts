import { useState, useEffect } from 'react';

interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем данные пользователя из localStorage
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    const role = localStorage.getItem('user_role') || 'user';
    
    if (token && email && name) {
      // У нас есть минимальные данные о пользователе
      setUser({
        id: 0, // ID мы не храним в localStorage
        email,
        full_name: name,
        role
      });
    }
    
    setLoading(false);
  }, []);

  // Проверка, является ли пользователь администратором
  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  // Проверка, является ли пользователь руководителем
  const isManager = (): boolean => {
    return user?.role === 'manager';
  };

  // Проверка, является ли пользователь рекрутером
  const isRecruiter = (): boolean => {
    return user?.role === 'recruiter';
  };

  // Проверка, имеет ли пользователь доступ к административным функциям
  const hasManagerAccess = (): boolean => {
    return isAdmin() || isManager();
  };

  return {
    user,
    loading,
    isAdmin,
    isManager,
    isRecruiter,
    hasManagerAccess
  };
} 