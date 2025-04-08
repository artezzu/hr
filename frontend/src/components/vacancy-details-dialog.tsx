import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { formatDateTime } from '@/lib/utils';
import { config } from '@/config';
import { useAuth } from '@/lib/useAuth';
import { toast } from 'react-hot-toast';

interface Creator {
  id: number;
  firstname?: string;
  lastname?: string;
  full_name?: string;
  email?: string;
}

interface Recruiter {
  id: number;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  position?: string | null;
}

interface VacancyAssignment {
  id: number;
  vacancy_id: number;
  recruiter_id: number;
  status: string;
  created_at: string;
  recruiter?: Recruiter;
}

interface Vacancy {
  id: number;
  title: string;
  requirements: string;
  conditions: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator?: Creator;
  assignments?: VacancyAssignment[];
  closed_by?: Recruiter;
  closed_at?: string;
}

interface VacancyDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vacancyId: number | null;
  onVacancyAccepted?: () => void;
}

const VacancyDetailsDialog: React.FC<VacancyDetailsDialogProps> = ({ 
  isOpen, 
  onClose, 
  vacancyId,
  onVacancyAccepted 
}) => {
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { user, isAdmin } = useAuth();

  // Проверка, является ли пользователь рекрутером
  const isRecruiter = (): boolean => {
    return user?.role === 'recruiter';
  };

  // Получение данных о вакансии
  useEffect(() => {
    const fetchVacancyDetails = async () => {
      if (!vacancyId) return;
      
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${config.apiUrl}/vacancies/${vacancyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched vacancy details:', data);
          
          // Отладка: детальная информация о назначениях и рекрутерах
          if (data.assignments && data.assignments.length > 0) {
            console.log('Vacancy assignments:', data.assignments);
            
            // Получить информацию о рекрутерах для назначений, если отсутствует
            const assignmentsWithPendingRequests = data.assignments.map(async (assignment: any) => {
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
              
              if (assignment.recruiter) {
                console.log('Recruiter fields:', Object.keys(assignment.recruiter));
                console.log('Recruiter full data:', JSON.stringify(assignment.recruiter, null, 2));
              }
              
              return assignment;
            });
            
            // Дожидаемся завершения всех запросов и обновляем состояние
            await Promise.all(assignmentsWithPendingRequests);
          }
          
          // Проверка и конвертация для совместимости created_by и creator
          if (data.created_by && !data.creator) {
            data.creator = data.created_by;
          }
          
          setVacancy(data);
        } else {
          console.error('Failed to fetch vacancy details:', response.status);
        }
      } catch (error) {
        console.error('Error fetching vacancy details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && vacancyId) {
      fetchVacancyDetails();
    }
  }, [isOpen, vacancyId]);

  const handleAcceptVacancy = async () => {
    if (!vacancyId || !user) {
      console.error('Missing vacancyId or user data');
      return;
    }

    console.log('Trying to accept vacancy:', vacancyId);
    console.log('Current user:', user);
    
    setButtonLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${config.apiUrl}/vacancy-assignments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vacancy_id: vacancyId,
          recruiter_id: user.id,
        }),
      });

      const data = await response.json();
      console.log('Assignment response:', data);
      
      if (response.ok) {
        toast.success('Вакансия успешно принята!');
        onClose();
        if (onVacancyAccepted) {
          onVacancyAccepted();
        }
      } else {
        console.error('Failed to accept vacancy:', data);
        toast.error(data.detail || 'Не удалось принять вакансию');
      }
    } catch (error) {
      console.error('Error accepting vacancy:', error);
      toast.error('Произошла ошибка при принятии вакансии');
    } finally {
      setButtonLoading(false);
    }
  };
  
  // Функция для закрытия вакансии
  const handleCloseVacancy = async () => {
    if (!vacancyId || !user) {
      console.error('Missing vacancyId or user data');
      return;
    }

    console.log('Trying to close vacancy:', vacancyId);
    console.log('Current user:', user);
    
    setButtonLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${config.apiUrl}/vacancies/${vacancyId}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to close vacancy');
      }

      toast.success('Вакансия успешно закрыта!');
      setVacancy(prev => prev ? { ...prev, status: 'closed' } : null);
      if (onVacancyAccepted) onVacancyAccepted();
      
    } catch (error) {
      console.error("Error closing vacancy:", error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при закрытии вакансии');
    } finally {
      setButtonLoading(false);
    }
  };
  
  // Проверка, назначена ли вакансия
  const isVacancyAssigned = vacancy?.assignments && 
    vacancy.assignments.length > 0 && 
    vacancy.assignments.some(a => a.status === 'assigned');

  // Проверка, назначена ли вакансия текущему пользователю
  const isAssignedToCurrentUser = isVacancyAssigned && 
    user?.id && vacancy?.assignments?.some(a => a.recruiter_id === user.id && a.status === 'assigned');
  
  // Проверка, может ли рекрутер принять вакансию
  const canAcceptVacancy = isRecruiter() && vacancy?.status === 'new';

  // Проверка, может ли пользователь закрыть вакансию
  const canCloseVacancy = (isAdmin() || isAssignedToCurrentUser) && vacancy?.status !== 'closed';

  // Debug logs
  console.log('Vacancy details:', vacancy);
  console.log('Current user:', user);
  console.log('Is recruiter:', isRecruiter());
  console.log('Vacancy status:', vacancy?.status);
  console.log('Can accept vacancy:', canAcceptVacancy);
  console.log('Is assigned to current user:', isAssignedToCurrentUser);
  console.log('Vacancy assignments:', vacancy?.assignments);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1f1a35] border border-[#3e3474]/60 shadow-xl text-white backdrop-blur-sm max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">{loading ? 'Загрузка...' : vacancy?.title || 'Детали вакансии'}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-6">Загрузка данных...</div>
        ) : vacancy ? (
          <div className="py-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Статус</div>
                <div className="mt-1">
                  <span className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide ${getStatusColor(vacancy.status)}`}>
                    {getStatusText(vacancy.status)}
                  </span>
                </div>
              </div>
              
              {vacancy.creator && (
                <div>
                  <div className="text-sm text-gray-400">Создатель</div>
                  <div className="font-semibold text-gray-200">
                    {vacancy.creator.firstname && vacancy.creator.lastname 
                      ? `${vacancy.creator.firstname} ${vacancy.creator.lastname}`
                      : vacancy.creator.full_name || 'Пользователь'}
                  </div>
                </div>
              )}
              
              {/* Показываем информацию о назначенном рекрутере */}
              {isVacancyAssigned && (
                <div>
                  <div className="text-sm text-gray-400">Принял</div>
                  <div className="font-semibold text-gray-200">
                    <span className="text-green-400">
                    {(() => {
                      const recruiter = vacancy.assignments?.find(a => a.status === 'assigned')?.recruiter;
                      if (recruiter) {
                        if (recruiter.full_name) return recruiter.full_name;
                        if (recruiter.name) return recruiter.name;
                        if (recruiter.firstname && recruiter.lastname) return `${recruiter.firstname} ${recruiter.lastname}`;
                        if (recruiter.first_name && recruiter.last_name) return `${recruiter.first_name} ${recruiter.last_name}`;
                        if (recruiter.email) return recruiter.email;
                        if (recruiter.id) return `Рекрутер ID: ${recruiter.id}`;
                        const recruiterStr = JSON.stringify(recruiter);
                        console.log(`Tried to display recruiter name, but no appropriate field found: ${recruiterStr}`);
                        return 'Рекрутер';
                      }
                      return 'Рекрутер';
                    })()}
                    </span>
                    {vacancy.assignments?.find(a => a.status === 'assigned')?.recruiter?.position && 
                     ` (${vacancy.assignments.find(a => a.status === 'assigned')?.recruiter?.position})`}
                    {isAssignedToCurrentUser && " (Вы)"}
                  </div>
                </div>
              )}
              
              {/* Показываем информацию о том, кто закрыл вакансию */}
              {vacancy.status === 'closed' && vacancy.closed_by && (
                <div>
                  <div className="text-sm text-gray-400">Закрыл</div>
                  <div className="font-semibold text-gray-200">
                    <span className="text-red-400">
                      {vacancy.closed_by.full_name || vacancy.closed_by.email || 'Пользователь'} 
                    </span>
                    {vacancy.closed_at && (
                      <span className="text-gray-400"> - {formatDateTime(vacancy.closed_at)}</span>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-sm text-gray-400">Дата создания</div>
                <div className="font-semibold text-gray-200">{formatDateTime(vacancy.created_at)}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Требования</div>
                <div className="mt-1 whitespace-pre-wrap text-gray-200 bg-[#2a2152] p-3 rounded-md border border-[#3e3474]/50">{vacancy.requirements}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Условия</div>
                <div className="mt-1 whitespace-pre-wrap text-gray-200 bg-[#2a2152] p-3 rounded-md border border-[#3e3474]/50">{vacancy.conditions}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Описание</div>
                <div className="mt-1 whitespace-pre-wrap text-gray-200 bg-[#2a2152] p-3 rounded-md border border-[#3e3474]/50">{vacancy.description}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6">Данные не найдены</div>
        )}

        <DialogFooter className="flex flex-wrap justify-between sm:justify-between gap-2 mt-auto pt-4 border-t border-[#3e3474]/60">
          <Button variant="outline" onClick={onClose} className="text-gray-200 border-[#3e3474] hover:bg-[#2a2152]">
            Закрыть
          </Button>
          
          {canAcceptVacancy && !isVacancyAssigned && (
            <Button 
              onClick={handleAcceptVacancy} 
              className="bg-indigo-600 hover:bg-indigo-500 font-bold"
              disabled={buttonLoading}
            >
              {buttonLoading ? 'Применение...' : 'Принять вакансию'}
            </Button>
          )}
          
          {canCloseVacancy && (
            <Button 
              onClick={handleCloseVacancy} 
              className="bg-red-600 hover:bg-red-500 font-bold"
              disabled={buttonLoading}
            >
              {buttonLoading ? 'Закрытие...' : 'Закрыть вакансию'}
            </Button>
          )}
          
          {isAssignedToCurrentUser && vacancy?.status !== 'closed' && (
            <span className="text-gray-300 font-medium">Вы уже приняли <span className="text-green-400">эту вакансию</span></span>
          )}
          
          {vacancy?.status === 'closed' && (
            <span className="text-gray-300 font-medium">Вакансия <span className="text-red-400">закрыта</span></span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VacancyDetailsDialog; 