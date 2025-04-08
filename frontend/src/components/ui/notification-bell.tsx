import { useState, useEffect } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { config } from '@/config';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  message: string;
  task_id: number | null;
  vacancy_id: number | null;
  created_at: string;
  is_read: boolean;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Функция для загрузки уведомлений
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${config.apiUrl}/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Отмечаем уведомление как прочитанное
  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${config.apiUrl}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Обновляем список уведомлений
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Отмечаем все уведомления как прочитанные
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${config.apiUrl}/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark all notifications as read');

      // Очищаем список уведомлений
      setNotifications([]);
      toast.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Ошибка при отметке уведомлений как прочитанные');
    }
  };

  // Получаем URL для навигации по уведомлению о вакансии
  const getVacancyNotificationUrl = (notification: Notification) => {
    if (notification.vacancy_id) {
      return `/dashboard/vacancies?highlight=${notification.vacancy_id}`;
    }
    return null;
  };

  // Функция для обработки клика по уведомлению
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setShowNotifications(false); // Закрываем dropdown

    if (notification.task_id) {
      // Переходим на страницу календаря с параметром для открытия задачи
      router.push(`/dashboard/calendar?openTask=${notification.task_id}`);
    }
    // Для вакансий используется Link, переход происходит автоматически
  };

  // Загружаем уведомления при монтировании компонента
  useEffect(() => {
    fetchNotifications();

    // Настраиваем интервал для периодической проверки уведомлений
    const interval = setInterval(fetchNotifications, 60000); // Проверяем каждую минуту

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Кнопка-колокольчик */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-white rounded-full hover:bg-slate-700 transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Выпадающий список уведомлений */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
          <div className="p-2 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-white font-medium">Уведомления</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Отметить все как прочитанные
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-gray-400">Загрузка...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">Нет новых уведомлений</div>
            ) : (
              <ul>
                {notifications.map((notification) => {
                  const vacancyUrl = getVacancyNotificationUrl(notification);
                  const isTaskNotification = !!notification.task_id;

                  const notificationContent = (
                    <>
                      <p className="text-white text-sm mb-1">{notification.message}</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(notification.created_at).toLocaleString('ru-RU')}
                      </p>
                    </>
                  );

                  return (
                    <li key={notification.id} className="border-b border-slate-700 last:border-b-0">
                      <div className="p-3 hover:bg-slate-700 transition-colors flex justify-between items-start">
                        {isTaskNotification ? (
                          // Для задач - кликабельный div, вызывающий переход
                          <div className="flex-grow cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                            {notificationContent}
                          </div>
                        ) : vacancyUrl ? (
                          // Для вакансий - Link
                          <Link href={vacancyUrl} className="flex-grow cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                            {notificationContent}
                          </Link>
                        ) : (
                          // Для других уведомлений - просто div
                          <div className="flex-grow">
                            {notificationContent}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Предотвращаем клик по родительскому элементу
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-slate-600 ml-2"
                          title="Отметить как прочитанное"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 