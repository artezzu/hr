import { useEffect } from 'react';
import { config } from '@/config';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  message: string;
  task_id: number | null;
  vacancy_id: number | null;
  created_at: string;
  is_read: boolean;
}

export default function NotificationListener() {
  const router = useRouter();

  // Функция для проверки новых уведомлений
  const checkForNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${config.apiUrl}/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const notifications = await response.json();
      
      // Показываем новые уведомления как тосты
      notifications.forEach((notification: Notification) => {
        // Проверяем, не показывали ли мы уже это уведомление
        const shownKey = `notification_shown_${notification.id}`;
        const alreadyShown = localStorage.getItem(shownKey);
        
        if (!alreadyShown) {
          // Создаем ID для тоста
          const toastId = `notification-${notification.id}`;
          
          // Определяем, есть ли связанная вакансия или задача
          const hasRelatedItem = notification.vacancy_id || notification.task_id;
          
          // Показываем уведомление
          toast(
            <div>
              <p>{notification.message}</p>
              <div className="mt-2 flex gap-2">
                <button 
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                  onClick={() => {
                    markAsRead(notification.id);
                    toast.dismiss(toastId);
                  }}
                >
                  Отметить прочитанным
                </button>
                {hasRelatedItem && (
                  <button
                    className="px-2 py-1 bg-indigo-500 text-white text-xs rounded"
                    onClick={() => {
                      markAsRead(notification.id);
                      toast.dismiss(toastId);
                      
                      // Перенаправляем на соответствующую страницу
                      if (notification.vacancy_id) {
                        router.push('/dashboard/vacancies');
                      } else if (notification.task_id) {
                        router.push('/dashboard/tasks');
                      }
                    }}
                  >
                    Перейти
                  </button>
                )}
              </div>
            </div>,
            {
              duration: 10000,
              icon: notification.vacancy_id ? '💼' : '⏰',
              id: toastId
            }
          );
          
          // Отмечаем, что это уведомление уже показано
          localStorage.setItem(shownKey, 'true');
        }
      });
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  };

  // Отмечаем уведомление как прочитанное
  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${config.apiUrl}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Настраиваем периодическую проверку уведомлений
  useEffect(() => {
    // Проверяем уведомления сразу при загрузке
    checkForNotifications();
    
    // Проверяем каждые 30 секунд
    const interval = setInterval(checkForNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Компонент не отображает никакого UI
  return null;
} 