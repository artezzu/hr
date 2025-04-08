'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { config } from '@/config';
import { useAuth } from '@/lib/useAuth';
import VacancyFormDialog from '@/components/vacancy-form-dialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import VacancyDetailsDialog from '@/components/vacancy-details-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

// CSS для анимации мерцания и эффекта Grow
const pulseGrowStyles = `
  @keyframes pulseGrow {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
      transform: scale(1);
    }
    33% {
      box-shadow: 0 0 20px 3px rgba(59, 130, 246, 0.5);
      transform: scale(1.01);
    }
    66% {
      box-shadow: 0 0 10px 5px rgba(99, 102, 241, 0.4);
      transform: scale(1.02);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      transform: scale(1);
    }
  }

  @keyframes borderGlow {
    0% {
      border-color: rgba(59, 130, 246, 0.7);
    }
    50% {
      border-color: rgba(129, 140, 248, 0.9);
    }
    100% {
      border-color: rgba(59, 130, 246, 0.7);
    }
  }

  .pulse-grow-animation {
    animation: pulseGrow 3s infinite ease-in-out;
  }

  .border-glow-animation {
    animation: borderGlow 2s infinite alternate;
    border-width: 2px;
  }

  .highlighted-vacancy {
    position: relative;
    overflow: visible !important;
  }

  .highlighted-vacancy::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    z-index: -1;
    background: linear-gradient(45deg, #3b82f6, #818cf8, #6366f1);
    border-radius: inherit;
    opacity: 0.15;
    filter: blur(8px);
    animation: pulseGrow 3s infinite ease-in-out;
  }
`;

// Интерфейсы для типизации
interface Vacancy {
  id: number;
  title: string;
  requirements: string;
  conditions: string;
  description: string;
  status: 'new' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    firstname: string;
    lastname: string;
    full_name: string;
  };
  assignments?: VacancyAssignment[];
  closed_by?: {
    id: number;
    firstname?: string;
    lastname?: string;
    full_name?: string;
    email?: string;
  };
  closed_at?: string;
}

interface VacancyAssignment {
  id: number;
  vacancy_id: number;
  recruiter_id: number;
  recruiter?: {
    id: number;
    email: string;
    full_name: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    firstname?: string;
    lastname?: string;
    position?: string | null;
  };
  assigned_at: string;
  closed_at: string | null;
  candidate_id: number | null;
  status: 'assigned' | 'closed';
}

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filteredVacancies, setFilteredVacancies] = useState<Vacancy[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentVacancy, setCurrentVacancy] = useState<Vacancy | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const { user, isAdmin, isRecruiter, hasManagerAccess } = useAuth();
  const [selectedVacancyId, setSelectedVacancyId] = useState<number | null>(null);
  const [vacancyDetailsOpen, setVacancyDetailsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [highlightedVacancyId, setHighlightedVacancyId] = useState<number | null>(null);

  // Проверяем URL-параметры для подсветки вакансии при загрузке
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const highlightParam = queryParams.get('highlight');
    
    if (highlightParam) {
      const vacancyId = parseInt(highlightParam, 10);
      if (!isNaN(vacancyId)) {
        setHighlightedVacancyId(vacancyId);
        
        // Автоматически открываем детали подсвеченной вакансии
        const highlightedVacancy = vacancies.find(v => v.id === vacancyId);
        if (highlightedVacancy) {
          setSelectedVacancy(highlightedVacancy);
          setIsDetailsOpen(true);
        }
      }
    }
  }, [vacancies]);

  // Обновляем useEffect для фильтрации
  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredVacancies(vacancies);
    } else {
      setFilteredVacancies(vacancies.filter(vacancy => vacancy.status === filterStatus));
    }
  }, [filterStatus, vacancies]);

  // Функция для преобразования данных API в модель для фронтенда
  const processVacancyData = (data: any[]): Vacancy[] => {
    return data.map(vacancy => {
      // Проверка и конвертация для совместимости created_by и creator
      if (vacancy.created_by && !vacancy.creator) {
        vacancy.creator = vacancy.created_by;
      }
      console.log('Processed vacancy:', vacancy.title, 'creator:', vacancy.creator);
      return vacancy;
    });
  };

  // Загрузка списка вакансий
  const fetchVacancies = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const url = `${config.apiUrl}/vacancies/`;
    
    console.log('Fetching vacancies from URL:', url);
    console.log('Using token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'no token');
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Received vacancies data:', data);
        
        // Отладка: Вывести информацию о назначениях и рекрутерах
        data.forEach((vacancy: any) => {
          if (vacancy.assignments && vacancy.assignments.length > 0) {
            console.log(`Vacancy ${vacancy.id} assignments:`, vacancy.assignments);
            
            // Получить информацию о рекрутерах для назначений, если отсутствует
            vacancy.assignments.forEach(async (assignment: any) => {
              console.log(`Assignment ${assignment.id} recruiter:`, assignment.recruiter);
              
              // Если данных о рекрутере нет, но есть ID рекрутера, получаем эти данные
              if (!assignment.recruiter && assignment.recruiter_id) {
                try {
                  const recruiterResponse = await fetch(`${config.apiUrl}/users/${assignment.recruiter_id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (recruiterResponse.ok) {
                    const recruiterData = await recruiterResponse.json();
                    console.log(`Fetched recruiter data for ID ${assignment.recruiter_id}:`, recruiterData);
                    assignment.recruiter = recruiterData;
                  }
                } catch (error) {
                  console.error(`Error fetching recruiter data for ID ${assignment.recruiter_id}:`, error);
                }
              }
            });
          }
        });
        
        // Даем немного времени для загрузки данных о рекрутерах
        setTimeout(() => {
          const processedData = processVacancyData(data);
          setVacancies(processedData);
          setIsLoading(false);
        }, 500);
      } else {
        console.error('Failed to fetch vacancies:', response.status);
        if (response.status === 401) {
          console.error('Unauthorized - check your token');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  // Создание новой вакансии
  const handleCreateVacancy = () => {
    setCurrentVacancy(null);
    setIsFormOpen(true);
  };

  // Открытие окна с деталями вакансии
  const handleViewVacancyDetails = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setIsDetailsOpen(true);
  };

  // Редактирование вакансии
  const handleEditVacancy = (vacancy: Vacancy, e?: React.MouseEvent) => {
    // Предотвращаем всплытие события, чтобы не открывать детали
    e?.stopPropagation();
    setCurrentVacancy(vacancy);
    setIsFormOpen(true);
  };

  // Удаление вакансии
  const handleDeleteVacancy = async (id: number, e?: React.MouseEvent) => {
    // Предотвращаем всплытие события, чтобы не открывать детали
    e?.stopPropagation();
    
    if (!confirm('Вы уверены, что хотите удалить эту вакансию?')) return;

    try {
      const response = await fetch(`${config.apiUrl}/vacancies/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        await fetchVacancies();
      } else {
        console.error('Failed to delete vacancy');
      }
    } catch (error) {
      console.error('Error deleting vacancy:', error);
    }
  };

  // Назначение себя на вакансию (для рекрутеров)
  const handleAssignVacancy = async (vacancyId: number) => {
    console.log('Trying to assign vacancy:', vacancyId);
    console.log('Current user:', user);
    
    if (!user) {
      alert('Вы должны войти в систему для принятия вакансии');
      return;
    }
    
    try {
      console.log('Sending assignment request:', {
        vacancy_id: vacancyId,
        recruiter_id: user.id
      });
      
      const response = await fetch(`${config.apiUrl}/vacancy-assignments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          vacancy_id: vacancyId,
          recruiter_id: user.id,
        }),
      });

      if (response.ok) {
        toast.success('Вакансия успешно принята!');
        await fetchVacancies();
      } else {
        let errorMessage = 'Не удалось назначить вакансию';
        try {
          // Проверяем, есть ли контент в ответе
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();
            if (responseData && responseData.detail) {
              errorMessage = responseData.detail;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        console.error('Failed to assign vacancy:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error assigning vacancy:', error);
      toast.error('Произошла ошибка при принятии вакансии. Попробуйте еще раз.');
    }
  };

  // Закрытие назначения вакансии
  const handleCloseAssignment = async (assignmentId: number) => {
    try {
      const response = await fetch(
        `${config.apiUrl}/vacancy-assignments/${assignmentId}/close`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        await fetchVacancies();
      } else {
        console.error('Failed to close assignment');
      }
    } catch (error) {
      console.error('Error closing assignment:', error);
    }
  };

  // Функция для перевода статуса на русский
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      new: 'Новая',
      in_progress: 'В работе',
      closed: 'Закрыта',
    };
    return statusMap[status] || status;
  };

  // Функция для определения цвета статуса
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      new: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 border border-blue-400/30 shadow-inner',
      in_progress: 'bg-gradient-to-r from-amber-400/20 to-yellow-500/20 text-amber-600 border border-amber-400/30 shadow-inner',
      closed: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-400/30 shadow-inner',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Проверка, назначена ли вакансия на текущего рекрутера
  const isAssigned = (vacancyId: number) => {
    if (!user || !vacancies) return false;
    
    const vacancy = vacancies.find(v => v.id === vacancyId);
    if (!vacancy || !vacancy.assignments) return false;
    
    return vacancy.assignments.some(
      assignment => assignment.recruiter_id === user.id && assignment.status === 'assigned'
    );
  };

  // Проверка, назначена ли вакансия на любого рекрутера
  const isAssignedToAnyRecruiter = (vacancyId: number) => {
    if (!vacancies) return false;
    
    const vacancy = vacancies.find(v => v.id === vacancyId);
    if (!vacancy || !vacancy.assignments) return false;
    
    return vacancy.assignments.some(assignment => assignment.status === 'assigned');
  };

  // Получение информации о рекрутере, который принял вакансию
  const getAssignedRecruiterName = (vacancyId: number) => {
    if (!vacancies) return null;
    
    const vacancy = vacancies.find(v => v.id === vacancyId);
    if (!vacancy || !vacancy.assignments) return null;
    
    const assignment = vacancy.assignments.find(a => a.status === 'assigned');
    if (!assignment || !assignment.recruiter) return null;
    
    return assignment.recruiter.full_name || 'Рекрутер';
  };

  // Функция для открытия деталей вакансии
  const openVacancyDetails = (vacancyId: number) => {
    console.log('Opening vacancy details for vacancy ID:', vacancyId);
    setSelectedVacancyId(vacancyId);
    setVacancyDetailsOpen(true);
  };

  // Функция для определения стилей строки вакансии
  const getVacancyRowClassName = (vacancy: Vacancy) => {
    let className = "bg-gradient-to-br from-[#241e40]/90 to-[#1f1a35]/90 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300";
    
    // Добавляем класс подсветки, если ID вакансии совпадает с ID из параметра highlight
    if (vacancy.id === highlightedVacancyId) {
      className += " border-glow-animation highlighted-vacancy pulse-grow-animation relative z-10";
    } else {
      className += " border border-[#3e3474]/40 hover:border-[#3e3474]/60";
    }
    
    return className;
  };

  return (
    <div className="p-6 fade-in">
      {/* Добавляем стили для анимации как внутренний CSS */}
      <style jsx>{pulseGrowStyles}</style>
      
      <div className="glass-card rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2 text-white">Управление вакансиями</h1>
        <p className="text-gray-300">Создавайте, отслеживайте и управляйте вакансиями в компании</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#302662]/80 to-[#1f1a35]/80 rounded-lg p-4 shadow-lg border border-[#3e3474]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-300">Открытые вакансии</h3>
              <p className="text-3xl font-bold text-white">{vacancies.filter(v => v.status === 'new').length}</p>
            </div>
            <div className="bg-indigo-600/30 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#302662]/80 to-[#1f1a35]/80 rounded-lg p-4 shadow-lg border border-[#3e3474]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-300">В работе</h3>
              <p className="text-3xl font-bold text-white">{vacancies.filter(v => v.status === 'in_progress').length}</p>
            </div>
            <div className="bg-green-600/30 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#302662]/80 to-[#1f1a35]/80 rounded-lg p-4 shadow-lg border border-[#3e3474]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-300">Закрытые вакансии</h3>
              <p className="text-3xl font-bold text-white">{vacancies.filter(v => v.status === 'closed').length}</p>
            </div>
            <div className="bg-blue-600/30 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры и действия */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="w-full md:w-auto flex items-center gap-4">
          <select 
            className="bg-[#1f1a35] text-white p-2 rounded-lg border border-[#3e3474]/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Все вакансии</option>
            <option value="new">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="closed">Закрытые</option>
          </select>
        </div>

        {isAdmin && isAdmin() && (
          <Button 
            variant="default" 
            onClick={() => setCreateDialogOpen(true)}
            className="w-full md:w-auto bg-indigo-700 hover:bg-indigo-600 flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Создать вакансию
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredVacancies.length === 0 ? (
        <div className="bg-[#1f1a35]/80 rounded-lg border border-[#3e3474]/30 p-10 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Нет доступных вакансий</h3>
          <p className="text-gray-400 mb-6">Создайте новую вакансию, чтобы начать поиск кандидатов</p>
          {isAdmin && isAdmin() && (
            <Button 
              variant="default" 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-indigo-700 hover:bg-indigo-600"
            >
              Создать вакансию
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredVacancies.map((vacancy) => (
            <div
              key={vacancy.id}
              className={getVacancyRowClassName(vacancy)}
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-md text-xs font-medium tracking-wide ${getStatusColor(vacancy.status)} shadow-sm`}>
                        {getStatusText(vacancy.status)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {format(new Date(vacancy.created_at), 'dd MMMM yyyy', { locale: ru })}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => openVacancyDetails(vacancy.id)}>
                      {vacancy.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {vacancy.requirements && 
                        vacancy.requirements.split(',').slice(0, 3).map((req, index) => (
                          <span key={index} className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-md">
                            {req.trim()}
                          </span>
                        ))
                      }
                    </div>
                    
                    <div className="text-gray-300 text-sm space-y-1.5">
                      {vacancy.creator && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Создал:</span>
                          <span className="font-medium">
                            {vacancy.creator.full_name || 
                             (vacancy.creator.firstname && vacancy.creator.lastname ? 
                              `${vacancy.creator.firstname} ${vacancy.creator.lastname}` : 'Пользователь')}
                          </span>
                        </div>
                      )}
                      
                      {/* Информация о принявшем рекрутере */}
                      {vacancy.assignments && vacancy.assignments.length > 0 && 
                       vacancy.assignments.some(a => a.status === 'assigned') && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Принял:</span>
                          <span className="font-medium text-green-400">
                            {(() => {
                              const recruiter = vacancy.assignments.find(a => a.status === 'assigned')?.recruiter;
                              if (recruiter) {
                                if (recruiter.full_name) return recruiter.full_name;
                                if (recruiter.name) return recruiter.name;
                                if (recruiter.firstname && recruiter.lastname) 
                                  return `${recruiter.firstname} ${recruiter.lastname}`;
                                if (recruiter.first_name && recruiter.last_name) 
                                  return `${recruiter.first_name} ${recruiter.last_name}`;
                                return recruiter.email || 'Рекрутер';
                              }
                              return 'Рекрутер';
                            })()}
                          </span>
                        </div>
                      )}
                      
                      {/* Информация о закрытии вакансии */}
                      {vacancy.status === 'closed' && vacancy.closed_by && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Закрыл:</span>
                          <span className="font-medium text-blue-400">
                            {vacancy.closed_by.full_name || 
                             (vacancy.closed_by.firstname && vacancy.closed_by.lastname ? 
                              `${vacancy.closed_by.firstname} ${vacancy.closed_by.lastname}` : 'Пользователь')}
                            {vacancy.closed_at && (
                              <span className="text-gray-500 ml-1">
                                ({format(new Date(vacancy.closed_at), 'dd.MM.yyyy', { locale: ru })})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4 md:mt-0">
                    <Button
                      variant="outline"
                      onClick={() => openVacancyDetails(vacancy.id)}
                      className="text-gray-200 border-gray-600 hover:bg-gray-800 hover:text-white"
                    >
                      Детали вакансии
                    </Button>

                    {isRecruiter && isRecruiter() && vacancy.status === 'new' && (
                      <>
                        {!isAssignedToAnyRecruiter(vacancy.id) ? (
                          <Button 
                            onClick={() => handleAssignVacancy(vacancy.id)}
                            className="bg-green-600 hover:bg-green-500 text-white"
                          >
                            Принять вакансию
                          </Button>
                        ) : isAssigned(vacancy.id) ? (
                          <div className="px-4 py-2 rounded-md bg-green-900/30 text-green-400 border border-green-800/40 text-sm text-center">
                            Вы приняли эту вакансию
                          </div>
                        ) : (
                          <div className="px-4 py-2 rounded-md bg-gray-800/30 text-gray-400 border border-gray-700/40 text-sm text-center">
                            Вакансия уже принята
                          </div>
                        )}
                      </>
                    )}
                    
                    {isAdmin && isAdmin() && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVacancy(vacancy, e);
                          }}
                          className="flex-1 text-yellow-400 border-yellow-800/40 hover:bg-yellow-900/30"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={(e) => handleDeleteVacancy(vacancy.id, e)}
                          className="flex-1 text-red-400 border-red-800/40 hover:bg-red-900/30"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Прогресс-бар и информация о статусе */}
              <div className={`h-1 w-full ${
                vacancy.status === 'new' ? 'bg-indigo-600' :
                vacancy.status === 'in_progress' ? 'bg-green-600' :
                'bg-blue-600'
              }`}></div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания вакансии */}
      {createDialogOpen && (
        <VacancyFormDialog
          isOpen={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          vacancy={currentVacancy}
          onSubmitSuccess={fetchVacancies}
        />
      )}

      {/* Модальное окно деталей вакансии */}
      <VacancyDetailsDialog
        isOpen={vacancyDetailsOpen}
        onClose={() => setVacancyDetailsOpen(false)}
        vacancyId={selectedVacancyId}
        onVacancyAccepted={fetchVacancies}
      />
    </div>
  );
} 