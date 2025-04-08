'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { config } from '@/config';
import { toast } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  UserIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  telegram_id?: string;
}

interface Application {
  id: number;
  full_name: string;
  email: string;
  telegram_chat_id: string;
  status: string;
}

interface BroadcastHistory {
  id: number;
  message: string;
  status: string;
  recipients_count: number;
  confirmed_count: number;
  created_at: string;
  sender_id: number;
}

export default function BroadcastsPage() {
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectByStatus, setSelectByStatus] = useState(false);
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, isAdmin } = useAuth();
  
  useEffect(() => {
    fetchUsers();
    fetchBroadcastHistory();
  }, []);
  
  // Получение списка пользователей
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Вместо запроса пользователей, запрашиваем заявки с телеграм_chat_id
      const response = await fetch(`${config.apiUrl}/applications/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Фильтруем только заявки с Telegram chat ID
        const applicationsWithTelegram = data.filter((app: Application) => app.telegram_chat_id);
        setUsers(applicationsWithTelegram.map((app: Application) => ({
          id: app.id,
          email: app.email,
          full_name: app.full_name,
          role: 'candidate',
          telegram_id: app.telegram_chat_id
        })));
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      toast.error('Не удалось загрузить список пользователей');
    }
  };
  
  // Функция для загрузки истории рассылок
  const fetchBroadcastHistory = async () => {
    if (!isAdmin) return;
    
    try {
      setIsLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/telegram/broadcasts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBroadcasts(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке истории рассылок:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Получение отформатированной даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };
  
  // Функция для получения названия статуса на русском
  const getStatusName = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Выполнено';
      case 'processing':
        return 'В процессе';
      case 'failed':
        return 'Ошибка';
      case 'pending':
        return 'Ожидание';
      default:
        return status;
    }
  };
  
  // Выбор всех пользователей
  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
    setSelectByStatus(false);
  };
  
  // Очистка выбора
  const clearSelection = () => {
    setSelectedUsers([]);
    setSelectByStatus(false);
    setStatus('');
  };
  
  // Выбор пользователей по статусу
  const handleSelectByStatus = (selectedStatus: string) => {
    setStatus(selectedStatus);
    setSelectByStatus(true);
    // При выборе по статусу очищаем индивидуальный выбор
    setSelectedUsers([]);
  };
  
  // Переключение выбора пользователя
  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
    
    // При индивидуальном выборе отключаем выбор по статусу
    setSelectByStatus(false);
  };
  
  // Отправка сообщения
  const sendBroadcast = async () => {
    if (!message.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }
    
    if (selectByStatus && !status) {
      toast.error('Выберите статус для отправки');
      return;
    }
    
    if (!selectByStatus && selectedUsers.length === 0) {
      toast.error('Выберите получателей сообщения');
      return;
    }
    
    try {
      setIsSending(true);
      const token = localStorage.getItem('token');
      
      const requestBody = {
        message,
        ...(selectByStatus 
          ? { status } 
          : { user_ids: selectedUsers })
      };
      
      const response = await fetch(`${config.apiUrl}/telegram/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        toast.success('Сообщение успешно отправлено');
        setMessage('');
        
        // Обновляем историю рассылок
        fetchBroadcastHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Не удалось отправить сообщение');
      }
    } catch (error) {
      console.error('Ошибка при отправке рассылки:', error);
      toast.error('Произошла ошибка при отправке сообщения');
    } finally {
      setIsSending(false);
    }
  };
  
  // Если пользователь не админ, показываем сообщение об ограничении доступа
  if (!isAdmin) {
    return (
      <div className="p-6 glass-card rounded-lg">
        <h1 className="text-2xl font-bold mb-4 text-white">Управление рассылками</h1>
        <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/50">
          <p className="text-white">Доступ к этой странице ограничен. Только администраторы могут управлять рассылками.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 fade-in">
      <div className="glass-card rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2 text-white">Управление рассылками в Telegram</h1>
        <p className="text-gray-300 mb-4">
          Отправляйте сообщения отдельным пользователям или группам по статусу
        </p>
        
        {/* Форма создания рассылки */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PaperAirplaneIcon className="h-5 w-5" />
              Создать рассылку
            </h2>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                Текст сообщения
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-md bg-gray-800 text-white border border-gray-700 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Введите текст сообщения для отправки..."
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={sendBroadcast}
                disabled={isSending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                {isSending ? 'Отправка...' : 'Отправить сообщение'}
              </button>
              
              <button
                onClick={() => setMessage('')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Очистить
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Выбор получателей
            </h2>
            
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={selectAllUsers}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  !selectByStatus && selectedUsers.length === users.length
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Все кандидаты
              </button>
              
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                Очистить
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Выбрать кандидатов по статусу
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSelectByStatus('Новый')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Новый'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Новые
                </button>
                <button
                  onClick={() => handleSelectByStatus('Телефонное интервью')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Телефонное интервью'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Телефонное интервью
                </button>
                <button
                  onClick={() => handleSelectByStatus('Собеседование')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Собеседование'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Собеседование
                </button>
                <button
                  onClick={() => handleSelectByStatus('СБ')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'СБ'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  СБ
                </button>
                <button
                  onClick={() => handleSelectByStatus('Оффер')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Оффер'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Оффер
                </button>
                <button
                  onClick={() => handleSelectByStatus('Сбор документов')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Сбор документов'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Сбор документов
                </button>
                <button
                  onClick={() => handleSelectByStatus('Принят на работу')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Принят на работу'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Нанятые
                </button>
                <button
                  onClick={() => handleSelectByStatus('Резерв')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Резерв'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Резерв
                </button>
                <button
                  onClick={() => handleSelectByStatus('Отказ')}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    selectByStatus && status === 'Отказ'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Отказ
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Или выберите кандидатов индивидуально:
              </label>
              <div className="bg-gray-800 rounded-md border border-gray-700 mb-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по имени или фамилии..."
                  className="w-full px-3 py-2 bg-gray-800 text-white border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-md"
                />
              </div>
              
              {searchTerm.length > 0 && (
                <div className="bg-gray-800 rounded-md border border-gray-700 max-h-60 overflow-y-auto p-2 mt-2">
                  {users.length > 0 ? (
                    users
                      .filter(user => 
                        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(user => (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)}
                          className={`px-3 py-2 rounded-md mb-1 cursor-pointer flex items-center justify-between ${
                            selectedUsers.includes(user.id)
                              ? 'bg-indigo-900/60 border border-indigo-500/50'
                              : 'hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-white">{user.full_name || user.email}</span>
                          </div>
                          {selectedUsers.includes(user.id) && (
                            <CheckCircleIcon className="h-5 w-5 text-indigo-400" />
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-400 text-center py-2">
                      Нет кандидатов с подключенным Telegram
                    </p>
                  )}
                  {users.length > 0 && 
                    users.filter(user => 
                      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                    <p className="text-gray-400 text-center py-2">
                      По запросу "{searchTerm}" ничего не найдено
                    </p>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-400 mt-1">
                Всего выбрано: {selectByStatus ? 'По статусу' : selectedUsers.length} кандидатов
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Секция с историей рассылок */}
      <div className="glass-card rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">История рассылок</h2>
        
        {isLoadingHistory ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Загрузка истории рассылок...</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <p className="text-gray-400 italic">
            История рассылок пуста. Отправьте сообщение, чтобы оно появилось здесь.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2 text-left text-gray-300">Дата</th>
                    <th className="px-4 py-2 text-left text-gray-300">Сообщение</th>
                    <th className="px-4 py-2 text-left text-gray-300">Статус</th>
                    <th className="px-4 py-2 text-right text-gray-300">Получателей</th>
                    <th className="px-4 py-2 text-right text-gray-300">Подтверждено</th>
                    <th className="px-4 py-2 text-center text-gray-300">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.map(broadcast => (
                    <tr key={broadcast.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-white">
                        {formatDate(broadcast.created_at)}
                      </td>
                      <td className="px-4 py-3 text-white max-w-md">
                        <div className="line-clamp-2">{broadcast.message}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(broadcast.status)}`}>
                          {getStatusName(broadcast.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white text-right">
                        {broadcast.recipients_count}
                      </td>
                      <td className="px-4 py-3 text-white text-right">
                        <span className="text-green-400 font-medium">
                          {broadcast.confirmed_count} / {broadcast.recipients_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => window.open(`${config.apiUrl}/telegram/broadcasts/${broadcast.id}/confirmations`, '_blank')}
                          className="text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 