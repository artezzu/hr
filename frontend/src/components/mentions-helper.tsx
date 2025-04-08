import React, { useState, useEffect } from 'react';
import { config } from '@/config';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface MentionsHelperProps {
  onSelectMention: (email: string) => void;
}

export default function MentionsHelper({ onSelectMention }: MentionsHelperProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Загружаем список пользователей при монтировании компонента
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${config.apiUrl}/users/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSelectUser = (email: string) => {
    onSelectMention(email);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center px-3 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        @Упомянуть
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm max-h-60 overflow-auto">
          {loading ? (
            <div className="py-2 px-3 text-gray-400">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="py-2 px-3 text-gray-400">Нет доступных пользователей</div>
          ) : (
            <ul>
              {users.map((user) => (
                <li
                  key={user.id}
                  className="text-gray-200 hover:bg-gray-700 hover:text-white cursor-pointer select-none relative py-2 pl-3 pr-9"
                  onClick={() => handleSelectUser(user.email)}
                >
                  <div className="flex items-center">
                    <span className="font-medium block truncate">{user.full_name}</span>
                    <span className="text-gray-400 ml-2 truncate">{user.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 