import { useState } from 'react';
import { Application } from '../app/dashboard/applications/modal';

// Интерфейс для приложения, минимально необходимый для открытия модального окна
export interface ApplicationBasic {
  id: number;
  full_name: string;
  position: string;
  specialization: string;
  status: string;
  created_at: string;
  phone: string;
  telegram: string;
  telegram_chat_id?: string;
  hasUnreadMessages?: boolean;
  resume_file_path?: string;
  status_history: Array<{
    id: number;
    status: string;
    comment: string;
    created_at: string;
    created_by: string;
  }>;
  citizenship: string;
  education: string;
  experience: string;
  city: string;
  languages: string;
  source: string;
  birth_date: string;
  is_hh_candidate?: boolean; // Флаг для определения кандидатов из HeadHunter
}

/**
 * Хук для управления модальным окном заявок, которое можно открыть с любой страницы
 */
export function useApplicationModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationBasic | null>(null);

  /**
   * Открывает модальное окно заявки
   * @param application Объект приложения для отображения
   */
  const openApplicationModal = (application: ApplicationBasic) => {
    setSelectedApplication(application as Application);
    setIsModalOpen(true);
  };

  /**
   * Закрывает модальное окно заявки
   */
  const closeApplicationModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  };

  return { 
    isModalOpen, 
    selectedApplication, 
    openApplicationModal, 
    closeApplicationModal 
  };
} 