'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, 
         addMonths, subMonths, parseISO, isEqual, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { config } from '@/config';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import MentionsHelper from '@/components/mentions-helper';
import { useRouter, useSearchParams } from 'next/navigation';

// Интерфейс для задачи
interface Task {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string; // Добавляем поле для времени
  status: 'planned' | 'completed' | 'canceled';
  created_at: string;
  updated_at: string;
  assigned_to?: number; // ID сотрудника
  created_by?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
  }; // Добавляем информацию о создателе
}

// Компонент Календарь
export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<number | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    status: 'planned'
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<{id: number, name: string, email?: string, role?: string} | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Получаем информацию о текущем пользователе из профиля
  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
  }, []);

  // useEffect для открытия задачи из URL
  useEffect(() => {
    if (!searchParams) return; // Добавим проверку на null

    const taskIdToOpen = searchParams.get('openTask');

    if (taskIdToOpen && tasks.length > 0) {
      const taskId = parseInt(taskIdToOpen, 10);
      const taskToOpen = tasks.find(task => task.id === taskId);

      if (taskToOpen) {
        console.log('[URL Effect] Opening task from URL parameter:', taskToOpen);
        openTaskDialog(taskToOpen); // Используем существующую функцию
        
        // Удаляем параметр из URL, чтобы окно не открывалось при обновлении
        const newPath = window.location.pathname;
        router.replace(newPath, { scroll: false }); 
      } else {
        console.log(`[URL Effect] Task with ID ${taskId} not found in loaded tasks.`);
      }
    } else if (taskIdToOpen) {
      console.log('[URL Effect] openTask parameter found, but tasks are not loaded yet.');
    }
  }, [searchParams, tasks, router]); // Зависим от searchParams, tasks и router

  // Получаем данные текущего пользователя из API
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Токен отсутствует');
        return;
      }
      
      const response = await fetch(`${config.apiUrl}/users/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const userData = await response.json();
      console.log('Получены данные пользователя от API:', userData);
      
      // Проверяем наличие поля full_name в ответе
      if (userData.full_name) {
        console.log('Найдено полное имя пользователя:', userData.full_name);
        
        // Приводим данные к нужному формату
        setCurrentUser({
          id: userData.id,
          name: userData.full_name, // Используем полное имя из API
          email: userData.email,
          role: userData.role || 'Пользователь'
        });
      } else {
        // Формируем полное имя из других доступных данных, если full_name не найден
        const fallbackName = userData.name || 
                          `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
                          userData.username || 
                          userData.email;
        
        console.log('Полное имя не найдено, используем запасной вариант:', fallbackName);
        
        // Приводим данные к нужному формату
        setCurrentUser({
          id: userData.id,
          name: fallbackName, // Используем запасной вариант
          email: userData.email,
          role: userData.role || userData.position || userData.job_title || 'Пользователь'
        });
      }
      
      console.log('Установлен текущий пользователь:', {
        id: userData.id,
        name: userData.full_name || 'не найдено',
        email: userData.email,
        role: userData.role || 'не найдено'
      });
    } catch (error) {
      console.error('Ошибка при получении профиля пользователя:', error);
      // Для демонстрации используем фиктивные данные только если API недоступен
      setCurrentUser({
        id: 1,
        name: 'Джамалов Бахтигуль', // Полное имя для демо
        email: 'dzhamalov@example.com',
        role: 'Директор'
      });
    }
  };

  // Получение задач с сервера
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.apiUrl}/tasks/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      console.log('Получены задачи с сервера:', data);
      
      // Обрабатываем полученные с сервера задачи
      const tasksWithDefaults = data.map((task: any) => {
        console.log('[fetchTasks] Raw task data from API:', JSON.stringify(task));
        const taskWithTime = { ...task, time: task.time || '00:00' };
        let creatorInfo = null;

        // 1. ПРОВЕРКА ПО ID СОЗДАТЕЛЯ (created_by_id)
        if (task.created_by_id && currentUser && task.created_by_id === currentUser.id) {
          console.log(`[fetchTasks] Task ${task.id} created by current user (ID match).`);
          creatorInfo = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role
          };
        }
        // 2. ПРОВЕРКА ПО ПОЛНОМУ ОБЪЕКТУ creator
        else if (task.creator) {
           console.log(`[fetchTasks] Task ${task.id} has full creator object.`);
           creatorInfo = {
            id: task.creator.id,
            name: task.creator.full_name || task.creator.name, // Предпочитаем full_name
            email: task.creator.email,
            role: task.creator.role
          };
        }
        // 3. ПРОВЕРКА ПО ОБЪЕКТУ created_by (если нет creator или created_by_id)
        else if (task.created_by && typeof task.created_by === 'object') {
          console.log(`[fetchTasks] Task ${task.id} has created_by object.`);
           creatorInfo = {
            id: task.created_by.id || 0, // Пытаемся взять ID, если есть
            name: task.created_by.name || `User (${task.created_by.email?.split('@')[0] || 'Unknown'})`,
            email: task.created_by.email,
            role: task.created_by.role
          };
           // Попытка уточнить, если email совпадает с текущим пользователем
           if (creatorInfo.email && currentUser && creatorInfo.email === currentUser.email) {
                console.log(`[fetchTasks] Task ${task.id} creator email matches current user.`);
                creatorInfo.id = currentUser.id;
                creatorInfo.name = currentUser.name;
                creatorInfo.role = currentUser.role;
           }
        }
        // 4. ПРОВЕРКА ПО EMAIL В created_by (если строка)
        else if (typeof task.created_by === 'string') {
            console.log(`[fetchTasks] Task ${task.id} has created_by string (email): ${task.created_by}`);
            if (currentUser && currentUser.email === task.created_by) {
                console.log(`[fetchTasks] Task ${task.id} created_by email matches current user.`);
                creatorInfo = {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role
                };
            } else {
                creatorInfo = { id: 0, name: `User (${task.created_by.split('@')[0]})`, email: task.created_by };
            }
        }
        // 5. ЗАПАСНОЙ ВАРИАНТ (если ничего не найдено)
        else {
          console.log(`[fetchTasks] Task ${task.id} creator info missing or invalid. Falling back.`);
          // Попробуем использовать текущего пользователя, если ID задачи указывает на него
          if (task.created_by_id && currentUser && task.created_by_id === currentUser.id) {
             creatorInfo = { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role };
          } else {
            creatorInfo = { id: task.created_by_id || 0, name: 'Неизвестный автор' };
          }
        }

        taskWithTime.created_by = creatorInfo;
        console.log('[fetchTasks] Mapped task:', JSON.stringify(taskWithTime));
        return taskWithTime;
      });
      
      console.log('Обработанные задачи:', tasksWithDefaults);
      setTasks(tasksWithDefaults);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Не удалось загрузить задачи');
      
      // Для демонстрации, если API недоступен
      generateMockTasks();
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация демонстрационных задач для тестирования
  const generateMockTasks = () => {
    // Используем текущий месяц для задач, чтобы они отображались в текущем календаре
    const currentMonth = new Date();
    
    // Убедимся, что у всех демо создателей есть и имя, и email
    const mockCreators = [
      {
        id: 1,
        name: 'Джамалов Бахтигуль',
        email: 'dzhamalov@example.com',
        role: 'Директор'
      },
      {
        id: 2,
        name: 'Михаил Петров',
        email: 'mikhail@example.com',
        role: 'Рекрутер'
      },
      {
        id: 3,
        name: 'Елена Иванова',
        email: 'elena@example.com',
        role: 'HR директор'
      }
    ];
    
    // Создаем копию текущего пользователя с обязательными полями email и role
    let currentUserForTask = null;
    if (currentUser) {
      currentUserForTask = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email || 'user@example.com',
        role: currentUser.role || 'Пользователь'
      };
    }
    
    const mockTasks: Task[] = [
      {
        id: 1,
        title: 'Собеседование с кандидатом',
        description: 'Провести собеседование с Иваном на должность разработчика',
        date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 4), 'yyyy-MM-dd'),
        time: '14:30',
        status: 'planned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: mockCreators[0]
      },
      {
        id: 2,
        title: 'Подготовить отчет',
        description: 'Ежемесячный отчет по рекрутменту',
        date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 9), 'yyyy-MM-dd'),
        time: '10:00',
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: mockCreators[1]
      },
      {
        id: 3,
        title: 'Встреча с кандидатом',
        description: 'Обсуждение квартальных KPI',
        date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 12), 'yyyy-MM-dd'),
        time: '11:30',
        status: 'planned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: mockCreators[2]
      },
      {
        id: 4,
        title: 'Еще одно',
        description: 'Описание задачи',
        date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 12), 'yyyy-MM-dd'),
        time: '00:00',
        status: 'planned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: currentUserForTask || mockCreators[0]
      },
      {
        id: 5,
        title: 'Третье',
        description: 'Описание задачи',
        date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 12), 'yyyy-MM-dd'),
        time: '00:00',
        status: 'planned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: mockCreators[1]
      }
    ];
    
    setTasks(mockTasks);
  };

  // Функция для добавления дней к дате (используется для демо-данных)
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
  };

  // Функция которая форматирует имя пользователя для отображения
  const formatUserName = (user: {id: number, name?: string, email?: string, role?: string} | undefined | null) => {
    if (!user) {
      return 'Система';
    }
    
    // Приоритет: имя из объекта > имя текущего пользователя (если совпадают email) > имя из email
    
    // Если это текущий пользователь - подставляем его имя
    if (currentUser && user.id === currentUser.id) {
      return currentUser.name;
    }
    
    // Если есть имя в объекте и оно не совпадает с email, используем его
    if (user.name && user.email && user.name !== user.email) {
      return user.name;
    }
    
    // Если это email текущего пользователя, используем его имя из профиля
    if (user.email && currentUser && user.email === currentUser.email) {
      return currentUser.name || 'Вы';
    }
    
    // Если есть только email, форматируем его в более читаемое имя
    if (user.email && (!user.name || user.name === user.email)) {
      const emailName = user.email.split('@')[0];
      // Преобразуем первую букву в верхний регистр и заменяем точки на пробелы
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/\./g, ' ');
    }
    
    // В крайнем случае возвращаем имя или "Неизвестный пользователь"
    return user.name || 'Неизвестный пользователь';
  };

  // Функция для отображения должности пользователя
  const getUserRole = (user: {id: number, name: string, email?: string, role?: string} | undefined | null) => {
    if (!user || !user.role) {
      return currentUser?.role || 'Пользователь';
    }
    return user.role;
  };

  // Функция которая определяет, является ли текущий пользователь создателем задачи
  const isTaskCreator = (task: Task) => {
    if (!currentUser || !task.created_by) return false;
    
    // Сравниваем по ID, если есть
    if (task.created_by.id === currentUser.id) return true;
    
    // Если ID не совпадают, проверяем email
    if (task.created_by.email && currentUser.email && 
        task.created_by.email.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    
    return false;
  };

  const saveTask = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Если нет информации о текущем пользователе, показываем ошибку
      if (!currentUser) {
        toast.error('Не удалось определить текущего пользователя');
        setIsLoading(false);
        return;
      }
      
      // Если задача новая, всегда добавляем информацию о создателе
      let taskToSave;
      
      if (selectedTask) {
        // Если редактируем существующую задачу
        taskToSave = { 
          ...selectedTask, 
          ...newTask,
          // Используем id текущего пользователя вместо объекта
          created_by_id: currentUser.id
        };
        
        // Удаляем старое поле created_by, так как оно больше не используется
        if ('created_by' in taskToSave) {
          delete taskToSave.created_by;
        }
      } else {
        // Для новой задачи всегда указываем текущего пользователя как создателя
        taskToSave = {
          ...newTask,
          // Используем id текущего пользователя вместо объекта
          created_by_id: currentUser.id
        };
        
        // Удаляем старое поле created_by, если оно есть
        if ('created_by' in taskToSave) {
          delete taskToSave.created_by;
        }
      }
      
      console.log('Задача для сохранения:', taskToSave);
      
      const url = selectedTask 
        ? `${config.apiUrl}/tasks/${selectedTask.id}/` 
        : `${config.apiUrl}/tasks/`;
        
      const method = selectedTask ? 'PUT' : 'POST';
      
      // Преобразуем данные в строку JSON для проверки перед отправкой
      const jsonData = JSON.stringify(taskToSave);
      console.log('JSON для отправки:', jsonData);
      
      let response;
      
      // Отправляем данные на сервер
      response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: jsonData
      });
      
      if (!response.ok) throw new Error('Failed to save task');
      
      let savedTask = await response.json();
      console.log('Ответ сервера:', savedTask);
      
      // Если в ответе нет информации о создателе, добавляем ее
      if (!savedTask.creator && currentUser) {
        savedTask.creator = {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email || 'user@example.com',
          role: currentUser.role || 'Пользователь'
        };
      }
      
      // Обратная совместимость со старым форматом API
      if (savedTask.creator && !savedTask.created_by) {
        savedTask.created_by = {
          id: savedTask.creator.id,
          name: savedTask.creator.full_name || savedTask.creator.name,
          email: savedTask.creator.email,
          role: savedTask.creator.role
        };
      }
      
      console.log('Задача после обработки:', savedTask);
      
      if (selectedTask) {
        // Обновляем задачу в списке
        setTasks(tasks.map(task => 
          task.id === savedTask.id ? savedTask : task
        ));
      } else {
        // Добавляем новую задачу в список
        setTasks([...tasks, savedTask]);
      }
      
      // Сбрасываем форму и закрываем диалог
      setNewTask({
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        status: 'planned'
      });
      setIsNewTaskDialogOpen(false);
      setIsTaskDialogOpen(false);
      
      toast.success(selectedTask ? 'Задача обновлена' : 'Задача создана');
      
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Не удалось сохранить задачу');
      
      // Для демонстрационных целей можно добавить фиктивную логику сохранения
      if (!selectedTask) {
        // Создаем новую задачу с текущим пользователем в качестве создателя
        const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        const currentDate = new Date().toISOString();
        
        // Убедимся, что у задачи есть created_by с полным именем
        let creator = null;
        if (currentUser) {
          creator = {
            id: currentUser.id,
            name: currentUser.name, // Полное имя из профиля
            email: currentUser.email || 'user@example.com',
            role: currentUser.role || 'Пользователь'
          };
        }
        
        const demoTask: Task = {
          id: newId,
          ...newTask,
          created_at: currentDate,
          updated_at: currentDate,
          created_by: creator
        } as Task;
        
        setTasks([...tasks, demoTask]);
        
        // Сбрасываем форму и закрываем диалог
        setNewTask({
          title: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          status: 'planned'
        });
        setIsNewTaskDialogOpen(false);
        
        toast.success('Задача создана (демо-режим)');
      } else {
        // Обновляем существующую задачу
        const updatedTask = {
          ...selectedTask,
          ...newTask,
          updated_at: new Date().toISOString()
        };
        
        setTasks(tasks.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        ));
        
        setIsTaskDialogOpen(false);
        setIsNewTaskDialogOpen(false);
        
        toast.success('Задача обновлена (демо-режим)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.apiUrl}/tasks/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      // Удаляем задачу из списка
      setTasks(tasks.filter(task => task.id !== id));
      setIsTaskDialogOpen(false);
      
    } catch (error) {
      console.error('Error deleting task:', error);
      // Демо-логика для примера
      setTasks(tasks.filter(task => task.id !== id));
      setIsTaskDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Функции для навигации по календарю
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Получаем задачи для конкретной даты с учетом фильтра по создателю
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (creatorFilter ? filteredTasks : tasks)
      .filter(task => task.date === dateStr)
      .sort((a, b) => {
        // Сортируем по времени (если оно есть)
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1; // Задачи с временем идут сначала
        if (b.time) return 1;
        return 0;
      });
  };

  // Применяем фильтр по создателю
  useEffect(() => {
    console.log('[Filter Effect] Applying filter. CreatorFilter:', creatorFilter, 'CurrentUser ID:', currentUser?.id);
    if (creatorFilter === null) {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(task => {
        console.log('[Filter Check] Task ID:', task.id, 'Task Creator ID:', task.created_by?.id, 'Filter ID:', creatorFilter, 'Match:', task.created_by?.id === creatorFilter);
        return task.created_by?.id === creatorFilter;
      });
      setFilteredTasks(filtered);
    }
  }, [tasks, creatorFilter, currentUser]);

  // Получаем список уникальных создателей для фильтра
  const getUniqueCreators = () => {
    const creators = tasks
      .filter(task => task.created_by)
      .map(task => task.created_by!)
      .reduce((acc, creator) => {
        if (!acc.some(c => c.id === creator.id)) {
          acc.push(creator);
        }
        return acc;
      }, [] as {id: number, name: string, email?: string}[]);
    
    return creators;
  };

  // Открывает диалог для новой задачи на выбранную дату
  const openNewTaskDialog = (date: Date) => {
    setSelectedDate(date);
    setNewTask({
      title: '',
      description: '',
      date: format(date, 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'), // Устанавливаем текущее время
      status: 'planned'
    });
    setSelectedTask(null);
    setIsNewTaskDialogOpen(true);
  };

  // Открывает диалог для просмотра/редактирования существующей задачи
  const openTaskDialog = (task: Task) => {
    console.log('[openTaskDialog] Opening task:', task);
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  // Закрытие диалога задачи
  const closeTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
  };

  // Закрытие диалога новой задачи
  const closeNewTaskDialog = () => {
    setIsNewTaskDialogOpen(false);
    // Сброс формы новой задачи
    setNewTask({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      status: 'planned'
    });
  };

  // Отображение календаря
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = getStartOfWeek(monthStart);
    const endDate = getEndOfWeek(monthEnd);
    
    const dateFormat = 'd';
    const dayFormat = 'EEEEEE';
    const monthFormat = 'LLLL yyyy';
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Заголовок с названием месяца и кнопками навигации
    const monthTitle = (
      <div className="mb-2 flex items-center justify-between">
        <button 
          className="flex items-center justify-center p-1 rounded-full text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          onClick={prevMonth}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="sr-only">Предыдущий месяц</span>
        </button>
        
        <h2 className="text-lg font-semibold text-white">
          {capitalize(format(currentMonth, monthFormat, { locale: ru }))}
        </h2>
        
        <button 
          className="flex items-center justify-center p-1 rounded-full text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          onClick={nextMonth}
        >
          <ChevronRightIcon className="h-4 w-4" />
          <span className="sr-only">Следующий месяц</span>
        </button>
      </div>
    );
    
    // Названия дней недели
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    const weekDays = (
      <div className="grid grid-cols-7 border-b border-slate-700 mb-1 pb-1">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center py-1 text-slate-400 text-xs font-medium">
            {day}
          </div>
        ))}
      </div>
    );
    
    // Функция для разбивки массива на чанки (недели)
    const chunk = (arr: Date[], size: number) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      );
    };
    
    // Разбиваем дни на недели
    const weeks = chunk(days, 7);
    
    // Рендерим календарь
    const calendar = (
      <div>
        {weekDays}
        <div className="space-y-0.5">
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-0.5">
              {week.map((day, j) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                
                // Определяем основной статус дня для планки-индикатора
                let statusIndicator = '';
                if (dayTasks.length > 0) {
                  // Приоритеты: запланировано > выполнено > отменено
                  if (dayTasks.some(task => task.status === 'planned')) {
                    statusIndicator = 'border-l-4 border-l-blue-500';
                  } else if (dayTasks.some(task => task.status === 'completed')) {
                    statusIndicator = 'border-l-4 border-l-green-500';
                  } else if (dayTasks.some(task => task.status === 'canceled')) {
                    statusIndicator = 'border-l-4 border-l-red-500';
                  }
                }
                
                return (
                  <div
                    key={j}
                    className={`
                      min-h-[80px] p-0.5 rounded border relative cursor-pointer
                      transition-all duration-200 hover:shadow-md
                      ${isCurrentMonth ? 'opacity-100' : 'opacity-50'}
                      ${isCurrentDay ? 'border-blue-500 ring-1 ring-blue-400 ring-opacity-50' : 'border-slate-700'}
                      ${dayTasks.length > 0 ? 'bg-slate-800/60' : 'bg-slate-900/30'}
                      ${isCurrentMonth ? 'hover:bg-slate-800' : 'hover:bg-slate-900'}
                      ${statusIndicator}
                    `}
                    onClick={() => openNewTaskDialog(day)}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`
                        font-medium px-1 py-0.5 text-xs rounded
                        ${isCurrentDay ? 'bg-blue-600 text-white' : 'text-gray-300'}
                      `}>
                        {format(day, dateFormat)}
                      </div>
                      
                      {isCurrentMonth && (
                        <button 
                          className="p-0.5 rounded-full bg-slate-700 hover:bg-blue-600 text-white transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewTaskDialog(day);
                          }}
                        >
                          <PlusIcon className="h-2 w-2" />
                          <span className="sr-only">Добавить задачу</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Индикатор активного фильтра, если день пуст */}
                    {creatorFilter !== null && dayTasks.length === 0 && 
                     tasks.some(task => task.date === format(day, 'yyyy-MM-dd')) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                        <div className="text-[8px] text-slate-400 px-1 py-0.5 bg-slate-800/80 rounded max-w-[90%] text-center">
                          Нет задач от выбранного автора
                        </div>
                      </div>
                    )}
                    
                    {/* Список задач на этот день */}
                    <div className="mt-1 space-y-0.5 overflow-y-auto max-h-[60px] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500">
                      {dayTasks.map((task) => {
                        // Определяем цвет статуса задачи
                        const statusColor = 
                          task.status === 'completed' ? 'bg-green-600/50 border-l-2 border-green-500 text-green-100' :
                          task.status === 'canceled' ? 'bg-red-600/50 border-l-2 border-red-500 text-red-100' :
                          'bg-blue-600/50 border-l-2 border-blue-500 text-blue-100';
                        
                        return (
                          <div
                            key={task.id}
                            className={`
                              text-[10px] p-0.5 pl-1.5 rounded truncate cursor-pointer relative
                              ${statusColor}
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDialog(task);
                            }}
                          >
                            {/* Главная строка с временем и названием */}
                            <div className="flex items-center w-full">
                              {task.time && task.time !== '00:00' && (
                                <span className="mr-1 font-semibold whitespace-nowrap">{task.time}</span>
                              )}
                              <span className="truncate max-w-[70%]">{task.title}</span>
                            </div>
                            
                            {/* Вторая строка с создателем */}
                            <div className="flex items-center mt-0.5">
                              <div className={`
                                flex-shrink-0 rounded px-1 py-0.5 max-w-[100%] flex items-center gap-0.5
                                ${isTaskCreator(task) ? 'bg-purple-700 font-bold' : 'bg-slate-700'}
                              `} 
                                   title={`Создал: ${formatUserName(task.created_by)} (${getUserRole(task.created_by)})`}>
                                <span className={`text-white text-[9px] truncate ${isTaskCreator(task) ? 'font-bold' : ''}`}>
                                  👤 {formatUserName(task.created_by)}
                                  {isTaskCreator(task) && ' (вы)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Индикатор количества задач */}
                    {dayTasks.length > 0 && (
                      <div className="absolute bottom-0.5 right-0.5 text-[9px] text-slate-400 bg-slate-800/80 px-1 rounded-sm">
                        {dayTasks.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
    
    return (
      <div className="glass-card p-3 rounded-xl bg-slate-900/60 border border-slate-700 shadow-xl">
        {monthTitle}
        {calendar}
      </div>
    );
  };

  // Проверка корректности данных перед отправкой при первой загрузке приложения
  useEffect(() => {
    // Добавляем обработчик ошибок для отладки проблем с API
    const handleApiErrors = (response: Response) => {
      if (!response.ok) {
        console.error(`API ошибка: ${response.status} ${response.statusText}`);
        return Promise.reject(`API ошибка: ${response.status}`);
      }
      return response;
    };
    
    // Переопределяем fetch для добавления логирования запросов
    const originalFetch = window.fetch;
    window.fetch = async function(url: RequestInfo | URL, options?: RequestInit) {
      console.log(`Запрос к API: ${url}`, options);
      const response = await originalFetch(url, options);
      console.log(`Ответ API: ${url}`, response.status);
      
      // Клонируем ответ, чтобы его можно было прочитать несколько раз
      const clonedResponse = response.clone();
      
      // Пытаемся прочитать тело ответа как JSON
      try {
        const json = await clonedResponse.json();
        console.log('Тело ответа:', json);
      } catch (e) {
        console.log('Ответ не является JSON');
      }
      
      return response;
    };
    
    console.log('Приложение инициализировано. Данные пользователя будут запрошены.');
  }, []);

  return (
    <div className="p-3 fade-in">
      <div className="animated-background" />
      
      <div className="glass-card rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1 text-white">Календарь задач</h1>
            <p className="text-sm text-gray-300">
              Планирование и управление рабочим процессом
              {isLoading && <span className="ml-2 animate-pulse">загрузка...</span>}
            </p>
            <div className="mt-1 text-xs text-purple-300 flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-purple-700 mr-1"></span>
              <span>Для каждой задачи показан автор</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Фильтр по создателю */}
            <div className="relative mr-1">
              <label className="block text-xs text-gray-400 mb-1">Показать задачи от:</label>
              <div className="flex gap-1 items-center">
                {currentUser && (
                  <Button 
                    onClick={() => setCreatorFilter(currentUser.id === creatorFilter ? null : currentUser.id)}
                    className={`text-xs py-1 px-2 h-[28px] ${
                      currentUser.id === creatorFilter 
                        ? 'bg-purple-800 hover:bg-purple-700' 
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    Мои задачи {currentUser.id === creatorFilter && '✓'}
                  </Button>
                )}
                <select
                  value={creatorFilter || ""}
                  onChange={(e) => setCreatorFilter(e.target.value ? Number(e.target.value) : null)}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1 text-xs appearance-none pr-8 min-w-[180px] h-[28px]"
                >
                  <option value="">Все создатели</option>
                  {getUniqueCreators().map((creator) => (
                    <option key={creator.id} value={creator.id}>
                      {creator.name} {creator.id === currentUser?.id ? '(вы)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-0 bottom-0 flex items-center pr-2 pointer-events-none h-[28px]">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => openNewTaskDialog(new Date())}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 py-1 px-2 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Новая задача
            </Button>
          </div>
        </div>
        
        {/* Индикатор активного фильтра */}
        {creatorFilter !== null && getUniqueCreators().find(c => c.id === creatorFilter) && (
          <div className={`
            mt-2 border rounded p-2 flex items-center justify-between
            ${creatorFilter === currentUser?.id 
              ? 'bg-purple-900/30 border-purple-800/50' 
              : 'bg-indigo-900/30 border-indigo-800/50'
            }
          `}>
            <div className="flex items-center">
              <span className="text-xs text-indigo-300 mr-2">Активен фильтр:</span>
              <span className="text-sm text-white font-medium">
                {creatorFilter === currentUser?.id 
                  ? 'Только ваши задачи' 
                  : `Задачи от ${getUniqueCreators().find(c => c.id === creatorFilter)?.name}`
                }
              </span>
            </div>
            <Button 
              onClick={() => setCreatorFilter(null)}
              variant="ghost" 
              className="h-6 text-xs text-gray-300 hover:text-white hover:bg-indigo-800/50"
            >
              Сбросить
            </Button>
          </div>
        )}
      </div>
      
      {renderCalendar()}
      
      {/* Диалог новой задачи */}
      <Dialog open={isNewTaskDialogOpen} onOpenChange={closeNewTaskDialog}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-300">
              {selectedTask ? 'Редактировать задачу' : 'Новая задача'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Название
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                placeholder="Введите название задачи"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Описание
              </label>
              <div className="relative mb-1">
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white min-h-[80px] text-sm"
                  placeholder="Описание задачи"
                />
              </div>
              <div className="flex justify-end">
                <MentionsHelper 
                  onSelectMention={(email) => {
                    // Добавляем упоминание в текст описания
                    const mention = `@${email}`;
                    const newDescription = newTask.description 
                      ? `${newTask.description} ${mention}`
                      : mention;
                    setNewTask({...newTask, description: newDescription});
                    toast.success(`Упоминание ${email} добавлено`);
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Используйте формат @email для упоминания пользователей
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Дата
              </label>
              <input
                type="date"
                value={newTask.date}
                onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Время
              </label>
              <input
                type="time"
                value={newTask.time}
                onChange={(e) => setNewTask({...newTask, time: e.target.value})}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Статус
              </label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({...newTask, status: e.target.value as 'planned' | 'completed' | 'canceled'})}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              >
                <option value="planned">Запланирована</option>
                <option value="completed">Выполнена</option>
                <option value="canceled">Отменена</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-3">
              <Button 
                onClick={() => setIsNewTaskDialogOpen(false)}
                variant="outline"
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 text-sm py-1"
              >
                Отмена
              </Button>
              <Button 
                onClick={saveTask}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1"
                disabled={!newTask.title || isLoading}
              >
                {isLoading ? 'Сохранение...' : selectedTask ? 'Обновить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Диалог просмотра задачи */}
      <Dialog open={isTaskDialogOpen} onOpenChange={closeTaskDialog}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-300">
              Детали задачи
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <CalendarIcon className="h-3 w-3" />
                  <span>
                    {format(parseISO(selectedTask.date), 'd MMMM yyyy', { locale: ru })}
                    {selectedTask.time && selectedTask.time !== '00:00' && ` в ${selectedTask.time}`}
                  </span>
                </div>
              </div>
              
              {/* Информация о создателе - крупная и заметная */}
              <div className={`
                border p-3 rounded-md flex items-center mb-3 shadow-inner
                ${isTaskCreator(selectedTask) ? 'bg-purple-800 border-purple-500' : 'bg-slate-800 border-slate-700'}
              `}>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow
                  ${isTaskCreator(selectedTask) ? 'bg-purple-600' : 'bg-slate-600'}
                `}>
                  <span className="text-lg font-bold text-white">
                    {selectedTask.created_by ? 
                      (selectedTask.created_by.name ? 
                        selectedTask.created_by.name.charAt(0).toUpperCase() : 
                        selectedTask.created_by.email ? 
                          selectedTask.created_by.email.charAt(0).toUpperCase() : 
                          'Н'
                      ) : 
                      currentUser?.name?.charAt(0).toUpperCase() || 'Н'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-medium ${isTaskCreator(selectedTask) ? 'text-purple-200' : 'text-slate-300'}`}>
                    {isTaskCreator(selectedTask) ? 'Создано вами:' : 'Создатель:'}
                  </span>
                  <span className="text-white text-sm font-semibold">
                    {/* Всегда отображаем полное имя без сокращений */}
                    {formatUserName(selectedTask.created_by)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {getUserRole(selectedTask.created_by)}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-base font-medium text-white">{selectedTask.title}</h3>
                <p className="mt-1 text-sm text-gray-300 whitespace-pre-line">{selectedTask.description}</p>
              </div>
              
              <div className="p-2 rounded bg-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Статус:</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium 
                    ${selectedTask.status === 'completed' ? 'bg-green-600/50 text-green-100' :
                      selectedTask.status === 'canceled' ? 'bg-red-600/50 text-red-100' :
                      'bg-blue-600/50 text-blue-100'}`}>
                    {selectedTask.status === 'planned' ? 'Запланирована' :
                     selectedTask.status === 'completed' ? 'Выполнена' : 'Отменена'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between space-x-2 pt-3">
                <Button 
                  onClick={() => deleteTask(selectedTask.id)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm py-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Удаление...' : 'Удалить'}
                </Button>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => setIsTaskDialogOpen(false)}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 text-sm py-1"
                  >
                    Закрыть
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsTaskDialogOpen(false);
                      setIsNewTaskDialogOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1"
                    disabled={isLoading}
                  >
                    Редактировать
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Вспомогательные функции
function getStartOfWeek(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay() || 7; // Для воскресенья (0) возвращаем 7
  if (day !== 1) weekStart.setDate(weekStart.getDate() - (day - 1));
  return weekStart;
}

function getEndOfWeek(date: Date): Date {
  const weekEnd = getStartOfWeek(date);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
} 