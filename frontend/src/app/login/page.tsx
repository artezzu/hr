'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        
        // Получаем информацию о пользователе
        const userResponse = await fetch(`${config.apiUrl}/users/me/`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('user_name', userData.full_name);
        }

        router.push('/dashboard/applications');
      } else {
        setError(data.detail || 'Failed to login');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
      <div className="animated-background" />
      
      <div className="max-w-md w-full space-y-8 glass-card rounded-xl p-10 relative z-10 fade-in-up">
        <div className="text-center space-y-2">
          <h1 className="text-2xl tracking-wider font-light mb-1 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400 uppercase fade-in">
            abstract
          </h1>
          <div className="h-px w-8 bg-gradient-to-r from-violet-400 to-indigo-400 mx-auto fade-in-delay"></div>
          <p className="text-gray-400 text-sm tracking-widest uppercase fade-in-delay-2">HR Platform</p>
        </div>

        <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div className="fade-in-delay-3">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="login-input appearance-none rounded-lg relative block w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="fade-in-delay-4">
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="login-input appearance-none rounded-lg relative block w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent sm:text-sm"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-400/10 p-4 fade-in">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="fade-in-delay-5">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 