'use client';

import { useEffect, useState } from 'react';
import {
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Импортируем сервисы и типы из apiService
import { usersApi, tasksApi, User, Task } from '@/services/apiService';

// Тип для события
interface Event {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  // Состояния для хранения данных
  const [employees, setEmployees] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Функция для получения данных с сервера
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Получаем список сотрудников
        const employeesData = await usersApi.getAll();
        setEmployees(employeesData);

        // Получаем список активных задач
        const tasksData = await tasksApi.getByStatus('planned');
        
        // Для каждой задачи получаем имя исполнителя
        const tasksWithAssignees = tasksData.map(task => {
          if (task.assigned_to) {
            // Находим пользователя по ID из списка сотрудников
            const assignee = employeesData.find(
              (emp) => emp.id === task.assigned_to
            );
            return {
              ...task,
              // Добавляем поле с именем исполнителя
              assigned_user: assignee ? assignee.full_name : 'Неизвестный сотрудник'
            };
          }
          return task;
        });
        
        setTasks(tasksWithAssignees);

        // Получаем события сегодняшнего дня (используя задачи на сегодня)
        const today = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
        const todayTasks = await tasksApi.getByDate(today);
        
        // Преобразуем задачи на сегодня в события
        const todayEvents: Event[] = todayTasks.map((task) => ({
          id: task.id,
          type: 'Задача',
          description: task.title,
          timestamp: task.created_at,
        }));
        
        setEvents(todayEvents);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Проверьте соединение или перезагрузите страницу.');
        
        // В режиме разработки или при отсутствии реальных данных используем тестовые данные
        setEmployees([
          { id: 1, full_name: 'Иванов Иван', email: 'ivanov@example.com', position: 'Менеджер', role: 'user' },
          { id: 2, full_name: 'Петров Петр', email: 'petrov@example.com', position: 'Разработчик', role: 'user' },
          { id: 3, full_name: 'Сидорова Анна', email: 'sidorova@example.com', position: 'Дизайнер', role: 'user' },
        ]);
        
        // Тестовые задачи
        const mockTasks = [
          { id: 1, title: 'Создать дизайн главной страницы', description: 'Подготовить макет сайта', status: 'planned', date: '2023-10-25', assigned_to: 3, assigned_user: 'Сидорова Анна', time: null, created_by_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 2, title: 'Разработать API', description: 'Создать бэкенд для приложения', status: 'planned', date: '2023-10-25', assigned_to: 2, assigned_user: 'Петров Петр', time: null, created_by_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 3, title: 'Подготовить отчет', description: 'Отчет по квартальным результатам', status: 'planned', date: '2023-10-25', assigned_to: 1, assigned_user: 'Иванов Иван', time: null, created_by_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        setTasks(mockTasks);
        
        // Тестовые события
        setEvents([
          { id: 1, type: 'Задача', description: 'Создать дизайн главной страницы', timestamp: new Date().toISOString() },
          { id: 2, type: 'Задача', description: 'Разработать API', timestamp: new Date().toISOString() },
          { id: 3, type: 'Задача', description: 'Подготовить отчет', timestamp: new Date().toISOString() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Форматирование времени события
  const formatEventTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'HH:mm', { locale: ru });
    } catch (e) {
      return '00:00';
    }
  };

  // Статистика для показа на дашборде
  const stats = [
    { name: 'Всего сотрудников', value: employees.length.toString(), icon: UsersIcon },
    { name: 'Активные задачи', value: tasks.length.toString(), icon: DocumentTextIcon },
    { name: 'События сегодня', value: events.length.toString(), icon: CalendarIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="ml-3 text-gray-400">Загрузка данных...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Ошибка! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 shadow-sm ring-1 ring-gray-900/5 hover:bg-gray-700 transition-all duration-300"
          >
            <dt>
              <div className="absolute rounded-lg bg-indigo-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-300">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-gray-800 p-6 shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-lg font-medium leading-6 text-white">
            События сегодня
          </h3>
          <div className="mt-4 space-y-4">
            {events.length > 0 ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-4 rounded-lg bg-gray-700 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {event.type}: {event.description}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">{formatEventTime(event.timestamp)}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">Нет событий на сегодня</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-gray-800 p-6 shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-lg font-medium leading-6 text-white">
            Активные задачи
          </h3>
          <div className="mt-4 space-y-4">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-4 rounded-lg bg-gray-700 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {task.title}
                    </p>
                    <p className="truncate text-sm text-gray-400">
                      {task.description}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {(task as any).assigned_user ? `${(task as any).assigned_user}` : 'Не назначено'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">Нет активных задач</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 