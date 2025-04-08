import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '../config';

// Интерфейс пользователя
interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  position?: string | null;
}

// Интерфейс контекста аутентификации
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  logout: () => void;
  isAdmin: () => boolean;
  isRecruiter: () => boolean;
  hasManagerAccess: () => boolean;
  hasRole: (role: string) => boolean;
}

// Создаем контекст
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Провайдер аутентификации
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Загрузка данных пользователя при инициализации
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/users/me/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Loaded user data:', userData);
          setUser(userData);
        } else {
          // Если токен недействителен, удаляем его
          if (response.status === 401) {
            localStorage.removeItem('token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Функция входа в систему
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${config.apiUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        
        // После успешной авторизации получаем данные пользователя
        const userResponse = await fetch(`${config.apiUrl}/users/me/`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data after login:', userData);
          setUser(userData);
          return { success: true };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Ошибка авторизации' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Ошибка сети при входе в систему' };
    }
    
    return { success: false, error: 'Неизвестная ошибка при авторизации' };
  };

  // Функция выхода из системы
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  // Проверка роли пользователя
  const hasRole = (role: string) => {
    return user?.role === role;
  };

  // Проверка, является ли пользователь администратором
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Проверка, является ли пользователь рекрутером
  const isRecruiter = () => {
    return hasRole('recruiter');
  };

  // Проверка, имеет ли пользователь доступ к управлению (admin или manager)
  const hasManagerAccess = () => {
    return ['admin', 'manager'].includes(user?.role || '');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout,
      isAdmin,
      isRecruiter,
      hasManagerAccess,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста аутентификации
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 