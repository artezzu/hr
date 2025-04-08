import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/useAuth';
import { config } from '@/config';

// Интерфейс для вакансии
interface Vacancy {
  id: number;
  title: string;
  requirements: string;
  conditions: string;
  description: string;
  status: 'new' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  created_by?: {
    id: number;
    email: string;
    full_name: string;
  };
}

// Интерфейс для рекрутера
interface Recruiter {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

// Пропсы компонента
interface VacancyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vacancy: Vacancy | null;
  onSubmitSuccess: () => void;
}

export default function VacancyFormDialog({
  isOpen,
  onClose,
  vacancy,
  onSubmitSuccess,
}: VacancyFormDialogProps) {
  // Состояние формы
  const [formData, setFormData] = useState({
    title: '',
    requirements: '',
    conditions: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<number | null>(null);
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(false);
  const { user } = useAuth();

  // Получение списка рекрутеров
  useEffect(() => {
    const fetchRecruiters = async () => {
      setIsLoadingRecruiters(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/users/?role=recruiter`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched recruiters:', data);
          setRecruiters(data);
        } else {
          console.error('Failed to fetch recruiters:', response.status);
        }
      } catch (error) {
        console.error('Error fetching recruiters:', error);
      } finally {
        setIsLoadingRecruiters(false);
      }
    };
    
    if (isOpen) {
      fetchRecruiters();
    }
  }, [isOpen]);

  // Инициализация формы при открытии или изменении редактируемой вакансии
  useEffect(() => {
    if (vacancy) {
      setFormData({
        title: vacancy.title,
        requirements: vacancy.requirements,
        conditions: vacancy.conditions,
        description: vacancy.description,
      });
    } else {
      // Сброс формы для создания новой вакансии
      setFormData({
        title: '',
        requirements: '',
        conditions: '',
        description: '',
      });
      setSelectedRecruiterId(null);
    }
    setErrors({});
  }, [vacancy, isOpen]);

  // Обработка изменений в полях формы
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Очистка ошибки при вводе
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Обработка выбора рекрутера
  const handleRecruiterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRecruiterId(value ? parseInt(value, 10) : null);
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }

    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Требования обязательны';
    }

    if (!formData.conditions.trim()) {
      newErrors.conditions = 'Условия обязательны';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Назначение вакансии рекрутеру
  const assignVacancyToRecruiter = async (vacancyId: number, recruiterId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      
      console.log('Assigning vacancy to recruiter:', { vacancy_id: vacancyId, recruiter_id: recruiterId });
      
      const response = await fetch(`${config.apiUrl}/vacancy-assignments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vacancy_id: vacancyId,
          recruiter_id: recruiterId,
        }),
      });
      
      if (response.ok) {
        console.log('Vacancy assigned successfully');
        return true;
      } else {
        let errorMessage = 'Не удалось назначить вакансию рекрутеру';
        try {
          // Проверяем, есть ли контент в ответе
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            if (errorData && errorData.detail) {
              errorMessage = errorData.detail;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        console.error('Failed to assign vacancy:', errorMessage);
        alert(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Error assigning vacancy:', error);
      alert('Произошла ошибка при назначении вакансии рекрутеру');
      return false;
    }
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = vacancy
        ? `${config.apiUrl}/vacancies/${vacancy.id}`
        : `${config.apiUrl}/vacancies/`;
      const method = vacancy ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Vacancy created/updated:', responseData);
        
        // Если выбран рекрутер и создается новая вакансия, то назначаем ему вакансию
        if (selectedRecruiterId && !vacancy) {
          const assignmentSuccess = await assignVacancyToRecruiter(responseData.id, selectedRecruiterId);
          if (!assignmentSuccess) {
            console.warn('Vacancy was created but assignment failed');
          }
        }
        
        onSubmitSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        
        if (errorData.detail) {
          alert(errorData.detail);
        } else {
          // Обработка ошибок валидации с бэкенда
          const fieldErrors: Record<string, string> = {};
          for (const [key, value] of Object.entries(errorData)) {
            fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
          }
          setErrors(fieldErrors);
        }
      }
    } catch (error) {
      console.error('Error submitting vacancy:', error);
      alert('Не удалось сохранить вакансию. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-90 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-900 border border-gray-700 px-4 pb-6 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-transparent text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Закрыть</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-white mb-4"
                    >
                      {vacancy ? 'Редактировать вакансию' : 'Создать вакансию'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit}>
                        <div className="space-y-5">
                          {/* Название вакансии */}
                          <div>
                            <label
                              htmlFor="title"
                              className="block text-sm font-medium text-gray-200 mb-1"
                            >
                              Название вакансии
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                name="title"
                                id="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ${
                                  errors.title
                                    ? 'ring-red-500'
                                    : 'ring-gray-700'
                                } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm`}
                              />
                              {errors.title && (
                                <p className="mt-1 text-sm text-red-400">
                                  {errors.title}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Выбор рекрутера (только при создании новой вакансии) */}
                          {!vacancy && (
                            <div>
                              <label
                                htmlFor="recruiter"
                                className="block text-sm font-medium text-gray-200 mb-1"
                              >
                                Назначить рекрутера
                              </label>
                              <div className="mt-1">
                                <select
                                  id="recruiter"
                                  name="recruiter"
                                  value={selectedRecruiterId || ''}
                                  onChange={handleRecruiterChange}
                                  className={`block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm`}
                                  disabled={isLoadingRecruiters}
                                >
                                  <option value="">Выберите рекрутера</option>
                                  {recruiters.map((recruiter) => (
                                    <option key={recruiter.id} value={recruiter.id}>
                                      {recruiter.full_name || recruiter.email}
                                    </option>
                                  ))}
                                </select>
                                {isLoadingRecruiters && (
                                  <p className="mt-1 text-sm text-gray-400">
                                    Загрузка списка рекрутеров...
                                  </p>
                                )}
                                <p className="mt-1 text-sm text-gray-400">
                                  Рекрутер получит уведомление о назначении вакансии
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Требования */}
                          <div>
                            <label
                              htmlFor="requirements"
                              className="block text-sm font-medium text-gray-200 mb-1"
                            >
                              Требования
                            </label>
                            <div className="mt-1">
                              <textarea
                                name="requirements"
                                id="requirements"
                                rows={4}
                                value={formData.requirements}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ${
                                  errors.requirements
                                    ? 'ring-red-500'
                                    : 'ring-gray-700'
                                } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm`}
                              />
                              {errors.requirements && (
                                <p className="mt-1 text-sm text-red-400">
                                  {errors.requirements}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Условия */}
                          <div>
                            <label
                              htmlFor="conditions"
                              className="block text-sm font-medium text-gray-200 mb-1"
                            >
                              Условия
                            </label>
                            <div className="mt-1">
                              <textarea
                                name="conditions"
                                id="conditions"
                                rows={4}
                                value={formData.conditions}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ${
                                  errors.conditions
                                    ? 'ring-red-500'
                                    : 'ring-gray-700'
                                } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm`}
                              />
                              {errors.conditions && (
                                <p className="mt-1 text-sm text-red-400">
                                  {errors.conditions}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Описание */}
                          <div>
                            <label
                              htmlFor="description"
                              className="block text-sm font-medium text-gray-200 mb-1"
                            >
                              Описание
                            </label>
                            <div className="mt-1">
                              <textarea
                                name="description"
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ${
                                  errors.description
                                    ? 'ring-red-500'
                                    : 'ring-gray-700'
                                } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm`}
                              />
                              {errors.description && (
                                <p className="mt-1 text-sm text-red-400">
                                  {errors.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 border border-gray-700"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
                          >
                            {isSubmitting
                              ? 'Сохранение...'
                              : vacancy
                              ? 'Сохранить изменения'
                              : 'Создать вакансию'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 