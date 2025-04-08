import { Dialog, DialogHeader, DialogTitle, DialogContentWithoutCloseButton } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { config } from "@/config";

interface StatusHistory {
  id: number;
  status: string;
  comment: string;
  created_at: string;
  created_by: string;
}

export interface HHCandidate {
  id: number;
  full_name: string;
  birth_date: string;
  phone: string;
  position: string;
  status: string;
  created_at: string;
  resume_file_path?: string;
  status_history: StatusHistory[];
}

const STATUS_OPTIONS = [
  { value: "новый", label: "Новый" },
  { value: "на рассмотрении", label: "На рассмотрении" },
  { value: "телефонное интервью", label: "Телефонное интервью" },
  { value: "собеседование", label: "Собеседование" },
  { value: "служба безопасности", label: "Служба безопасности" },
  { value: "оффер", label: "Оффер" },
  { value: "сбор документов", label: "Сбор документов" },
  { value: "принят на работу", label: "Принят на работу" },
  { value: "резерв", label: "Резерв" },
  { value: "отказ", label: "Отказ" }
];

const STATUS_COLORS = {
  'новый': 'bg-blue-500',
  'на рассмотрении': 'bg-yellow-500',
  'телефонное интервью': 'bg-orange-500',
  'собеседование': 'bg-purple-500',
  'служба безопасности': 'bg-teal-500',
  'оффер': 'bg-pink-500',
  'сбор документов': 'bg-indigo-500',
  'принят на работу': 'bg-green-500',
  'резерв': 'bg-gray-500',
  'отказ': 'bg-red-500'
};

export function HHCandidateDialog({ 
  candidate, 
  onClose,
  fetchCandidates
}: { 
  candidate: HHCandidate, 
  onClose: () => void,
  fetchCandidates?: () => Promise<void>
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(candidate.status);
  const [statusComment, setStatusComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async () => {
    if (!newStatus || !statusComment.trim()) {
      setError("Пожалуйста, выберите статус и добавьте комментарий");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/hh-candidates/${candidate.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comment: statusComment
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса');
      }

      // Обновляем список кандидатов
      if (fetchCandidates) {
        await fetchCandidates();
      }

      // Очищаем поле комментария
      setStatusComment("");
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Учитываем локальный часовой пояс
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return format(localDate, 'dd MMM yyyy HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-500';
  };

  // Функция для определения дополнительных классов в зависимости от статуса
  const getStatusClasses = (status: string) => {
    let baseClasses = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`;
    
    // Добавляем анимацию для статуса "оффер"
    if (status === 'оффер') {
      baseClasses += ' offer-status';
    }
    
    return baseClasses;
  };

  const handleResumeView = async () => {
    if (!candidate.resume_file_path) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/${candidate.resume_file_path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Ошибка при загрузке резюме');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Ошибка при открытии резюме:', error);
      setError('Ошибка при открытии резюме');
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContentWithoutCloseButton className="max-w-2xl max-h-[90vh] bg-[#0d2137] border-[#1e3a5f] text-white overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center justify-between">
            <span>Информация о кандидате</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3 overflow-y-auto pr-2 max-h-[calc(90vh-80px)] custom-scrollbar">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">ФИО:</span>
                  <span className="ml-2">{candidate.full_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Должность:</span>
                  <span className="ml-2">{candidate.position}</span>
                </div>
                <div>
                  <span className="text-gray-400">Дата рождения:</span>
                  <span className="ml-2">{candidate.birth_date}</span>
                </div>
                <div>
                  <span className="text-gray-400">Телефон:</span>
                  <span className="ml-2">{candidate.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400">Текущий статус:</span>
                  <span className={getStatusClasses(candidate.status)}>
                    {STATUS_OPTIONS.find(opt => opt.value === candidate.status)?.label || candidate.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Дата добавления:</span>
                  <span className="ml-2">{formatDate(candidate.created_at)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Резюме</h3>
              {candidate.resume_file_path ? (
                <button
                  onClick={handleResumeView}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <DocumentIcon className="w-5 h-5" />
                  <span>Открыть резюме</span>
                </button>
              ) : (
                <span className="text-gray-400">Резюме не прикреплено</span>
              )}
            </div>
          </div>

          {/* Изменение статуса */}
          <div className="border-t border-[#1e3a5f] pt-4">
            <h3 className="text-lg font-semibold mb-2">Изменить статус</h3>
            <div className="grid grid-cols-2 gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <input
                  type="text"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Комментарий к изменению статуса"
                  className="w-full h-9 px-3 py-1 bg-[#1e3a5f] border border-[#2e4b6f] rounded-md text-white placeholder-gray-400 text-sm"
                />
              </div>
            </div>
            {error && (
              <div className="mt-1 text-red-400 text-xs">
                {error}
              </div>
            )}
            <div className="mt-2">
              <Button
                onClick={handleStatusChange}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm px-3 py-1"
              >
                {isUpdating ? "Сохранение..." : "Сохранить статус"}
              </Button>
            </div>
          </div>

          {/* История статусов */}
          <div className="border-t border-[#1e3a5f] pt-4">
            <h3 className="text-lg font-semibold mb-2">История статусов</h3>
            <div className="space-y-3">
              {candidate.status_history && candidate.status_history.length > 0 ? (
                <div className="space-y-3">
                  {candidate.status_history.map((history) => (
                    <div key={history.id} className="relative pl-6 pb-3 border-l border-[#1e3a5f]">
                      <div className="absolute left-0 top-2 w-1 h-1 rounded-full bg-[#1e3a5f]"></div>
                      <div className="text-sm">
                        <div className="mb-1">
                          <span className={getStatusClasses(history.status)}>
                            {STATUS_OPTIONS.find(opt => opt.value === history.status)?.label || history.status}
                          </span>
                          <span className="text-gray-400 ml-2 text-xs">
                            {formatDate(history.created_at)}
                          </span>
                        </div>
                        <div className="text-gray-300">
                          {history.comment}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {history.created_by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">История статусов отсутствует</div>
              )}
            </div>
          </div>
        </div>
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
} 