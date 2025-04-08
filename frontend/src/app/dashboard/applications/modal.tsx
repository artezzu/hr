'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  MapPin, 
  Phone, 
  MessageCircle,
  Languages,
  Calendar,
  FileText,
  Clock,
  Send
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { config } from '@/config';
import { Transition } from '@headlessui/react';

interface StatusHistory {
  id: number;
  status: string;
  comment: string;
  created_at: string;
  created_by: string;
}

export interface Application {
  id: number;
  position: string;
  full_name: string;
  birth_date: string;
  specialization: string;
  education: string;
  citizenship: string;
  experience: string;
  city: string;
  phone: string;
  telegram: string;
  languages: string;
  source: string;
  status: string;
  created_at: string;
  status_history: StatusHistory[];
  hasUnreadMessages?: boolean;
  resume_file_path?: string;
  is_hh_candidate?: boolean;
}

export function ApplicationDialog({ 
  application, 
  onClose,
  fetchApplications
}: { 
  application: Application, 
  onClose: () => void,
  fetchApplications?: () => Promise<void>
}) {
  // Состояния для управления модальными окнами и формой
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isExperienceOpen, setIsExperienceOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [localStatusComment, setLocalStatusComment] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Определяем, является ли это кандидатом из HeadHunter
  const isHeadHunterCandidate = application.is_hh_candidate || application.source === 'headhunter';

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response: Response = await fetch(`${config.apiUrl}/applications/${application.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete application');
      }
      
      onClose();
      if (fetchApplications) {
        await fetchApplications();
      }
    } catch (error: unknown) {
      console.error('Error deleting application:', error);
    }
  };

  const statusColors = {
    'Новый': 'bg-blue-600 hover:bg-blue-700 text-white',
    'На рассмотрении': 'bg-amber-500 hover:bg-amber-600 text-white',
    'Собеседование': 'bg-violet-600 hover:bg-violet-700 text-white',
    'Офер': 'bg-emerald-600 hover:bg-emerald-700 text-white',
    'Принят на работу': 'bg-green-600 hover:bg-green-700 text-white',
    'Резерв': 'bg-slate-600 hover:bg-slate-700 text-white',
    'Отказ': 'bg-red-600 hover:bg-red-700 text-white'
  };

  const handleLocalStatusChange = async (status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/applications/${application.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          comment: localStatusComment,
          created_by: localStorage.getItem('user_name') || 'HR Manager'
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedAppResponse = await fetch(`${config.apiUrl}/applications/${application.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!updatedAppResponse.ok) throw new Error('Failed to fetch updated application');
      
      const updatedApp = await updatedAppResponse.json();
      
      // Обновляем состояние
      if (fetchApplications) {
        await fetchApplications();
      }
      
      setLocalStatusComment('');
      setSelectedStatus('');
      setIsStatusOpen(false);
      
      // Закрываем модальное окно
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'новый': 'bg-blue-600 hover:bg-blue-700',
      'на рассмотрении': 'bg-amber-500 hover:bg-amber-600',
      'собеседование': 'bg-violet-600 hover:bg-violet-700',
      'офер': 'bg-emerald-600 hover:bg-emerald-700',
      'принят на работу': 'bg-green-600 hover:bg-green-700',
      'резерв': 'bg-slate-600 hover:bg-slate-700',
      'отказ': 'bg-red-600 hover:bg-red-700',
      'удален': 'bg-gray-600 hover:bg-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-slate-600';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getIconColor = (type: string) => {
    const colors = {
      user: 'text-violet-400',
      briefcase: 'text-blue-400',
      education: 'text-green-400',
      globe: 'text-cyan-400',
      location: 'text-pink-400',
      phone: 'text-yellow-400',
      chat: 'text-orange-400',
      language: 'text-indigo-400',
    };
    return colors[type as keyof typeof colors] || 'text-gray-400';
  };

  const handleResumeView = async () => {
    if (application.resume_file_path) {
      try {
        window.open(`${config.apiUrl}/resumes/${application.resume_file_path}`, '_blank');
      } catch (error) {
        console.error('Error opening resume:', error);
      }
    }
  };

  return (
    <>
      <DialogContent className="bg-[#0a1929] border-0 text-white max-w-5xl">
        <DialogTitle className="sr-only">
          Информация о кандидате
        </DialogTitle>
        <DialogDescription className="sr-only">
          Детальная информация о кандидате и его заявке
        </DialogDescription>
        <div className="transition-all duration-300 ease-in-out">
          <DialogHeader>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl">Информация о кандидате</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="bg-[#3b5998] hover:bg-[#4c70ba] text-white transition-colors duration-200"
                  onClick={() => setIsChatOpen(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Открыть чат
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="bg-transparent border border-gray-700 hover:bg-gray-800 transition-colors duration-200"
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                  >
                    {application.status === 'офер' ? 'Офер' : application.status}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                  <Transition
                    show={isStatusOpen}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-[#1a1b1e] border border-gray-700 z-50">
                      <div className="p-3">
                        <div className="mb-3">
                          <Input
                            placeholder="Добавить комментарий..."
                            value={localStatusComment}
                            onChange={(e) => setLocalStatusComment(e.target.value)}
                            className="bg-[#1e1f25] border-gray-700 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          {Object.entries(statusColors).map(([status, color]) => (
                            <button
                              key={status}
                              className={`${color} w-full text-left px-4 py-2 text-sm rounded ${
                                selectedStatus.toLowerCase() === status.toLowerCase() ? 'ring-2 ring-white' : ''
                              }`}
                              onClick={() => {
                                setSelectedStatus(status.toLowerCase());
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              if (selectedStatus) {
                                handleLocalStatusChange(selectedStatus);
                              }
                            }}
                            disabled={!selectedStatus}
                          >
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-[1fr,400px] gap-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Первая колонка */}
              <div className="space-y-3">
                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <User className={getIconColor('user')} />
                    <div>
                      <div className="text-gray-400 text-sm">ФИО</div>
                      <div>{application.full_name}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Briefcase className={getIconColor('briefcase')} />
                    <div>
                      <div className="text-gray-400 text-sm">Специальность</div>
                      <div>{application.specialization || application.position}</div>
                    </div>
                  </div>
                </div>

                {!isHeadHunterCandidate && (
                  <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                    <div className="flex items-center gap-3">
                      <GraduationCap className={getIconColor('education')} />
                      <div>
                        <div className="text-gray-400 text-sm">Образование</div>
                        <div>{application.education}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Globe className={getIconColor('globe')} />
                    <div>
                      <div className="text-gray-400 text-sm">Гражданство</div>
                      <div>{application.citizenship}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Phone className={getIconColor('phone')} />
                    <div>
                      <div className="text-gray-400 text-sm">Телефон</div>
                      <div>{application.phone}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Вторая колонка */}
              <div className="space-y-3">
                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Languages className={getIconColor('language')} />
                    <div>
                      <div className="text-gray-400 text-sm">Язык</div>
                      <div>{application.languages}</div>
                    </div>
                  </div>
                </div>

                {!isHeadHunterCandidate && application.telegram && (
                  <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                    <div className="flex items-center gap-3">
                      <MessageCircle className={getIconColor('chat')} />
                      <div>
                        <div className="text-gray-400 text-sm">Telegram</div>
                        <div>{application.telegram}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <FileText className={getIconColor('briefcase')} />
                    <div>
                      <div className="text-gray-400 text-sm">Вакансия</div>
                      <div>{application.position}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Clock className={getIconColor('chat')} />
                    <div>
                      <div className="text-gray-400 text-sm">Источник</div>
                      <div>{isHeadHunterCandidate ? 'HeadHunter' : (application.source || 'Telegram')}</div>
                    </div>
                  </div>
                </div>

                {/* Для HH кандидатов показываем ссылку на резюме, если она есть */}
                {isHeadHunterCandidate && application.resume_file_path && (
                  <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                    <div className="flex items-center gap-3">
                      <FileText className={getIconColor('briefcase')} />
                      <div>
                        <div className="text-gray-400 text-sm">Резюме</div>
                        <a 
                          href={application.resume_file_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Открыть резюме
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                  <div className="flex items-center gap-3">
                    <Briefcase className={getIconColor('briefcase')} />
                    <div>
                      <div className="text-gray-400 text-sm">Опыт работы</div>
                      <button 
                        className="cursor-pointer hover:text-[#3b5998] transition-colors"
                        onClick={() => setIsExperienceOpen(true)}
                      >
                        Нажмите, чтобы посмотреть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка с историей статусов */}
            <div className="border-l border-[#1e3a5f] pl-6 flex flex-col">
              <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30 mb-4">
                <h3 className="text-lg text-white">История статусов</h3>
              </div>
              <div className="space-y-0 overflow-y-auto pr-4 custom-scrollbar h-[600px]">
                <style jsx global>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0a1929;
                    border-radius: 3px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #1e88e5;
                    border-radius: 3px;
                    border: 2px solid #0a1929;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #2196f3;
                  }
                `}</style>
                {[...application.status_history].reverse().map((history, index) => (
                  <div key={index} className="relative pl-6 pb-6">
                    {/* Вертикальная линия */}
                    <div 
                      className="absolute left-[3px] top-0 bottom-0 w-[2px]"
                      style={{
                        background: '#3B82F6',
                        opacity: 0.5
                      }}
                    />
                    
                    {/* Точка */}
                    <div 
                      className="absolute left-0 top-2 w-[8px] h-[8px] rounded-full bg-blue-500 ring-[3px] ring-[#1a1b1e] z-10"
                    />
                    
                    {/* Контент */}
                    <div className="ml-4">
                      <div className={`${getStatusColor(history.status)} inline-block rounded px-2 py-1 text-white text-sm`}>
                        {history.status}
                      </div>
                      <div className="text-gray-400 text-xs mt-2">{formatDate(history.created_at)}</div>
                      {history.comment && (
                        <div className="text-sm mt-2 text-gray-300">{history.comment}</div>
                      )}
                      <div className="text-xs mt-2 text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {history.created_by || 'Система'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
              >
                Удалить кандидата
              </Button>
              {application.resume_file_path && (
                <Button 
                  variant="outline" 
                  className="bg-[#3b5998] hover:bg-[#4c70ba] text-white"
                  onClick={() => setIsResumeOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Просмотреть резюме
                </Button>
              )}
            </div>
            <Button 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Диалог для опыта работы */}
      <Dialog open={isExperienceOpen} onOpenChange={setIsExperienceOpen}>
        <DialogContent className="bg-[#0a1929] border-0 text-white">
          <DialogTitle>Опыт работы</DialogTitle>
          <div className="mt-4">
            <p className="text-gray-300">{application.experience}</p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsExperienceOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог для просмотра резюме */}
      <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
        <DialogContent className="bg-[#0a1929] border-0 text-white max-w-4xl h-[80vh] flex flex-col">
          <DialogTitle>Резюме кандидата</DialogTitle>
          <div className="flex-1 overflow-hidden bg-[#1a1b1e] rounded-lg p-4 flex flex-col">
            <div className="flex-1 h-full w-full mb-4">
              {application.resume_file_path && (
                <object
                  data={`${config.apiUrl}/resumes/${application.resume_file_path}`}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <p>Ваш браузер не поддерживает просмотр PDF. 
                    <a 
                      href={`${config.apiUrl}/resumes/${application.resume_file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 ml-2"
                    >
                      Скачать PDF
                    </a>
                  </p>
                </object>
              )}
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                className="bg-[#3b5998] hover:bg-[#4c70ba] text-white flex items-center gap-2 transition-all duration-200 transform hover:scale-105 px-6"
                onClick={() => setIsResumeOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Вернуться к информации
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 