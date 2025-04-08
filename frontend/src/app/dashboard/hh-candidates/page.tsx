'use client';

import { useState, useEffect } from 'react';
import { config } from '@/config';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { HHCandidateDialog, HHCandidate } from './modal';

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

const STATUS_LABELS = {
  'новый': 'Новый',
  'на рассмотрении': 'На рассмотрении',
  'телефонное интервью': 'Телефонное интервью',
  'собеседование': 'Собеседование',
  'служба безопасности': 'Служба безопасности',
  'оффер': 'Оффер',
  'сбор документов': 'Сбор документов',
  'принят на работу': 'Принят на работу',
  'резерв': 'Резерв',
  'отказ': 'Отказ'
};

export default function HHCandidatesPage() {
  const [candidates, setCandidates] = useState<HHCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<HHCandidate | null>(null);
  const [searchPosition, setSearchPosition] = useState('');

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchPosition) {
        params.append('position', searchPosition);
      }
      
      const response = await fetch(`${config.apiUrl}/hh-candidates/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке кандидатов');
      }

      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [searchPosition]);

  const handleResumeView = async (candidate: HHCandidate, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем открытие модального окна
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      <div className="glass-card rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2 text-white">HH Кандидаты</h1>
        <p className="text-gray-300">Список кандидатов, импортированных из HeadHunter</p>
        
        <div className="mt-4">
          <input
            type="text"
            placeholder="Поиск по должности..."
            value={searchPosition}
            onChange={(e) => setSearchPosition(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300">
          {error}
        </div>
      )}

      <div className="bg-[#0d2137]/95 rounded-lg border border-[#1e3a5f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e3a5f]">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">ФИО</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Должность</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Дата рождения</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Телефон</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Статус</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Дата создания</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Резюме</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Последний комментарий</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    Нет импортированных кандидатов
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className="border-b border-[#1e3a5f] hover:bg-[#0f2942] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-white">{candidate.full_name}</td>
                    <td className="px-6 py-4 text-gray-300">{candidate.position}</td>
                    <td className="px-6 py-4 text-gray-300">{candidate.birth_date}</td>
                    <td className="px-6 py-4 text-gray-300">{candidate.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[candidate.status as keyof typeof STATUS_COLORS]} text-white`}>
                        {STATUS_LABELS[candidate.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{formatDate(candidate.created_at)}</td>
                    <td className="px-6 py-4">
                      {candidate.resume_file_path && (
                        <button
                          onClick={(e) => handleResumeView(candidate, e)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <DocumentIcon className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {candidate.status_history && candidate.status_history.length > 0 
                        ? candidate.status_history[0].comment 
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCandidate && (
        <HHCandidateDialog
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          fetchCandidates={fetchCandidates}
        />
      )}
    </div>
  );
} 