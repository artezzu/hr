'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { config } from '@/config';
import {
  BriefcaseIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  BookmarkIcon,
  UserIcon,
  XMarkIcon,
  ChartBarSquareIcon,
  UsersIcon,
  LinkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronDownIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from 'next/navigation';
import { useApplicationModal, ApplicationBasic } from '@/lib/useApplicationModal';
import { ApplicationDialog } from '../applications/modal';
import { HHCandidateDialog, HHCandidate } from '../hh-candidates/modal';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, 
         addMonths, subMonths, parseISO, isEqual, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import StatusHistoryChart from '@/components/status-history-chart';
import FunnelChart from '@/components/funnel-chart';
import SourceStatisticsChart from '@/components/sources-statistics-chart';
// Импортируем библиотеку xlsx
import * as XLSX from 'xlsx';

// Переименовываем интерфейс чтобы избежать конфликта
interface ApplicationItem {
  id: number;
  full_name: string;
  position: string;
  specialization: string;
  status: string;
  created_at: string;
  phone: string;
  telegram: string;
  // Добавляем флаг для различия обычных и HH кандидатов
  source?: string;
}

// Интерфейс для HH кандидатов
interface HHCandidateItem {
  id: number;
  full_name: string;
  position: string;
  status: string;
  created_at: string;
  phone: string;
  resume_url?: string;
  resume_file_path?: string;
  birth_date?: string;
  last_comment?: string;
  status_history: Array<{
    id: number;
    status: string;
    comment: string;
    created_at: string;
    created_by: string;
  }>;
}

interface CounterData {
  active_vacancies: number;
  closed_vacancies: number;
  new_candidates: number;
  interviews: number;
  consideration: number;
  phone_interview: number; // Новый статус
  offers: number;
  security_check: number; // Новый статус
  document_collection: number; // Новый статус
  hired: number;
  reserve: number;
  rejected: number;
  hh_candidates: number;
  // Статусы для HH кандидатов
  hh_new: number;
  hh_consideration: number;
  hh_phone_interview: number; // Новый статус
  hh_interviews: number;
  hh_security_check: number; // Новый статус
  hh_offers: number;
  hh_document_collection: number; // Новый статус
  hh_hired: number;
  hh_reserve: number;
  hh_rejected: number;
  // Комбинированные статистики
  combined_new: number;
  combined_consideration: number;
  combined_phone_interview: number; // Новый статус
  combined_interviews: number;
  combined_security_check: number; // Новый статус
  combined_offers: number;
  combined_document_collection: number; // Новый статус
  combined_hired: number;
  combined_reserve: number;
  combined_rejected: number;
}

// Интерфейс для данных воронки
interface FunnelData {
  label: string;
  value: number;
  color: string;
  gradient: string;
}

// VisuallyHidden компонент для скрытия элементов от обычных пользователей, но доступных для скринридеров
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="sr-only">{children}</span>
  );
};

export default function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState('Май');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [hhCandidates, setHHCandidates] = useState<HHCandidateItem[]>([]);
  const [filteredMonthApplications, setFilteredMonthApplications] = useState<ApplicationItem[]>([]);
  const [filteredMonthHHCandidates, setFilteredMonthHHCandidates] = useState<HHCandidateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [counters, setCounters] = useState<CounterData>({} as CounterData);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isApplicationDetailsDialogOpen, setIsApplicationDetailsDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFunnelDialogOpen, setIsFunnelDialogOpen] = useState(false);
  // Удаляю состояние isSourcesDialogOpen
  const [isDetailedSourcesDialogOpen, setIsDetailedSourcesDialogOpen] = useState(false);
  const [detailedSourceType, setDetailedSourceType] = useState<'telegram' | 'headhunter'>('telegram');
  const [isStatusHistoryDialogOpen, setIsStatusHistoryDialogOpen] = useState(false);
  const [isFluctuationDialogOpen, setIsFluctuationDialogOpen] = useState(false);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [hoveredFunnelItem, setHoveredFunnelItem] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const router = useRouter();
  const { isModalOpen, selectedApplication: applicationModal, openApplicationModal, closeApplicationModal } = useApplicationModal();
  const [isHHModalOpen, setIsHHModalOpen] = useState(false);
  const [selectedHHCandidate, setSelectedHHCandidate] = useState<HHCandidate | null>(null);
  const [statusHistoryDisplayMode, setStatusHistoryDisplayMode] = useState<'daily' | 'monthly'>('monthly');
  const [isSourcesStatisticsDialogOpen, setIsSourcesStatisticsDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [selectedApplicationData, setSelectedApplicationData] = useState<any>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecruiterKpiDialogOpen, setIsRecruiterKpiDialogOpen] = useState(false);
  const [recruiterKpiData, setRecruiterKpiData] = useState<any[]>([]);
  const [selectedRecruiters, setSelectedRecruiters] = useState<number[]>([]);
  const [isRecruiterCompareDialogOpen, setIsRecruiterCompareDialogOpen] = useState(false);
  const [vacanciesDialogTitle, setVacanciesDialogTitle] = useState('Закрытые вакансии');
  const [isVacanciesDialogOpen, setIsVacanciesDialogOpen] = useState(false);
  const [vacanciesList, setVacanciesList] = useState<any[]>([]);

  useEffect(() => {
    console.log('[useEffect] Selected month changed to:', selectedMonth, '. Triggering fetchAllData.'); // Log hook trigger
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        console.log(`Загрузка данных за месяц: ${selectedMonth}`);
        
        const token = localStorage.getItem('token');
        const { start_date, end_date } = getMonthFilterParams();
        
        // Получаем обычные заявки
        const appUrl = new URL(`${config.apiUrl}/applications/`);
        appUrl.searchParams.append('start_date', start_date);
        appUrl.searchParams.append('end_date', end_date);
        
        console.log('Отправляем запрос на URL:', appUrl.toString());
        
        const appResponse = await fetch(appUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!appResponse.ok) {
          throw new Error(`Failed to fetch applications: ${appResponse.status}`);
        }

        const appData = await appResponse.json();
        console.log(`Получено ${appData.length} заявок за ${selectedMonth}:`, appData);
        
        // Получаем HH кандидатов
        const hhUrl = new URL(`${config.apiUrl}/hh-candidates/`);
        hhUrl.searchParams.append('start_date', start_date);
        hhUrl.searchParams.append('end_date', end_date);
        
        console.log('Отправляем запрос для HH кандидатов:', hhUrl.toString());
        
        const hhResponse = await fetch(hhUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!hhResponse.ok) {
          throw new Error(`Failed to fetch HH candidates: ${hhResponse.status}`);
        }

        const hhData = await hhResponse.json();
        console.log(`Получено ${hhData.length} HH кандидатов за ${selectedMonth}:`, hhData);

        // Получаем вакансии для подсчета активных и закрытых
        console.log('Отправляем запрос для получения вакансий');
        const vacanciesResponse = await fetch(`${config.apiUrl}/vacancies/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!vacanciesResponse.ok) {
          throw new Error(`Failed to fetch vacancies: ${vacanciesResponse.status}`);
        }

        const vacanciesData = await vacanciesResponse.json();
        console.log(`Получено ${vacanciesData.length} вакансий:`, vacanciesData);

        // Обновляем состояния
        setApplications(appData);
        setHHCandidates(hhData);
        console.log('[fetchAllData] API response lengths:', { appData: appData.length, hhData: hhData.length }); // Log API response size

        // Рассчитываем статистику
        const stats = calculateStats(appData, hhData, vacanciesData);
        console.log('[fetchAllData] Calculated stats before setting state:', stats); // Log calculated stats
        
        // Обновляем счетчики и воронку
        setCounters(stats);
        updateFunnelData(stats);

      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        // Сбрасываем состояния при ошибке
        setApplications([]);
        setHHCandidates([]);
        setCounters({
          active_vacancies: 0,
          closed_vacancies: 0,
          new_candidates: 0,
          interviews: 0,
          consideration: 0,
          phone_interview: 0,
          offers: 0,
          security_check: 0,
          document_collection: 0,
          hired: 0,
          reserve: 0,
          rejected: 0,
          hh_candidates: 0,
          hh_new: 0,
          hh_consideration: 0,
          hh_phone_interview: 0,
          hh_interviews: 0,
          hh_security_check: 0,
          hh_offers: 0,
          hh_document_collection: 0,
          hh_hired: 0,
          hh_reserve: 0,
          hh_rejected: 0,
          combined_new: 0,
          combined_consideration: 0,
          combined_phone_interview: 0,
          combined_interviews: 0,
          combined_security_check: 0,
          combined_offers: 0,
          combined_document_collection: 0,
          combined_hired: 0,
          combined_reserve: 0,
          combined_rejected: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [selectedMonth]);

  const getMonthFilterParams = () => {
    // Используем текущий год
    const currentYear = new Date().getFullYear();
    
    // Маппинг названий месяцев на их номера
    const monthMap: {[key: string]: number} = {
      'Январь': 0,
      'Февраль': 1,
      'Март': 2,
      'Апрель': 3,
      'Май': 4,
      'Июнь': 5,
      'Июль': 6,
      'Август': 7,
      'Сентябрь': 8,
      'Октябрь': 9,
      'Ноябрь': 10,
      'Декабрь': 11
    };
    
    // Получаем номер месяца
    const monthIndex = monthMap[selectedMonth];
    
    if (monthIndex === undefined) {
      console.error('Неверный месяц:', selectedMonth);
      return {
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString()
      };
    }
    
    // Создаем дату первого дня выбранного месяца
    const startDate = new Date(currentYear, monthIndex, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // Создаем дату последнего дня месяца
    const endDate = new Date(currentYear, monthIndex + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Логируем даты для отладки
    console.log('[getMonthFilterParams] Filtering period:', { 
      month: selectedMonth, 
      year: currentYear,
      startISO: startDate.toISOString(),
      endISO: endDate.toISOString()
    });
    
    // Форматируем даты в ISO-строки для API
    const params = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };
    
    console.log('Параметры запроса API:', params);
    
    return params;
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const { start_date, end_date } = getMonthFilterParams();
      
      const url = new URL(`${config.apiUrl}/applications/`);
      url.searchParams.append('start_date', start_date);
      url.searchParams.append('end_date', end_date);
      
      console.log('Отправляем запрос на URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Ошибка API:', error);
        throw new Error(`Failed to fetch data: ${response.status} ${error}`);
      }

      const appData = await response.json();
      console.log(`Получено ${appData.length} заявок за ${selectedMonth}:`, appData);
      
      if (appData.length === 0) {
        console.log(`Нет данных за ${selectedMonth}`);
        return;
      }
      
      setApplications(appData);
      
      // Подсчитываем статистику
      const stats = calculateStats(appData, []);
      setCounters(stats);
      
      // Обновляем данные для воронки
      updateFunnelData(stats);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  };

  const fetchHHCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const { start_date, end_date } = getMonthFilterParams();
      
      const url = new URL(`${config.apiUrl}/hh-candidates/`);
      url.searchParams.append('start_date', start_date);
      url.searchParams.append('end_date', end_date);
      
      console.log('Отправляем запрос для HH кандидатов:', url.toString());
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Ошибка API HH:', error);
        throw new Error(`Failed to fetch HH candidates: ${response.status} ${error}`);
      }

      const candidates = await response.json();
      console.log(`Получено ${candidates.length} HH кандидатов за ${selectedMonth}:`, candidates);
      
      // Если нет кандидатов, просто выходим (счетчики уже сброшены в useEffect)
      if (candidates.length === 0) {
        console.log(`Нет HH кандидатов за ${selectedMonth}, счетчики для HH не будут обновлены`);
        return;
      }
      
      // Логируем полученные данные для отладки
      if (candidates.length > 0) {
        console.log("Пример полей первого кандидата:", Object.keys(candidates[0]));
      }
      
      // Убедимся, что status_history существует у каждого кандидата
      const candidatesWithStatusHistory = candidates.map((candidate: HHCandidateItem) => ({
        ...candidate,
        status_history: candidate.status_history || []
      }));
      
      setHHCandidates(candidatesWithStatusHistory);
      
      // Подсчитываем статистику по статусам HH кандидатов
      const hhStatusCounts = {
        hh_new: 0,
        hh_consideration: 0,
        hh_phone_interview: 0,
        hh_interviews: 0,
        hh_security_check: 0,
        hh_offers: 0,
        hh_document_collection: 0,
        hh_hired: 0,
        hh_reserve: 0,
        hh_rejected: 0
      };
      
      candidates.forEach((candidate: HHCandidateItem) => {
        switch (candidate.status.toLowerCase()) {
          case 'новый':
            hhStatusCounts.hh_new++;
            break;
          case 'на рассмотрении':
            hhStatusCounts.hh_consideration++;
            break;
          case 'телефонное интервью':
            hhStatusCounts.hh_phone_interview++;
            break;
          case 'собеседование':
            hhStatusCounts.hh_interviews++;
            break;
          case 'служба безопасности':
            hhStatusCounts.hh_security_check++;
            break;
          case 'оффер':
            hhStatusCounts.hh_offers++;
            break;
          case 'сбор документов':
            hhStatusCounts.hh_document_collection++;
            break;
          case 'принят на работу':
            hhStatusCounts.hh_hired++;
            break;
          case 'резерв':
            hhStatusCounts.hh_reserve++;
            break;
          case 'отказ':
            hhStatusCounts.hh_rejected++;
            break;
        }
      });
      
      console.log('Статистика HH кандидатов:', hhStatusCounts);
      
      // Обновляем счетчики с учетом текущих значений из обычных кандидатов
      setCounters(prev => {
        const updated = {
          ...prev,
          hh_candidates: candidates.length,
          ...hhStatusCounts,
          // Обновляем комбинированные статистики
          combined_new: prev.new_candidates + hhStatusCounts.hh_new,
          combined_consideration: prev.consideration + hhStatusCounts.hh_consideration,
          combined_phone_interview: prev.phone_interview + hhStatusCounts.hh_phone_interview,
          combined_interviews: prev.interviews + hhStatusCounts.hh_interviews,
          combined_security_check: prev.security_check + hhStatusCounts.hh_security_check,
          combined_offers: prev.offers + hhStatusCounts.hh_offers,
          combined_document_collection: prev.document_collection + hhStatusCounts.hh_document_collection,
          combined_hired: prev.hired + hhStatusCounts.hh_hired,
          combined_reserve: prev.reserve + hhStatusCounts.hh_reserve,
          combined_rejected: prev.rejected + hhStatusCounts.hh_rejected
        };
        console.log('Обновленные счетчики (включая HH):', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error fetching HH candidates:', error);
      // Инициализируем пустыми данными при ошибке
      setHHCandidates([]);
      // Сбрасываем счетчики HH кандидатов
      setCounters(prev => ({
        ...prev,
        hh_candidates: 0,
        hh_new: 0,
        hh_consideration: 0,
        hh_phone_interview: 0,
        hh_interviews: 0,
        hh_security_check: 0,
        hh_offers: 0,
        hh_document_collection: 0,
        hh_hired: 0,
        hh_reserve: 0,
        hh_rejected: 0,
        // Обновляем также комбинированные счетчики, чтобы они содержали только данные обычных кандидатов
        combined_new: prev.new_candidates,
        combined_consideration: prev.consideration,
        combined_phone_interview: prev.phone_interview,
        combined_interviews: prev.interviews,
        combined_security_check: prev.security_check,
        combined_offers: prev.offers,
        combined_document_collection: prev.document_collection,
        combined_hired: prev.hired,
        combined_reserve: prev.reserve,
        combined_rejected: prev.rejected
      }));
    }
  };

  // Функция для обновления комбинированных счетчиков
  const updateCombinedCounters = () => {
    console.log('Обновление комбинированных счетчиков');
    console.log('Текущие applications:', applications);
    console.log('Текущие hhCandidates:', hhCandidates);
    
    // Подсчет статусов для обычных заявок
    const regularStatusCounts = applications.reduce((acc, app) => {
      const status = app.status.toLowerCase();
      console.log('Обработка статуса обычной заявки:', status);
      switch (status) {
        case 'новый':
          acc.new_candidates++;
          break;
        case 'на рассмотрении':
          acc.consideration++;
          break;
        case 'телефонное интервью':
          acc.phone_interview++;
          break;
        case 'собеседование':
          acc.interviews++;
          break;
        case 'служба безопасности':
          acc.security_check++;
          break;
        case 'оффер':
          acc.offers++;
          break;
        case 'сбор документов':
          acc.document_collection++;
          break;
        case 'принят на работу':
          acc.hired++;
          break;
        case 'резерв':
          acc.reserve++;
          break;
        case 'отказ':
          acc.rejected++;
          break;
      }
      return acc;
    }, {
      new_candidates: 0,
      consideration: 0,
      phone_interview: 0,
      interviews: 0,
      security_check: 0,
      offers: 0,
      document_collection: 0,
      hired: 0,
      reserve: 0,
      rejected: 0
    });

    console.log('Подсчитанные статусы обычных заявок:', regularStatusCounts);

    // Подсчет статусов для HH кандидатов
    const hhStatusCounts = hhCandidates.reduce((acc, candidate) => {
      const status = candidate.status.toLowerCase();
      console.log('Обработка статуса HH кандидата:', status);
      switch (status) {
        case 'новый':
          acc.hh_new++;
          break;
        case 'на рассмотрении':
          acc.hh_consideration++;
          break;
        case 'телефонное интервью':
          acc.hh_phone_interview++;
          break;
        case 'собеседование':
          acc.hh_interviews++;
          break;
        case 'служба безопасности':
          acc.hh_security_check++;
          break;
        case 'оффер':
          acc.hh_offers++;
          break;
        case 'сбор документов':
          acc.hh_document_collection++;
          break;
        case 'принят на работу':
          acc.hh_hired++;
          break;
        case 'резерв':
          acc.hh_reserve++;
          break;
        case 'отказ':
          acc.hh_rejected++;
          break;
      }
      return acc;
    }, {
      hh_new: 0,
      hh_consideration: 0,
      hh_phone_interview: 0,
      hh_interviews: 0,
      hh_security_check: 0,
      hh_offers: 0,
      hh_document_collection: 0,
      hh_hired: 0,
      hh_reserve: 0,
      hh_rejected: 0
    });

    console.log('Подсчитанные статусы HH кандидатов:', hhStatusCounts);

    // Обновляем общие счетчики
    setCounters(prev => {
      const updated = {
        ...prev,
        active_vacancies: prev.active_vacancies, // Используем значение из calculateStats
        closed_vacancies: prev.closed_vacancies, // Используем значение из calculateStats
        ...regularStatusCounts,
        ...hhStatusCounts,
        hh_candidates: hhCandidates.length,
        // Комбинированные статистики
        combined_new: regularStatusCounts.new_candidates + hhStatusCounts.hh_new,
        combined_consideration: regularStatusCounts.consideration + hhStatusCounts.hh_consideration,
        combined_phone_interview: regularStatusCounts.phone_interview + hhStatusCounts.hh_phone_interview,
        combined_interviews: regularStatusCounts.interviews + hhStatusCounts.hh_interviews,
        combined_security_check: regularStatusCounts.security_check + hhStatusCounts.hh_security_check,
        combined_offers: regularStatusCounts.offers + hhStatusCounts.hh_offers,
        combined_document_collection: regularStatusCounts.document_collection + hhStatusCounts.hh_document_collection,
        combined_hired: regularStatusCounts.hired + hhStatusCounts.hh_hired,
        combined_reserve: regularStatusCounts.reserve + hhStatusCounts.hh_reserve,
        combined_rejected: regularStatusCounts.rejected + hhStatusCounts.hh_rejected
      };
      
      console.log('Обновленные счетчики:', updated);
      return updated;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCardClick = (status: string) => {
    console.log('Клик по карточке со статусом:', status);
    // Преобразуем название статуса для корректного сопоставления
    let normalizedStatus = status;
    if (status === 'Собеседования') {
      normalizedStatus = 'Собеседование';
    }
    setSelectedStatus(normalizedStatus);
    setIsDialogOpen(true);
  };

  // Обрабатываем клик по карточке HH кандидатов - перенаправляем на страницу HH кандидатов
  const handleHHCardClick = () => {
    router.push('/dashboard/hh-candidates');
  };

  // Обработчик клика по карточке закрытых вакансий
  const handleClosedVacanciesClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/vacancies/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vacancies: ${response.status}`);
      }

      const data = await response.json();
      
      // Фильтруем только закрытые вакансии
      const closedVacancies = data.filter((vacancy: any) => 
        vacancy.status?.toLowerCase() === 'closed'
      );
      
      console.log('Закрытые вакансии:', closedVacancies);
      setVacanciesList(closedVacancies);
      setVacanciesDialogTitle('Закрытые вакансии');
      setIsVacanciesDialogOpen(true);
    } catch (error) {
      console.error('Ошибка при загрузке закрытых вакансий:', error);
      toast.error('Не удалось загрузить список закрытых вакансий');
    }
  };

  // Функция для получения полных данных о кандидате и открытия модального окна
  const fetchApplicationDetails = async (id: number, source?: string) => {
    try {
      // Если это HH кандидат, найдем его данные в уже загруженном списке
      if (source === 'headhunter') {
        const hhCandidate = hhCandidates.find(candidate => candidate.id === id);
        if (hhCandidate) {
          // Если открыто другое модальное окно со списком, закрываем его
          if (isDialogOpen) {
            setIsDialogOpen(false);
          }
          
          console.log("Найденный HH кандидат для модального окна:", hhCandidate);
          
          // Определяем путь к резюме, проверяя оба возможных поля
          const resumePath = hhCandidate.resume_file_path || hhCandidate.resume_url;
          
          // Преобразуем в формат HHCandidate
          const formattedCandidate: HHCandidate = {
            id: hhCandidate.id,
            full_name: hhCandidate.full_name,
            birth_date: hhCandidate.birth_date || '',
            phone: hhCandidate.phone,
            position: hhCandidate.position,
            status: hhCandidate.status,
            created_at: hhCandidate.created_at,
            // Используем найденный путь к резюме
            resume_file_path: resumePath,
            status_history: hhCandidate.status_history || []
          };
          
          console.log("Форматированный HH кандидат для модального окна:", formattedCandidate);
          
          // Устанавливаем выбранного HH кандидата и открываем его модальное окно
          setSelectedHHCandidate(formattedCandidate);
          setIsHHModalOpen(true);
          return;
        }
      }
      
      // Для обычных кандидатов продолжаем использовать API запрос
      const token = localStorage.getItem('token');
      const endpoint = `${config.apiUrl}/applications/${id}`;
      
      console.log('Fetching application details for ID:', id);
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch application details');

      const application = await response.json();
      console.log('Received application details:', application);
      
      // Если открыто другое модальное окно со списком, закрываем его
      if (isDialogOpen) {
        setIsDialogOpen(false);
      }
      
      // Вместо вызова openApplicationModal используем собственное состояние
      setSelectedApplicationData(application);
      setIsApplicationDialogOpen(true);
      
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Не удалось загрузить информацию о кандидате');
    }
  };

  const getFilteredApplications = () => {
    if (!selectedStatus) return [];

    console.log('Filtering applications for status:', selectedStatus);
    console.log('Current applications:', applications);
    console.log('Current HH candidates:', hhCandidates);

    const statusMap: { [key: string]: { appStatus: string[], hhStatus: string[] } } = {
      'Служба безопасности': { 
        appStatus: ['служба безопасности'],
        hhStatus: ['служба безопасности']
      },
      'Новые кандидаты': { 
        appStatus: ['новый'],
        hhStatus: ['новый']
      },
      'На рассмотрении': { 
        appStatus: ['на рассмотрении'],
        hhStatus: ['на рассмотрении']
      },
      'Телефонное интервью': { 
        appStatus: ['телефонное интервью'],
        hhStatus: ['телефонное интервью']
      },
      'Собеседование': { 
        appStatus: ['собеседование'],
        hhStatus: ['собеседование']
      },
      'Оффер': { 
        appStatus: ['оффер'],
        hhStatus: ['оффер']
      },
      'Сбор документов': { 
        appStatus: ['сбор документов'],
        hhStatus: ['сбор документов']
      },
      'Принят на работу': { 
        appStatus: ['принят на работу'],
        hhStatus: ['принят на работу']
      },
      'Резерв': { 
        appStatus: ['резерв'],
        hhStatus: ['резерв']
      },
      'Отказ': { 
        appStatus: ['отказ'],
        hhStatus: ['отказ']
      }
    };

    if (!statusMap[selectedStatus]) {
      console.error('Неизвестный статус:', selectedStatus);
      return [];
    }

    // Получаем обычные заявки со статусом
    const filteredApps = applications.filter(app => {
      const appStatus = app.status.toLowerCase();
      console.log('Проверка статуса заявки:', appStatus);
      return statusMap[selectedStatus].appStatus.includes(appStatus);
    });

    // Получаем HH кандидатов со статусом и преобразуем их в формат ApplicationItem
    const filteredHHCandidates = hhCandidates
      .filter(candidate => {
        const hhStatus = candidate.status.toLowerCase();
        console.log('Проверка статуса HH кандидата:', hhStatus);
        return statusMap[selectedStatus].hhStatus.includes(hhStatus);
      })
      .map(candidate => ({
        id: candidate.id,
        full_name: candidate.full_name,
        position: candidate.position,
        specialization: '', // Может отсутствовать у HH кандидатов
        status: candidate.status,
        created_at: candidate.created_at,
        phone: candidate.phone,
        telegram: '', // Может отсутствовать у HH кандидатов
        source: 'headhunter'
      }));

    const result = [...filteredApps, ...filteredHHCandidates];
    console.log('Отфильтрованные кандидаты:', result);
    return result;
  };

  // Функция для получения данных о источниках кандидатов
  const getSourcesData = () => {
    // Если у нас есть подробные данные о источниках из Telegram бота
    if (applications.length > 0) {
      // Используем функцию getDetailedTelegramSourcesData для получения статистики по источникам
      const detailedSources = getDetailedTelegramSourcesData();
      
      // Добавляем HeadHunter как отдельный источник
      const headhunterCandidates = hhCandidates.length;
      
      // Добавляем HeadHunter в массив источников, если есть кандидаты
      if (headhunterCandidates > 0) {
        detailedSources.push({
          name: 'HeadHunter',
          value: headhunterCandidates,
          color: '#D6001C',
          percent: Math.round((headhunterCandidates / (applications.length + headhunterCandidates)) * 100)
        });
        
        // Пересчитываем проценты с учетом HeadHunter
        const totalCandidates = applications.length + headhunterCandidates;
        detailedSources.forEach(source => {
          if (source.name !== 'HeadHunter') {
            source.percent = Math.round((source.value / totalCandidates) * 100);
          }
        });
      }
      
      // Сортируем массив по убыванию количества
      return detailedSources.sort((a, b) => b.value - a.value).map(source => ({
        ...source,
        onClick: source.name === 'HeadHunter' 
          ? () => { router.push('/dashboard/hh-candidates'); }
          : () => {
              setDetailedSourceType('telegram');
              setIsDetailedSourcesDialogOpen(true);
            }
      }));
    }
    
    // Если данных о заявках из Telegram нет, возвращаем простую статистику
    const telegramCandidates = applications.length;
    const headhunterCandidates = hhCandidates.length;
    
    // Формируем данные для диаграммы
    return [
      {
        name: 'Telegram Бот',
        value: telegramCandidates,
        color: '#2AABEE',
        percent: Math.round((telegramCandidates / (telegramCandidates + headhunterCandidates || 1)) * 100),
        onClick: () => {
          setDetailedSourceType('telegram');
          setIsDetailedSourcesDialogOpen(true);
        }
      },
      {
        name: 'HeadHunter',
        value: headhunterCandidates,
        color: '#D6001C',
        percent: Math.round((headhunterCandidates / (telegramCandidates + headhunterCandidates || 1)) * 100),
        onClick: () => {
          router.push('/dashboard/hh-candidates');
        }
      }
    ];
  };

  // Функция для получения детальных данных о источниках из Telegram бота
  const getDetailedTelegramSourcesData = () => {
    // Создаем карту для подсчета источников
    const sourcesMap: { [key: string]: number } = {};
    
    // Подсчитываем количество заявок по каждому источнику
    applications.forEach(app => {
      // Используем source из данных заявки или устанавливаем "Другие" как источник по умолчанию
      const source = app.source || "Другие";
      sourcesMap[source] = (sourcesMap[source] || 0) + 1;
    });
    
    // Если нет данных о источниках, добавляем фиктивные данные для примера на основе новых источников
    if (Object.keys(sourcesMap).length === 0 && applications.length > 0) {
      sourcesMap["Head hunter"] = Math.ceil(applications.length * 0.2);
      sourcesMap["Facebook"] = Math.ceil(applications.length * 0.15);
      sourcesMap["Instagram"] = Math.ceil(applications.length * 0.15);
      sourcesMap["Linkedin"] = Math.ceil(applications.length * 0.1);
      sourcesMap["Olx"] = Math.ceil(applications.length * 0.1);
      sourcesMap["Вузы"] = Math.ceil(applications.length * 0.1);
      sourcesMap["Приглашен через знакомого"] = Math.ceil(applications.length * 0.1);
      sourcesMap["Телеграм"] = Math.ceil(applications.length * 0.05);
      sourcesMap["Другие"] = applications.length - Object.values(sourcesMap).reduce((a, b) => a + b, 0);
    }
    
    // Определяем постоянные цвета для источников
    const sourceColors: { [key: string]: string } = {
      "Head hunter": "#D6001C", // Красный, как у HeadHunter
      "Facebook": "#1877F2", // Синий Facebook
      "Instagram": "#C13584", // Розовый Instagram
      "Linkedin": "#0A66C2", // Синий LinkedIn
      "Olx": "#6ECA00", // Зеленый OLX
      "Вузы": "#4285F4", // Синий для университетов
      "Приглашен через знакомого": "#34C759", // Зеленый для рекомендаций
      "Телеграм": "#2AABEE", // Синий Telegram
      "Другие": "#64748b", // Серый для прочих источников
    };
    
    // Преобразуем карту в массив для отображения
    const result = Object.entries(sourcesMap).map(([name, value]) => {
      return {
        name,
        value,
        color: sourceColors[name] || "#64748b", // Используем предопределенный цвет или серый по умолчанию
        percent: Math.round((value / (applications.length || 1)) * 100)
      };
    });
    
    // Сортируем по убыванию количества
    return result.sort((a, b) => b.value - a.value);
  };

  const cards = [
    {
      name: 'Активные вакансии',
      value: counters.active_vacancies,
      icon: BriefcaseIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-400',
      clickable: true,
      specialAction: 'active-vacancies'
    },
    {
      name: 'Закрытые вакансии',
      value: counters.closed_vacancies,
      icon: XCircleIcon,
      color: 'bg-red-600',
      textColor: 'text-red-400',
      clickable: true,
      specialAction: 'closed-vacancies'
    },
    {
      name: 'HH Кандидаты',
      value: counters.hh_candidates,
      icon: UsersIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-300',
      clickable: true,
      specialAction: 'hh'
    },
    {
      name: 'Новые кандидаты',
      value: counters.combined_new,
      icon: UserGroupIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-400',
      clickable: true
    },
    {
      name: 'На рассмотрении',
      value: counters.combined_consideration,
      icon: ClockIcon,
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      clickable: true
    },
    {
      name: 'Телефонное интервью',
      value: counters.combined_phone_interview,
      icon: ClockIcon,
      color: 'bg-orange-600',
      textColor: 'text-orange-400',
      clickable: true
    },
    {
      name: 'Собеседование',
      value: counters.combined_interviews,
      icon: ClockIcon,
      color: 'bg-purple-600',
      textColor: 'text-purple-400',
      clickable: true
    },
    {
      name: 'Служба безопасности',
      value: counters.combined_security_check,
      icon: ClockIcon,
      color: 'bg-teal-600',
      textColor: 'text-teal-400',
      clickable: true
    },
    {
      name: 'Оффер',
      value: counters.combined_offers,
      icon: CheckCircleIcon,
      color: 'bg-pink-600',
      textColor: 'text-pink-400',
      clickable: true
    },
    {
      name: 'Сбор документов',
      value: counters.combined_document_collection,
      icon: CheckCircleIcon,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-400',
      clickable: true
    },
    {
      name: 'Принят на работу',
      value: counters.combined_hired,
      icon: CheckCircleIcon,
      color: 'bg-green-600',
      textColor: 'text-green-400',
      clickable: true
    },
    {
      name: 'Резерв',
      value: counters.combined_reserve,
      icon: BookmarkIcon,
      color: 'bg-slate-600',
      textColor: 'text-slate-400',
      clickable: true
    },
    {
      name: 'Отказ',
      value: counters.combined_rejected,
      icon: UserIcon,
      color: 'bg-red-600',
      textColor: 'text-red-400',
      clickable: true
    },
  ];

  // Красивый современный компонент воронки
  const FunnelChart = () => {
    if (funnelData.length === 0) return null;

    // Максимальное значение для расчета ширины элементов
    const maxValue = Math.max(...funnelData.map(item => item.value));
    
    // Подсчитываем общее количество заявок
    const totalApplications = applications.length;

    // Определяем типы для стилей статусов
    type StatusStyle = {
      color: string;
      gradient: string;
    };

    type StatusStyles = {
      [key: string]: StatusStyle;
    };

    // Определяем цвета и градиенты для каждого статуса
    const statusStyles: StatusStyles = {
      'Новый': { color: '#4287f5', gradient: 'from-blue-600 to-blue-400' },
      'На рассмотрении': { color: '#f59e0b', gradient: 'from-orange-500 to-orange-400' },
      'Телефонное интервью': { color: '#f97316', gradient: 'from-orange-600 to-orange-400' },
      'Собеседование': { color: '#a855f7', gradient: 'from-purple-600 to-purple-400' },
      'Служба безопасности': { color: '#14b8a6', gradient: 'from-teal-600 to-teal-400' },
      'Оффер': { color: '#ec4899', gradient: 'from-pink-600 to-pink-400' },
      'Сбор документов': { color: '#6366f1', gradient: 'from-indigo-600 to-indigo-400' },
      'Принят на работу': { color: '#22c55e', gradient: 'from-green-600 to-green-400' },
      'Резерв': { color: '#64748b', gradient: 'from-slate-600 to-slate-400' },
      'Отказ': { color: '#ef4444', gradient: 'from-red-600 to-red-400' }
    };
    
    // Создаем данные для воронки на основе фактических статусов
    const updatedFunnelData = [
      { label: 'Новый', value: counters.combined_new },
      { label: 'На рассмотрении', value: counters.combined_consideration },
      { label: 'Телефонное интервью', value: counters.combined_phone_interview },
      { label: 'Собеседование', value: counters.combined_interviews },
      { label: 'Служба безопасности', value: counters.combined_security_check },
      { label: 'Оффер', value: counters.combined_offers },
      { label: 'Сбор документов', value: counters.combined_document_collection },
      { label: 'Принят на работу', value: counters.combined_hired },
      { label: 'Резерв', value: counters.combined_reserve },
      { label: 'Отказ', value: counters.combined_rejected }
    ].map(item => ({
      ...item,
      color: statusStyles[item.label].color,
      gradient: statusStyles[item.label].gradient
    }));
    
    return (
      <div className="bg-[#0F172A] rounded-lg overflow-hidden backdrop-blur-sm">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-t-lg border-b border-slate-700">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Воронка рекрутинга
          </h2>
        </div>
        
        <div className="bg-[#111827]/95 p-6">
          <div className="space-y-4">
            {updatedFunnelData.map((item, index) => {
              // Расчет относительной ширины для элемента воронки
              const width = item.value > 0 ? Math.max(item.value / maxValue * 100, 5) : 0;
              
              // Расчет процента от общего количества заявок
              const percentOfTotal = totalApplications > 0 
                ? Math.round((item.value / totalApplications) * 100)
                : 0;
              
              // Текст процента
              const percentText = totalApplications > 0 ? `${percentOfTotal}%` : "0%";
              
              return (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 group"
                  onMouseEnter={() => setHoveredFunnelItem(index)}
                  onMouseLeave={() => setHoveredFunnelItem(null)}
                >
                  <div className="w-full sm:w-1/3 flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                    <div className="text-slate-300 font-medium">{item.label}</div>
                  </div>
                  
                  <div className="w-full sm:w-2/3 h-[48px] relative">
                    <div className="absolute left-0 top-0 h-full w-full bg-slate-800/50 rounded-lg overflow-hidden"></div>
                    
                    {item.value > 0 && (
                      <div 
                        className={`absolute left-0 top-0 h-full bg-gradient-to-r ${item.gradient} rounded-lg transition-all duration-300 flex items-center px-4 group-hover:brightness-110`} 
                        style={{ 
                          width: `${width}%`,
                          boxShadow: hoveredFunnelItem === index ? '0 0 20px rgba(255, 255, 255, 0.2)' : 'none',
                        }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="text-white font-bold tracking-wide drop-shadow-md">{item.value}</div>
                          
                          {/* Percent indicator */}
                          <div className="text-white/80 text-sm font-medium">
                            {percentText}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Компонент для отображения детальной статистики источников
  const DetailedSourcesChart = () => {
    const detailedData = detailedSourceType === 'telegram' 
      ? getDetailedTelegramSourcesData() 
      : [];
    
    const [selectedYear, setSelectedYear] = useState('2025');
    const [selectedMonth, setSelectedMonth] = useState('Март');
    const [displayMode, setDisplayMode] = useState('По месяцам'); 
    const [enableComparison, setEnableComparison] = useState(false);
    
    // Фиктивные данные для сравнения (имитация данных за предыдущий период)
    const comparisonData = useMemo(() => {
      return detailedData.map(item => ({
        ...item,
        value: Math.max(Math.floor(item.value * (0.7 + Math.random() * 0.5)), 0), // 70-120% от текущего значения
        percent: Math.floor(item.percent * (0.7 + Math.random() * 0.5))
      }));
    }, [detailedData]);
    
    return (
      <div className="bg-[#0F172A] rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="text-2xl font-bold text-white">Источники из Telegram бота</div>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={() => setIsDetailedSourcesDialogOpen(false)}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pb-4 grid grid-cols-5 gap-4">
          <div>
            <div className="text-gray-400 text-sm mb-2">Тип диаграммы</div>
            <div className="flex bg-[#1E293B] rounded-lg p-1">
              <button className="py-1.5 px-3 rounded-md text-sm bg-blue-600 text-white w-full">
                Гистограмма
              </button>
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">Год</div>
            <div className="relative">
              <select 
                className="w-full bg-[#1E293B] border border-gray-700 rounded-lg p-2 text-white appearance-none cursor-pointer pr-8"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">Месяц</div>
            <div className="relative">
              <select 
                className="w-full bg-[#1E293B] border border-gray-700 rounded-lg p-2 text-white appearance-none cursor-pointer pr-8"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="Январь">Январь</option>
                <option value="Февраль">Февраль</option>
                <option value="Март">Март</option>
                <option value="Апрель">Апрель</option>
                <option value="Май">Май</option>
                <option value="Июнь">Июнь</option>
                <option value="Июль">Июль</option>
                <option value="Август">Август</option>
                <option value="Сентябрь">Сентябрь</option>
                <option value="Октябрь">Октябрь</option>
                <option value="Ноябрь">Ноябрь</option>
                <option value="Декабрь">Декабрь</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">Режим отображения</div>
            <div className="flex bg-[#1E293B] rounded-lg p-1">
              <button 
                className={`py-1.5 px-3 rounded-md text-sm ${displayMode === 'По месяцам' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
                onClick={() => setDisplayMode('По месяцам')}
              >
                По месяцам
              </button>
              <button 
                className={`py-1.5 px-3 rounded-md text-sm ${displayMode === 'По дням' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
                onClick={() => setDisplayMode('По дням')}
              >
                По дням
              </button>
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">Режим сравнения</div>
            <button 
              className={`w-full rounded-lg p-2 text-sm ${enableComparison ? 'bg-blue-600 text-white' : 'bg-[#1E293B] border border-gray-700 text-gray-300'}`}
              onClick={() => setEnableComparison(!enableComparison)}
            >
              {enableComparison ? 'Отключить сравнение' : 'Включить сравнение'}
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-xl font-semibold text-white">
            Источники из Telegram бота за {selectedMonth} {selectedYear}
            {enableComparison && <span className="text-gray-400 text-base ml-2">(сравнение с предыдущим периодом)</span>}
          </h3>
        </div>

        <div className="relative px-6 pb-6">
          {detailedData.map((item, index) => {
            const comparisonItem = enableComparison ? comparisonData[index] : null;
            const maxValue = Math.max(
              ...detailedData.map(s => s.value),
              ...(enableComparison ? comparisonData.map(s => s.value) : [0])
            );
            
            return (
              <div key={item.name} className="flex items-center my-4">
                <div className="w-36 text-right pr-4 text-white">{item.name}</div>
                <div className="flex-1 relative h-8">
                  {/* Текущий период - основная полоса */}
                  <div 
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ 
                      width: `${Math.min((item.value / maxValue) * 100, 100)}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                  
                  {/* Предыдущий период - полоса сравнения */}
                  {enableComparison && comparisonItem && (
                    <div 
                      className="absolute inset-y-0 left-0 rounded border-2 border-white/20 h-5 top-[6px]"
                      style={{ 
                        width: `${Math.min((comparisonItem.value / maxValue) * 100, 100)}%`,
                        backgroundColor: 'transparent'
                      }}
                    ></div>
                  )}
                  
                  {/* Значение */}
                  <div className="absolute inset-y-0 right-2 flex items-center text-white">
                    {item.value}
                    {enableComparison && comparisonItem && (
                      <span className={`ml-2 text-xs ${item.value > comparisonItem.value ? 'text-green-400' : item.value < comparisonItem.value ? 'text-red-400' : 'text-gray-400'}`}>
                        {item.value > comparisonItem.value ? '↑' : item.value < comparisonItem.value ? '↓' : '='} 
                        {comparisonItem.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="flex justify-between text-gray-400 text-xs mt-2">
            <div>0</div>
            <div>3</div>
            <div>6</div>
            <div>9</div>
          </div>
          
          {enableComparison && (
            <div className="mt-4 flex items-center text-sm">
              <div className="h-3 w-24 bg-blue-500 rounded mr-2"></div>
              <span className="text-white mr-4">Текущий период</span>
              
              <div className="h-3 w-24 border-2 border-white/20 rounded mr-2"></div>
              <span className="text-white">Предыдущий период</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Функция для подсчета статистики
  const calculateStats = (apps: ApplicationItem[], hhCands: HHCandidateItem[], vacancies: any[] = []): CounterData => {
    console.log('Начало подсчета статистики');
    console.log('Количество обычных заявок:', apps.length);
    console.log('Количество HH кандидатов:', hhCands.length);
    console.log('Количество вакансий:', vacancies.length);

    // Подсчет активных и закрытых вакансий
    let activeVacancies = 0;
    let closedVacancies = 0;
    
    if (vacancies && vacancies.length > 0) {
      // Логируем все вакансии и их статусы для отладки
      console.log('Статусы всех вакансий:', vacancies.map(v => ({id: v.id, title: v.title, status: v.status})));
      
      vacancies.forEach(vacancy => {
        // Проверяем разные возможные статусы закрытых вакансий (приводим к нижнему регистру для избежания проблем)
        const status = vacancy.status?.toLowerCase();
        if (status === 'closed') {
          closedVacancies++;
          console.log(`Закрытая вакансия найдена: ID=${vacancy.id}, Название=${vacancy.title}, Статус=${vacancy.status}`);
        } else {
          // Считаем активными все вакансии, которые не закрыты (new, in_progress)
          activeVacancies++;
          console.log(`Активная вакансия найдена: ID=${vacancy.id}, Название=${vacancy.title}, Статус=${vacancy.status}`);
        }
      });
    }

    console.log(`Итоговый подсчет: ${activeVacancies} активных вакансий, ${closedVacancies} закрытых вакансий`);

    // Подсчет статусов обычных заявок
    const appStatuses = {
      new_candidates: 0,
      consideration: 0,
      phone_interview: 0,
      interviews: 0,
      security_check: 0,
      offers: 0,
      document_collection: 0,
      hired: 0,
      reserve: 0,
      rejected: 0
    };
    
    apps.forEach(app => {
      const status = app.status.toLowerCase();
      switch (status) {
        case 'новый':
          appStatuses.new_candidates++;
          break;
        case 'на рассмотрении':
          appStatuses.consideration++;
          break;
        case 'телефонное интервью':
          appStatuses.phone_interview++;
          break;
        case 'собеседование':
          appStatuses.interviews++;
          break;
        case 'служба безопасности':
          appStatuses.security_check++;
          break;
        case 'оффер':
          appStatuses.offers++;
          break;
        case 'сбор документов':
          appStatuses.document_collection++;
          break;
        case 'принят на работу':
          appStatuses.hired++;
          break;
        case 'резерв':
          appStatuses.reserve++;
          break;
        case 'отказ':
          appStatuses.rejected++;
          break;
      }
    });

    // Подсчет статусов HH кандидатов
    const hhStatuses = {
      hh_new: 0,
      hh_consideration: 0,
      hh_phone_interview: 0,
      hh_interviews: 0,
      hh_security_check: 0,
      hh_offers: 0,
      hh_document_collection: 0,
      hh_hired: 0,
      hh_reserve: 0,
      hh_rejected: 0
    };
    
    hhCands.forEach(candidate => {
      const status = candidate.status.toLowerCase();
      switch (status) {
        case 'новый':
          hhStatuses.hh_new++;
          break;
        case 'на рассмотрении':
          hhStatuses.hh_consideration++;
          break;
        case 'телефонное интервью':
          hhStatuses.hh_phone_interview++;
          break;
        case 'собеседование':
          hhStatuses.hh_interviews++;
          break;
        case 'служба безопасности':
          hhStatuses.hh_security_check++;
          break;
        case 'оффер':
          hhStatuses.hh_offers++;
          break;
        case 'сбор документов':
          hhStatuses.hh_document_collection++;
          break;
        case 'принят на работу':
          hhStatuses.hh_hired++;
          break;
        case 'резерв':
          hhStatuses.hh_reserve++;
          break;
        case 'отказ':
          hhStatuses.hh_rejected++;
          break;
      }
    });

    // Создаем объект с данными статистики
    const stats: CounterData = {
      active_vacancies: activeVacancies,
      closed_vacancies: closedVacancies,
      ...appStatuses,
      hh_candidates: hhCands.length,
      ...hhStatuses,
      // Комбинированная статистика
      combined_new: appStatuses.new_candidates + hhStatuses.hh_new,
      combined_consideration: appStatuses.consideration + hhStatuses.hh_consideration,
      combined_phone_interview: appStatuses.phone_interview + hhStatuses.hh_phone_interview,
      combined_interviews: appStatuses.interviews + hhStatuses.hh_interviews,
      combined_security_check: appStatuses.security_check + hhStatuses.hh_security_check,
      combined_offers: appStatuses.offers + hhStatuses.hh_offers,
      combined_document_collection: appStatuses.document_collection + hhStatuses.hh_document_collection,
      combined_hired: appStatuses.hired + hhStatuses.hh_hired,
      combined_reserve: appStatuses.reserve + hhStatuses.hh_reserve,
      combined_rejected: appStatuses.rejected + hhStatuses.hh_rejected
    };

    console.log('Рассчитанная статистика:', stats);
    return stats;
  };

  // Функция для обновления данных воронки
  const updateFunnelData = (stats: CounterData) => {
    setFunnelData([
      { 
        label: 'Новый', 
        value: stats.combined_new,
        color: '#4287f5',
        gradient: 'from-blue-600 to-blue-400'
      },
      { 
        label: 'На рассмотрении', 
        value: stats.combined_consideration,
        color: '#f59e0b',
        gradient: 'from-orange-500 to-orange-400'
      },
      { 
        label: 'Телефонное интервью', 
        value: stats.combined_phone_interview,
        color: '#f97316',
        gradient: 'from-orange-600 to-orange-400'
      },
      { 
        label: 'Собеседование', 
        value: stats.combined_interviews,
        color: '#a855f7',
        gradient: 'from-purple-600 to-purple-400'
      },
      { 
        label: 'Служба безопасности', 
        value: stats.combined_security_check,
        color: '#14b8a6',
        gradient: 'from-teal-600 to-teal-400'
      },
      { 
        label: 'Оффер', 
        value: stats.combined_offers,
        color: '#ec4899',
        gradient: 'from-pink-600 to-pink-400'
      },
      { 
        label: 'Сбор документов', 
        value: stats.combined_document_collection,
        color: '#6366f1',
        gradient: 'from-indigo-600 to-indigo-400'
      },
      { 
        label: 'Принят на работу', 
        value: stats.combined_hired,
        color: '#22c55e',
        gradient: 'from-green-600 to-green-400'
      },
      { 
        label: 'Резерв', 
        value: stats.combined_reserve,
        color: '#64748b',
        gradient: 'from-slate-600 to-slate-400'
      },
      { 
        label: 'Отказ', 
        value: stats.combined_rejected,
        color: '#ef4444',
        gradient: 'from-red-600 to-red-400'
      }
    ]);
  };

  // Обработчик для отображения KPI рекрутеров
  const handleRecruiterKpiClick = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Получаем список всех рекрутеров
      const recruitersResponse = await fetch(`${config.apiUrl}/users/?role=recruiter`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!recruitersResponse.ok) {
        throw new Error(`Failed to fetch recruiters: ${recruitersResponse.status}`);
      }

      const recruitersData = await recruitersResponse.json();
      console.log('DEBUG: Получены рекрутеры:', recruitersData);
      
      // Если нет данных о рекрутерах, показываем сообщение
      if (!recruitersData || recruitersData.length === 0) {
        toast.error('Нет данных о рекрутерах в системе');
        setIsLoading(false);
        return;
      }
      
      // Создаем базовые KPI данные для всех рекрутеров
      let initialKpiData = recruitersData.map((recruiter: any) => ({
        id: recruiter.id,
        name: recruiter.full_name || 'Без имени',
        email: recruiter.email || 'Нет email',
        position: recruiter.position || 'Рекрутер',
        activeVacancies: 0,
        closedVacancies: 0,
        totalVacancies: 0,
        newCandidates: 0,
        interviewCandidates: 0,
        offerCandidates: 0,
        hiredCandidates: 0,
        rejectedCandidates: 0,
        totalCandidates: 0,
        conversionRate: '0%',
        conversionRateValue: 0,
        avgClosingTime: '0 дней',
        avgClosingTimeValue: 0
      }));
      
      // Получаем все заявки и вакансии для анализа
      const { start_date, end_date } = getMonthFilterParams();
      
      // Получаем все заявки
      const applicationsResponse = await fetch(`${config.apiUrl}/applications/?start_date=${start_date}&end_date=${end_date}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!applicationsResponse.ok) {
        throw new Error(`Failed to fetch applications: ${applicationsResponse.status}`);
      }

      const allApplications = await applicationsResponse.json();
      console.log('DEBUG: Получены заявки:', allApplications.length);
      
      // Получаем вакансии
      const vacanciesResponse = await fetch(`${config.apiUrl}/vacancies/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!vacanciesResponse.ok) {
        throw new Error(`Failed to fetch vacancies: ${vacanciesResponse.status}`);
      }

      const allVacancies = await vacanciesResponse.json();
      console.log('DEBUG: Получены вакансии:', allVacancies.length);
      
      // Выводим статус вакансий для отладки
      allVacancies.forEach((vacancy: any) => {
        console.log(`DEBUG: Вакансия ID ${vacancy.id}, статус: ${vacancy.status}, название: ${vacancy.title}`);
      });
      
      // Получаем назначения вакансий
      const assignmentsResponse = await fetch(`${config.apiUrl}/vacancy-assignments/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!assignmentsResponse.ok) {
        throw new Error(`Failed to fetch vacancy assignments: ${assignmentsResponse.status}`);
      }

      const allAssignments = await assignmentsResponse.json();
      console.log('DEBUG: Получены назначения вакансий:', allAssignments.length);
      
      // Если нет данных о назначениях, показываем сообщение
      if (!allAssignments || allAssignments.length === 0) {
        toast.error('Нет данных о назначении вакансий рекрутерам');
        // Показываем таблицу с нулевыми значениями, т.к. рекрутеры есть
        setRecruiterKpiData(initialKpiData);
        setIsRecruiterKpiDialogOpen(true);
        setIsLoading(false);
        return;
      }
      
      // Создаем индекс вакансий по ID для быстрого поиска
      const vacanciesById = Object.fromEntries(
        allVacancies.map((vacancy: any) => [vacancy.id, vacancy])
      );
      
      // Создаем индекс назначений по ID вакансии для быстрого поиска
      const assignmentsByVacancyId: Record<number, any[]> = {};
      allAssignments.forEach((assignment: any) => {
        if (!assignmentsByVacancyId[assignment.vacancy_id]) {
          assignmentsByVacancyId[assignment.vacancy_id] = [];
        }
        assignmentsByVacancyId[assignment.vacancy_id].push(assignment);
      });
      
      // Создаем индекс назначений по ID кандидата (если есть)
      const assignmentsByCandidateId: Record<number, any[]> = {};
      allAssignments.forEach((assignment: any) => {
        if (assignment.candidate_id) {
          if (!assignmentsByCandidateId[assignment.candidate_id]) {
            assignmentsByCandidateId[assignment.candidate_id] = [];
          }
          assignmentsByCandidateId[assignment.candidate_id].push(assignment);
        }
      });
      
      // Выводим структуру заявки для отладки
      if (allApplications.length > 0) {
        console.log('DEBUG: Пример структуры заявки:', allApplications[0]);
      }
      
      // Формируем данные KPI для каждого рекрутера
      const kpiData = initialKpiData.map((recruiterData: any) => {
        const recruiter = recruitersData.find((r: any) => r.id === recruiterData.id);
        console.log(`DEBUG: Обработка рекрутера: ${recruiterData.name} (ID: ${recruiterData.id})`);
        
        // Находим все назначения для данного рекрутера
        const recruiterAssignments = allAssignments.filter((assignment: any) => {
          return assignment.recruiter_id === recruiterData.id;
        });
        
        console.log(`DEBUG: Найдено ${recruiterAssignments.length} назначений для рекрутера ${recruiterData.id}`);
        
        // Выводим назначения для отладки
        recruiterAssignments.forEach((assignment: any) => {
          console.log(`DEBUG: Назначение: vacancy_id=${assignment.vacancy_id}, recruiter_id=${assignment.recruiter_id}`);
        });
        
        // Находим все вакансии, назначенные рекрутеру
        const recruiterVacancyIds = recruiterAssignments.map((assignment: any) => assignment.vacancy_id);
        const recruiterVacancies = recruiterVacancyIds
          .map((id: number) => vacanciesById[id])
          .filter(Boolean);
        
        console.log(`DEBUG: Найдено ${recruiterVacancies.length} вакансий для рекрутера ${recruiterData.id}`);
        
        // Подсчитываем количество активных и закрытых вакансий
        const activeVacancies = recruiterVacancies.filter((vacancy: any) => 
          vacancy.status?.toLowerCase() !== 'closed'
        ).length;
        
        const closedVacancies = recruiterVacancies.filter((vacancy: any) => 
          vacancy.status?.toLowerCase() === 'closed'
        ).length;
        
        console.log(`DEBUG: Рекрутер ${recruiterData.id} - Активные вакансии: ${activeVacancies}, Закрытые вакансии: ${closedVacancies}`);
        
        // Список ID вакансий, назначенных рекрутеру (для связи с заявками)
        const vacancyIds = recruiterVacancies.map((v: any) => v.id);
        
        // Находим кандидатов, обработанных рекрутером
        // Используем расширенную логику связи заявок с рекрутерами
        const recruiterApplications = allApplications.filter((app: any) => {
          // 1. Прямая связь через поля recruiter_id, processed_by или assigned_to
          const byRecruiterId = app.recruiter_id === recruiterData.id;
          const byProcessedBy = app.processed_by === recruiterData.id;
          const byAssignedTo = app.assigned_to === recruiterData.id;
          
          if (byRecruiterId || byProcessedBy || byAssignedTo) {
            console.log(`DEBUG: Заявка ${app.id} связана напрямую с рекрутером ${recruiterData.id}`);
            return true;
          }
          
          // 2. Связь через vacancy_id, если такое поле есть у заявки
          if (app.vacancy_id && vacancyIds.includes(app.vacancy_id)) {
            console.log(`DEBUG: Заявка ${app.id} связана с рекрутером ${recruiterData.id} через вакансию ${app.vacancy_id}`);
            return true;
          }
          
          // 3. Связь через candidate_id в назначениях (если такое поле есть)
          if (app.id && assignmentsByCandidateId[app.id]) {
            const candidateAssignments = assignmentsByCandidateId[app.id];
            for (const assignment of candidateAssignments) {
              if (assignment.recruiter_id === recruiterData.id) {
                console.log(`DEBUG: Заявка ${app.id} связана с рекрутером ${recruiterData.id} через назначение вакансии как кандидат`);
                return true;
              }
            }
          }
          
          // 4. Автоматическое назначение всех заявок рекрутеру, если он единственный
          // (Этот шаг можно закомментировать, если не нужен)
          /*
          if (recruitersData.length === 1) {
            console.log(`DEBUG: Заявка ${app.id} автоматически связана с единственным рекрутером ${recruiterData.id}`);
            return true;
          }
          */
          
          return false;
        });
        
        console.log(`DEBUG: Найдено ${recruiterApplications.length} заявок для рекрутера ${recruiterData.id}`);
        
        // В качестве временного решения, если нет связей заявок с рекрутерами,
        // но есть назначения вакансий, распределяем все заявки по рекрутерам пропорционально их вакансиям
        if (recruiterApplications.length === 0 && recruiterVacancies.length > 0 && allApplications.length > 0) {
          console.log(`DEBUG: Применяем пропорциональное распределение заявок для рекрутера ${recruiterData.id}`);
          
          // Вычисляем долю вакансий этого рекрутера от общего числа
          const totalVacancies = allVacancies.length;
          const recruiterShare = recruiterVacancies.length / totalVacancies;
          
          // Присваиваем соответствующую долю заявок рекрутеру
          const applicationsCount = Math.round(allApplications.length * recruiterShare);
          const applicationsToAssign = allApplications.slice(0, applicationsCount);
          
          console.log(`DEBUG: Пропорционально присваиваем ${applicationsToAssign.length} заявок рекрутеру ${recruiterData.id}`);
          
          // Используем эти заявки для расчета KPI
          // Примечание: в реальном приложении это временное решение, которое следует заменить
          // на более корректное распределение заявок по рекрутерам
          if (applicationsToAssign.length > 0) {
            const newCandidates = applicationsToAssign.filter((app: any) => 
              app.status?.toLowerCase() === 'новый'
            ).length;
            
            const interviewCandidates = applicationsToAssign.filter((app: any) => 
              app.status?.toLowerCase() === 'собеседование' || 
              app.status?.toLowerCase() === 'телефонное интервью'
            ).length;
            
            const offerCandidates = applicationsToAssign.filter((app: any) => 
              app.status?.toLowerCase() === 'оффер'
            ).length;
            
            const hiredCandidates = applicationsToAssign.filter((app: any) => 
              app.status?.toLowerCase() === 'принят на работу'
            ).length;
            
            const rejectedCandidates = applicationsToAssign.filter((app: any) => 
              app.status?.toLowerCase() === 'отказ'
            ).length;
            
            // Вычисляем конверсию (процент успешных наймов)
            const conversionRate = applicationsToAssign.length > 0 
              ? Math.round((hiredCandidates / applicationsToAssign.length) * 100) 
              : 0;
            
            // Вычисляем среднее время закрытия вакансий (в днях)
            let avgClosingTime = 0;
            const closedVacanciesWithDates = recruiterVacancies.filter((vacancy: any) => 
              vacancy.status?.toLowerCase() === 'closed' && 
              vacancy.created_at && 
              vacancy.closed_at
            );
            
            if (closedVacanciesWithDates.length > 0) {
              const totalDays = closedVacanciesWithDates.reduce((sum: number, vacancy: any) => {
                const createdDate = new Date(vacancy.created_at);
                const closedDate = new Date(vacancy.closed_at);
                const diffTime = Math.abs(closedDate.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return sum + diffDays;
              }, 0);
              
              avgClosingTime = Math.round(totalDays / closedVacanciesWithDates.length);
            }
            
            return {
              ...recruiterData,
              activeVacancies,
              closedVacancies,
              totalVacancies: activeVacancies + closedVacancies,
              newCandidates,
              interviewCandidates,
              offerCandidates,
              hiredCandidates,
              rejectedCandidates,
              totalCandidates: applicationsToAssign.length,
              conversionRate: `${conversionRate}%`,
              conversionRateValue: conversionRate,
              avgClosingTime: `${avgClosingTime} дней`,
              avgClosingTimeValue: avgClosingTime
            };
          }
        }
        
        // Стандартная обработка заявок, если нашли их связи с рекрутером
        const newCandidates = recruiterApplications.filter((app: any) => 
          app.status?.toLowerCase() === 'новый'
        ).length;
        
        const interviewCandidates = recruiterApplications.filter((app: any) => 
          app.status?.toLowerCase() === 'собеседование' || 
          app.status?.toLowerCase() === 'телефонное интервью'
        ).length;
        
        const offerCandidates = recruiterApplications.filter((app: any) => 
          app.status?.toLowerCase() === 'оффер'
        ).length;
        
        const hiredCandidates = recruiterApplications.filter((app: any) => 
          app.status?.toLowerCase() === 'принят на работу'
        ).length;
        
        const rejectedCandidates = recruiterApplications.filter((app: any) => 
          app.status?.toLowerCase() === 'отказ'
        ).length;
        
        console.log(`DEBUG: Рекрутер ${recruiterData.id} - Статусы кандидатов: ` +
                   `Новый: ${newCandidates}, Интервью: ${interviewCandidates}, ` +
                   `Оффер: ${offerCandidates}, Принят: ${hiredCandidates}, Отказ: ${rejectedCandidates}`);
        
        // Вычисляем конверсию (процент успешных наймов)
        const conversionRate = recruiterApplications.length > 0 
          ? Math.round((hiredCandidates / recruiterApplications.length) * 100) 
          : 0;
        
        // Вычисляем среднее время закрытия вакансий (в днях)
        let avgClosingTime = 0;
        const closedVacanciesWithDates = recruiterVacancies.filter((vacancy: any) => 
          vacancy.status?.toLowerCase() === 'closed' && 
          vacancy.created_at && 
          vacancy.closed_at
        );
        
        if (closedVacanciesWithDates.length > 0) {
          const totalDays = closedVacanciesWithDates.reduce((sum: number, vacancy: any) => {
            const createdDate = new Date(vacancy.created_at);
            const closedDate = new Date(vacancy.closed_at);
            const diffTime = Math.abs(closedDate.getTime() - createdDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return sum + diffDays;
          }, 0);
          
          avgClosingTime = Math.round(totalDays / closedVacanciesWithDates.length);
        }
        
        return {
          ...recruiterData,
          activeVacancies,
          closedVacancies,
          totalVacancies: activeVacancies + closedVacancies,
          newCandidates,
          interviewCandidates,
          offerCandidates,
          hiredCandidates,
          rejectedCandidates,
          totalCandidates: recruiterApplications.length,
          conversionRate: `${conversionRate}%`,
          conversionRateValue: conversionRate,
          avgClosingTime: `${avgClosingTime} дней`,
          avgClosingTimeValue: avgClosingTime
        };
      });
      
      console.log('DEBUG: Итоговые KPI рекрутеров:', kpiData);
      setRecruiterKpiData(kpiData);
      setIsRecruiterKpiDialogOpen(true);
    } catch (error) {
      console.error('Ошибка при загрузке данных KPI рекрутеров:', error);
      toast.error('Ошибка при загрузке данных KPI рекрутеров. Проверьте консоль для подробностей.');
      // Не используем демо-данные, просто показываем ошибку
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для генерации тестовых данных KPI рекрутеров
  const generateDemoRecruiterData = (id: number, name: string) => {
    // Генерируем случайные значения для демонстрации
    const activeVacancies = Math.floor(Math.random() * 5) + 1;
    const closedVacancies = Math.floor(Math.random() * 8) + 2;
    const totalVacancies = activeVacancies + closedVacancies;
    
    const newCandidates = Math.floor(Math.random() * 10) + 5;
    const interviewCandidates = Math.floor(Math.random() * 8) + 2;
    const offerCandidates = Math.floor(Math.random() * 5) + 1;
    const hiredCandidates = Math.floor(Math.random() * 4) + 1;
    const rejectedCandidates = Math.floor(Math.random() * 6) + 2;
    const totalCandidates = newCandidates + interviewCandidates + offerCandidates + hiredCandidates + rejectedCandidates;
    
    const conversionRate = Math.round((hiredCandidates / totalCandidates) * 100);
    const avgClosingTime = Math.floor(Math.random() * 20) + 5;
    
    return {
      activeVacancies,
      closedVacancies,
      totalVacancies,
      newCandidates,
      interviewCandidates,
      offerCandidates,
      hiredCandidates,
      rejectedCandidates,
      totalCandidates,
      conversionRate: `${conversionRate}%`,
      conversionRateValue: conversionRate,
      avgClosingTime: `${avgClosingTime} дней`,
      avgClosingTimeValue: avgClosingTime
    };
  };
  
  // Функция для генерации демонстрационных данных KPI рекрутеров
  const generateDemoKpiData = () => {
    const demoRecruiters = [
      { id: 1, name: "Анна Смирнова", email: "anna@example.com", position: "Старший рекрутер" },
      { id: 2, name: "Иван Петров", email: "ivan@example.com", position: "Менеджер по подбору" },
      { id: 3, name: "Мария Иванова", email: "maria@example.com", position: "HR-специалист" },
      { id: 4, name: "Алексей Соколов", email: "alex@example.com", position: "Рекрутер" }
    ];
    
    return demoRecruiters.map(recruiter => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      position: recruiter.position,
      ...generateDemoRecruiterData(recruiter.id, recruiter.name)
    }));
  };

  // Обработчик выбора рекрутера для сравнения
  const handleRecruiterSelect = (recruiterId: number) => {
    setSelectedRecruiters(prev => {
      if (prev.includes(recruiterId)) {
        return prev.filter(id => id !== recruiterId);
      } else {
        return [...prev, recruiterId];
      }
    });
  };
  
  // Обработчик для открытия диалога сравнения рекрутеров
  const handleCompareRecruiters = () => {
    if (selectedRecruiters.length < 2) {
      toast.error('Выберите как минимум двух рекрутеров для сравнения');
      return;
    }
    
    setIsRecruiterCompareDialogOpen(true);
  };

  // Функция экспорта данных в Excel
  const exportToExcel = () => {
    try {
      if (!recruiterKpiData || recruiterKpiData.length === 0) {
        toast.error('Нет данных для экспорта');
        return;
      }

      // Готовим данные для экспорта
      const exportData = recruiterKpiData.map(recruiter => ({
        'Рекрутер': recruiter.name,
        'Email': recruiter.email,
        'Должность': recruiter.position,
        'Активные вакансии': recruiter.activeVacancies,
        'Закрытые вакансии': recruiter.closedVacancies,
        'Всего вакансий': recruiter.totalVacancies,
        'Всего кандидатов': recruiter.totalCandidates,
        'На интервью': recruiter.interviewCandidates,
        'Оффер': recruiter.offerCandidates,
        'Принято': recruiter.hiredCandidates,
        'Отказ': recruiter.rejectedCandidates,
        'Конверсия': recruiter.conversionRate,
        'Среднее время закрытия': recruiter.avgClosingTime
      }));

      // Создаем книгу Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI рекрутеров');

      // Получаем текущую дату для имени файла
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Скачиваем файл
      XLSX.writeFile(workbook, `KPI_recruiters_${dateStr}.xlsx`);
      
      toast.success('Данные успешно экспортированы в Excel');
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      toast.error('Ошибка при экспорте данных');
    }
  };

  // Обработчик клика по карточке активных вакансий
  const handleActiveVacanciesClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/vacancies/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vacancies: ${response.status}`);
      }

      const data = await response.json();
      
      // Фильтруем только активные вакансии
      const activeVacancies = data.filter((vacancy: any) => 
        vacancy.status?.toLowerCase() !== 'closed'
      );
      
      console.log('Активные вакансии:', activeVacancies);
      setVacanciesList(activeVacancies);
      setVacanciesDialogTitle('Активные вакансии');
      setIsVacanciesDialogOpen(true);
    } catch (error) {
      console.error('Ошибка при загрузке активных вакансий:', error);
      toast.error('Не удалось загрузить список активных вакансий');
    }
  };

  console.log('[Render] Current counters state:', counters); // Log counters state on render

  return (
    <div className="p-6 fade-in">
      <div className="animated-background" />
      
      <div className="glass-card rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white">Аналитика</h1>
            <p className="text-gray-300">
              Статистика по заявкам и вакансиям 
              {isLoading && <span className="ml-2 animate-pulse">загрузка...</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setIsFunnelDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              disabled={isLoading}
            >
              <ChartBarSquareIcon className="w-5 h-5 mr-2" />
              Воронка рекрутинга
            </Button>
            <Button 
              onClick={() => setIsStatusHistoryDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              disabled={isLoading}
            >
              <ChartBarIcon className="w-5 h-5" />
              История статусов
            </Button>
            <Button 
              onClick={() => setIsSourcesStatisticsDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              disabled={isLoading}
            >
              <ChartPieIcon className="w-5 h-5" />
              Статистика источников
            </Button>
            <Button 
              onClick={handleRecruiterKpiClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
              disabled={isLoading}
            >
              <UsersIcon className="w-5 h-5" />
              KPI рекрутеров
            </Button>
            <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
                className={`bg-[#1e1f25] text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                <option value="Январь">Январь</option>
                <option value="Февраль">Февраль</option>
                <option value="Март">Март</option>
                <option value="Апрель">Апрель</option>
                <option value="Май">Май</option>
                <option value="Июнь">Июнь</option>
                <option value="Июль">Июль</option>
                <option value="Август">Август</option>
                <option value="Сентябрь">Сентябрь</option>
                <option value="Октябрь">Октябрь</option>
                <option value="Ноябрь">Ноябрь</option>
                <option value="Декабрь">Декабрь</option>
            </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          // Показываем скелетон загрузки для карточек
          Array(10).fill(0).map((_, index) => (
            <div key={index} className="rounded-lg border border-[#1e3a5f] bg-[#0d2137]/95 p-6 animate-pulse">
              <div className="flex items-center">
                <div className="bg-slate-700 p-3 rounded-lg w-12 h-12"></div>
                <div className="ml-4 w-full">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          cards.map((card) => (
            <div
              key={card.name}
              className={`rounded-lg border border-[#1e3a5f] bg-[#0d2137]/95 p-6 transition-all duration-300 group
                ${card.clickable 
                  ? 'cursor-pointer hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 hover:scale-[1.03] hover:bg-[#0d2842]' 
                  : 'hover:scale-[1.01]'
                }`}
                onClick={() => {
                  if (!card.clickable) return;
                  if (card.specialAction === 'hh') {
                    handleHHCardClick();
                  } else if (card.specialAction === 'closed-vacancies') {
                    handleClosedVacanciesClick();
                  } else if (card.specialAction === 'active-vacancies') {
                    handleActiveVacanciesClick();
                  } else {
                    handleCardClick(card.name);
                  }
                }}
            >
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-lg transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{card.name}</p>
                  <p className={`text-2xl font-semibold ${card.textColor} transition-all duration-300 ${card.clickable ? 'group-hover:text-blue-300' : ''}`}>
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Диалоговое окно с воронкой рекрутинга */}
      <Dialog open={isFunnelDialogOpen} onOpenChange={setIsFunnelDialogOpen}>
        <DialogContent className="max-w-6xl bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-blue-300">Воронка рекрутинга</DialogTitle>
          </DialogHeader>
          <FunnelChart />
          
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                try {
                  // Создаем и скачиваем Excel прямо здесь
                  // Получаем данные с воронки из нашего стейта
                  const dataForExport = [
                    { label: 'Новый', value: counters.combined_new },
                    { label: 'На рассмотрении', value: counters.combined_consideration },
                    { label: 'Телефонное интервью', value: counters.combined_phone_interview },
                    { label: 'Собеседование', value: counters.combined_interviews },
                    { label: 'Служба безопасности', value: counters.combined_security_check },
                    { label: 'Оффер', value: counters.combined_offers },
                    { label: 'Сбор документов', value: counters.combined_document_collection },
                    { label: 'Принят на работу', value: counters.combined_hired },
                    { label: 'Резерв', value: counters.combined_reserve },
                    { label: 'Отказ', value: counters.combined_rejected }
                  ];
                  
                  // Преобразуем данные для Excel
                  const exportData = dataForExport.map(item => ({
                    'Статус': item.label,
                    'Количество кандидатов': item.value
                  }));
                  
                  // Добавляем итоговую строку
                  const totalCandidates = dataForExport.reduce((sum, item) => sum + item.value, 0);
                  exportData.push({
                    'Статус': 'ВСЕГО',
                    'Количество кандидатов': totalCandidates
                  });
                  
                  // Создаем книгу Excel
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  
                  // Устанавливаем ширину столбцов
                  const colWidths = [
                    { wch: 25 }, // Статус
                    { wch: 20 }  // Количество кандидатов
                  ];
                  ws['!cols'] = colWidths;
                  
                  // Добавляем лист в книгу
                  XLSX.utils.book_append_sheet(wb, ws, 'Воронка рекрутинга');
                  
                  // Сохраняем файл
                  XLSX.writeFile(wb, `Воронка_рекрутинга_${new Date().toISOString().split('T')[0]}.xlsx`);
                  console.log('Excel файл успешно создан и скачан');
                  toast.success('Данные успешно экспортированы');
                } catch (error) {
                  console.error('Ошибка при экспорте:', error);
                  toast.error('Произошла ошибка при экспорте данных');
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md text-base flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium w-48 justify-center"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Скачать в Excel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалоговое окно с детальной статистикой по источникам из Telegram бота */}
      <Dialog open={isDetailedSourcesDialogOpen} onOpenChange={setIsDetailedSourcesDialogOpen}>
        <DialogContent className="max-w-4xl bg-transparent border-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Детальная статистика источников</DialogTitle>
          </DialogHeader>
          {/* Удаляем ссылку на несуществующий компонент DetailedSourcesChart */}
          <div className="bg-[#0a1929] p-6 rounded-xl">
            <p className="text-white text-center text-lg">Детальная статистика источников</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно со списком заявок определенного статуса */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-4xl animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-300">
              {selectedStatus} ({getFilteredApplications().length})
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="rounded-lg border border-[#1e3a5f] overflow-hidden shadow-inner shadow-blue-900/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#1e3a5f] bg-[#0a1929]/80">
                    <TableHead className="text-gray-300 font-medium">ФИО</TableHead>
                    <TableHead className="text-gray-300 font-medium">Должность</TableHead>
                    <TableHead className="text-gray-300 font-medium">Контакты</TableHead>
                    <TableHead className="text-gray-300 font-medium">Источник</TableHead>
                    <TableHead className="text-gray-300 font-medium">Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredApplications().map((app) => (
                    <TableRow 
                      key={`${app.source || 'telegram'}-${app.id}`} 
                      className="border-b border-[#1e3a5f] hover:bg-[#0d2842] hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] relative group"
                      onClick={() => fetchApplicationDetails(app.id, app.source)}
                    >
                      <TableCell className="text-white group-hover:text-blue-300 transition-colors">{app.full_name}</TableCell>
                      <TableCell className="text-white group-hover:text-blue-300 transition-colors">{app.position}</TableCell>
                      <TableCell>
                        <div className="text-white group-hover:text-blue-300 transition-colors">
                          <div>{app.phone}</div>
                          <div className="text-sm text-gray-400 group-hover:text-blue-400 transition-colors">{app.telegram}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400 group-hover:text-blue-400 transition-colors">
                        {app.source === 'headhunter' ? 'HeadHunter' : 'Telegram'}
                      </TableCell>
                      <TableCell className="text-gray-400 group-hover:text-blue-400 transition-colors">
                        {formatDate(app.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно с деталями HH кандидата */}
      {selectedHHCandidate && isHHModalOpen && (
        <HHCandidateDialog
          candidate={selectedHHCandidate as HHCandidate}
          onClose={() => {
            setIsHHModalOpen(false);
            setSelectedHHCandidate(null);
          }}
          fetchCandidates={fetchHHCandidates}
        />
      )}

      {/* Модальное окно с деталями обычной заявки */}
      {selectedApplicationData && (
        <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
          <ApplicationDialog
            application={selectedApplicationData}
            onClose={() => {
              setIsApplicationDialogOpen(false);
              setSelectedApplicationData(null);
            }}
            fetchApplications={fetchData}
          />
        </Dialog>
      )}

      {/* Диалог \"История статусов\" */}
      <Dialog open={isStatusHistoryDialogOpen} onOpenChange={setIsStatusHistoryDialogOpen}>
        {/* Увеличим ширину и высоту модального окна */}
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-6xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex justify-between items-center">
              <span>История статусов</span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Обертка для контента с overflow-y (вертикальный скролл для всего контента) */}
          <div className="mt-4 flex-1 overflow-y-auto">
            {/* Внутренняя обертка для горизонтального скролла графика и таблицы */}
            <div className="overflow-x-auto p-1"> {/* Добавим небольшой padding для скроллбара */}
              <StatusHistoryChart
                startDate={statusHistoryDisplayMode === 'daily' ? getMonthFilterParams().start_date : undefined}
                endDate={statusHistoryDisplayMode === 'daily' ? getMonthFilterParams().end_date : undefined}
                displayMode={statusHistoryDisplayMode} // 'daily' или 'monthly'
              />
            </div> {/* Закрытие внутренней обертки */} 
          </div> {/* Закрытие внешней обертки */} 

        </DialogContent>
      </Dialog>

      {/* Диалог со статистикой источников */}
      <Dialog open={isSourcesStatisticsDialogOpen} onOpenChange={setIsSourcesStatisticsDialogOpen}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Статистика источников кандидатов</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <SourceStatisticsChart
              period={selectedMonth}
              displayMode="monthly"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог со списком вакансий */}
      <Dialog open={isVacanciesDialogOpen} onOpenChange={setIsVacanciesDialogOpen}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-4xl animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-300">
              {vacanciesDialogTitle} ({vacanciesList.length})
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="rounded-lg border border-[#1e3a5f] overflow-hidden shadow-inner shadow-blue-900/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#1e3a5f] bg-[#0a1929]/80">
                    <TableHead className="text-gray-300 font-medium">ID</TableHead>
                    <TableHead className="text-gray-300 font-medium">Название</TableHead>
                    <TableHead className="text-gray-300 font-medium">Дата создания</TableHead>
                    {vacanciesDialogTitle === 'Закрытые вакансии' && (
                      <>
                        <TableHead className="text-gray-300 font-medium">Дата закрытия</TableHead>
                        <TableHead className="text-gray-300 font-medium">Закрыта кем</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacanciesList.map((vacancy) => (
                    <TableRow 
                      key={vacancy.id} 
                      className="border-b border-[#1e3a5f] hover:bg-[#0d2842] hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] relative group"
                    >
                      <TableCell className="text-white group-hover:text-blue-300 transition-colors">{vacancy.id}</TableCell>
                      <TableCell className="text-white group-hover:text-blue-300 transition-colors">{vacancy.title}</TableCell>
                      <TableCell className="text-gray-400 group-hover:text-blue-400 transition-colors">
                        {formatDate(vacancy.created_at)}
                      </TableCell>
                      {vacanciesDialogTitle === 'Закрытые вакансии' && (
                        <>
                          <TableCell className="text-gray-400 group-hover:text-blue-400 transition-colors">
                            {vacancy.closed_at ? formatDate(vacancy.closed_at) : '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 group-hover:text-blue-400 transition-colors">
                            {vacancy.closed_by ? vacancy.closed_by.full_name : '-'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог с KPI рекрутеров */}
      <Dialog open={isRecruiterKpiDialogOpen} onOpenChange={setIsRecruiterKpiDialogOpen}>
        <DialogContent className="max-w-screen-xl h-[80vh] overflow-auto bg-[#1f1a35] text-white border border-[#3e3474]">
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="text-xl font-bold text-white">
              KPI рекрутеров ({recruiterKpiData.length})
            </DialogTitle>
            <div className="flex space-x-2">
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                onClick={exportToExcel}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Экспорт в Excel
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-50"
                onClick={handleCompareRecruiters}
                disabled={selectedRecruiters.length < 2}
              >
                <ChartBarIcon className="h-5 w-5" />
                Сравнить выбранных ({selectedRecruiters.length})
              </Button>
            </div>
          </div>
          
          <div className="mt-2 overflow-auto max-h-[calc(90vh-120px)]">
            <div className="rounded-lg border border-[#1e3a5f] overflow-hidden shadow-inner shadow-blue-900/10">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="border-b border-[#1e3a5f] bg-[#0a1929]/80">
                      <TableHead className="text-gray-300 font-medium sticky left-0 bg-[#0a1929]/95 z-20 w-7"></TableHead>
                      <TableHead className="text-gray-300 font-medium sticky left-[28px] bg-[#0a1929]/95 z-20 min-w-[200px]">Рекрутер</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Активные вакансии</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Закрытые вакансии</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Всего вакансий</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Всего кандидатов</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Конверсия</TableHead>
                      <TableHead className="text-gray-300 font-medium text-center whitespace-nowrap px-4">Ср. время закрытия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiterKpiData.length > 0 ? (
                      recruiterKpiData.map((recruiter) => (
                        <TableRow 
                          key={recruiter.id} 
                          className={`border-b border-[#1e3a5f] hover:bg-[#0d2842] hover:border-blue-500 transition-all duration-200 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] relative group ${
                            selectedRecruiters.includes(recruiter.id) ? 'bg-[#0d2842]' : ''
                          }`}
                          onClick={() => handleRecruiterSelect(recruiter.id)}
                        >
                          <TableCell className="text-center sticky left-0 bg-inherit z-20">
                            <div className={`w-4 h-4 border rounded ${
                              selectedRecruiters.includes(recruiter.id) 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-500'
                            }`}>
                              {selectedRecruiters.includes(recruiter.id) && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white group-hover:text-blue-300 transition-colors sticky left-[28px] bg-inherit z-20">
                            <div className="font-medium">{recruiter.name}</div>
                            <div className="text-xs text-gray-400">{recruiter.email}</div>
                            <div className="text-xs text-gray-500">{recruiter.position}</div>
                          </TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.activeVacancies}</TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.closedVacancies}</TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.totalVacancies}</TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.totalCandidates}</TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.conversionRate}</TableCell>
                          <TableCell className="text-center text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{recruiter.avgClosingTime}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin h-6 w-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Загрузка данных...</span>
                            </div>
                          ) : (
                            "Нет данных о рекрутерах"
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог сравнения рекрутеров */}
      <Dialog open={isRecruiterCompareDialogOpen} onOpenChange={setIsRecruiterCompareDialogOpen}>
        <DialogContent className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 text-white max-w-[90vw] max-h-[90vh] animate-in fade-in-50 slide-in-from-bottom-5 duration-300 overflow-hidden">
          <DialogHeader className="sticky top-0 z-10 bg-[#0a1929] pb-2">
            <DialogTitle className="text-xl font-semibold text-blue-300">
              Сравнение рекрутеров ({selectedRecruiters.length})
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 overflow-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-8">
              {/* Получаем выбранных рекрутеров */}
              {selectedRecruiters.length > 0 && (
                <>
                  {/* Информация о выбранных рекрутерах */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recruiterKpiData
                      .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                      .map((recruiter) => (
                        <div key={recruiter.id} className="bg-[#111827] rounded-lg p-4 border border-[#1e3a5f]">
                          <div className="text-lg font-semibold text-white">{recruiter.name}</div>
                          <div className="text-sm text-gray-400">{recruiter.email}</div>
                          <div className="text-sm text-gray-500 mb-4">{recruiter.position}</div>
                          
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                            <div className="text-gray-400">Активные вакансии:</div>
                            <div className="text-white font-medium text-right">{recruiter.activeVacancies}</div>
                            
                            <div className="text-gray-400">Закрытые вакансии:</div>
                            <div className="text-white font-medium text-right">{recruiter.closedVacancies}</div>
                            
                            <div className="text-gray-400">Всего вакансий:</div>
                            <div className="text-white font-medium text-right">{recruiter.totalVacancies}</div>
                            
                            <div className="text-gray-400">Всего кандидатов:</div>
                            <div className="text-white font-medium text-right">{recruiter.totalCandidates}</div>
                            
                            <div className="text-gray-400">Конверсия:</div>
                            <div className="text-white font-medium text-right">{recruiter.conversionRate}</div>
                            
                            <div className="text-gray-400">Ср. время закрытия:</div>
                            <div className="text-white font-medium text-right">{recruiter.avgClosingTime}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Графики сравнения */}
                  <div className="space-y-6">
                    {/* График вакансий */}
                    <div className="bg-[#111827] rounded-lg p-6 border border-[#1e3a5f]">
                      <h3 className="text-lg font-semibold text-blue-300 mb-4">Сравнение по вакансиям</h3>
                      <div className="space-y-8">
                        {/* Активные вакансии */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Активные вакансии</span>
                            <span className="text-xs text-gray-500">
                              макс: {
                                recruiterKpiData
                                  .filter(r => selectedRecruiters.includes(r.id))
                                  .length > 0 ? 
                                  Math.max(...recruiterKpiData
                                    .filter(r => selectedRecruiters.includes(r.id))
                                    .map(r => r.activeVacancies || 0)
                                  ) : 0
                                }
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recruiterKpiData
                              .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                              .map((recruiter) => {
                                const selectedRecruitersData = recruiterKpiData.filter(r => 
                                  selectedRecruiters.includes(r.id)
                                );
                                const maxActiveVacancies = selectedRecruitersData.length > 0 ? 
                                  Math.max(...selectedRecruitersData.map(r => r.activeVacancies || 0)) : 0;
                                
                                // Если максимум 0, сделаем минимальное отображение полосы для визуализации
                                const minWidth = 5; // минимальная ширина в процентах для визуализации
                                const width = maxActiveVacancies > 0 ? 
                                  (recruiter.activeVacancies / maxActiveVacancies) * 100 : 
                                  (recruiter.activeVacancies > 0 ? minWidth : 0);
                                
                                return (
                                  <div key={`active-${recruiter.id}`} className="flex items-center">
                                    <div className="w-32 text-sm text-white">{recruiter.name}</div>
                                    <div className="flex-1 bg-[#0a1929] rounded-full h-6 relative">
                                      {recruiter.activeVacancies > 0 ? (
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-blue-600 rounded-full flex items-center px-2"
                                          style={{ width: `${width}%`, minWidth: '20px' }}
                                        >
                                          <span className="text-xs text-white">{recruiter.activeVacancies}</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-0 left-0 h-full flex items-center px-2 text-gray-400">
                                          <span className="text-xs">0</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* Закрытые вакансии */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Закрытые вакансии</span>
                            <span className="text-xs text-gray-500">
                              макс: {
                                recruiterKpiData
                                  .filter(r => selectedRecruiters.includes(r.id))
                                  .length > 0 ? 
                                  Math.max(...recruiterKpiData
                                    .filter(r => selectedRecruiters.includes(r.id))
                                    .map(r => r.closedVacancies || 0)
                                  ) : 0
                                }
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recruiterKpiData
                              .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                              .map((recruiter) => {
                                const selectedRecruitersData = recruiterKpiData.filter(r => 
                                  selectedRecruiters.includes(r.id)
                                );
                                const maxClosedVacancies = selectedRecruitersData.length > 0 ? 
                                  Math.max(...selectedRecruitersData.map(r => r.closedVacancies || 0)) : 0;
                                
                                // Если максимум 0, сделаем минимальное отображение полосы для визуализации
                                const minWidth = 5; // минимальная ширина в процентах для визуализации
                                const width = maxClosedVacancies > 0 ? 
                                  (recruiter.closedVacancies / maxClosedVacancies) * 100 : 
                                  (recruiter.closedVacancies > 0 ? minWidth : 0);
                                
                                return (
                                  <div key={`closed-${recruiter.id}`} className="flex items-center">
                                    <div className="w-32 text-sm text-white">{recruiter.name}</div>
                                    <div className="flex-1 bg-[#0a1929] rounded-full h-6 relative">
                                      {recruiter.closedVacancies > 0 ? (
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-red-600 rounded-full flex items-center px-2"
                                          style={{ width: `${width}%`, minWidth: '20px' }}
                                        >
                                          <span className="text-xs text-white">{recruiter.closedVacancies}</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-0 left-0 h-full flex items-center px-2 text-gray-400">
                                          <span className="text-xs">0</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* График кандидатов */}
                    <div className="bg-[#111827] rounded-lg p-6 border border-[#1e3a5f]">
                      <h3 className="text-lg font-semibold text-blue-300 mb-4">Сравнение по кандидатам</h3>
                      <div className="space-y-8">
                        {/* Всего кандидатов */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Всего кандидатов</span>
                            <span className="text-xs text-gray-500">
                              макс: {
                                recruiterKpiData
                                  .filter(r => selectedRecruiters.includes(r.id))
                                  .length > 0 ? 
                                  Math.max(...recruiterKpiData
                                    .filter(r => selectedRecruiters.includes(r.id))
                                    .map(r => r.totalCandidates || 0)
                                  ) : 0
                                }
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recruiterKpiData
                              .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                              .map((recruiter) => {
                                const selectedRecruitersData = recruiterKpiData.filter(r => 
                                  selectedRecruiters.includes(r.id)
                                );
                                const maxTotalCandidates = selectedRecruitersData.length > 0 ? 
                                  Math.max(...selectedRecruitersData.map(r => r.totalCandidates || 0)) : 0;
                                
                                // Если максимум 0, сделаем минимальное отображение полосы для визуализации
                                const minWidth = 5; // минимальная ширина в процентах для визуализации
                                const width = maxTotalCandidates > 0 ? 
                                  (recruiter.totalCandidates / maxTotalCandidates) * 100 : 
                                  (recruiter.totalCandidates > 0 ? minWidth : 0);
                                
                                return (
                                  <div key={`total-${recruiter.id}`} className="flex items-center">
                                    <div className="w-32 text-sm text-white">{recruiter.name}</div>
                                    <div className="flex-1 bg-[#0a1929] rounded-full h-6 relative">
                                      {recruiter.totalCandidates > 0 ? (
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-purple-600 rounded-full flex items-center px-2"
                                          style={{ width: `${width}%`, minWidth: '20px' }}
                                        >
                                          <span className="text-xs text-white">{recruiter.totalCandidates}</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-0 left-0 h-full flex items-center px-2 text-gray-400">
                                          <span className="text-xs">0</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* Конверсия */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Конверсия (%)</span>
                            <span className="text-xs text-gray-500">
                              макс: {
                                recruiterKpiData
                                  .filter(r => selectedRecruiters.includes(r.id))
                                  .length > 0 ? 
                                  Math.max(...recruiterKpiData
                                    .filter(r => selectedRecruiters.includes(r.id))
                                    .map(r => r.conversionRateValue || 0)
                                  ) : 0
                                }%
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recruiterKpiData
                              .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                              .map((recruiter) => {
                                // Максимальная конверсия 100%
                                const conversionWidth = recruiter.conversionRateValue || 0;
                                
                                return (
                                  <div key={`conversion-${recruiter.id}`} className="flex items-center">
                                    <div className="w-32 text-sm text-white">{recruiter.name}</div>
                                    <div className="flex-1 bg-[#0a1929] rounded-full h-6 relative">
                                      {recruiter.conversionRateValue > 0 ? (
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-green-600 rounded-full flex items-center px-2"
                                          style={{ width: `${conversionWidth}%`, minWidth: '20px' }}
                                        >
                                          <span className="text-xs text-white">{recruiter.conversionRate}</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-0 left-0 h-full flex items-center px-2 text-gray-400">
                                          <span className="text-xs">0%</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* Среднее время закрытия */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">Ср. время закрытия (дней)</span>
                            <span className="text-xs text-gray-500">
                              макс: {
                                recruiterKpiData
                                  .filter(r => selectedRecruiters.includes(r.id))
                                  .length > 0 ? 
                                  Math.max(...recruiterKpiData
                                    .filter(r => selectedRecruiters.includes(r.id))
                                    .map(r => r.avgClosingTimeValue || 0)
                                  ) : 0
                                } дн.
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recruiterKpiData
                              .filter(recruiter => selectedRecruiters.includes(recruiter.id))
                              .map((recruiter) => {
                                const selectedRecruitersForClosingTime = recruiterKpiData.filter(r => 
                                  selectedRecruiters.includes(r.id)
                                );
                                const maxAvgClosingTime = selectedRecruitersForClosingTime.length > 0 ? 
                                  Math.max(...selectedRecruitersForClosingTime.map(r => r.avgClosingTimeValue || 0)) : 0;
                                
                                // Если максимум 0, сделаем минимальное отображение полосы для визуализации
                                const minWidthForClosing = 5; // минимальная ширина в процентах для визуализации
                                const closingTimeWidth = maxAvgClosingTime > 0 ? 
                                  (recruiter.avgClosingTimeValue / maxAvgClosingTime) * 100 : 
                                  (recruiter.avgClosingTimeValue > 0 ? minWidthForClosing : 0);
                                
                                return (
                                  <div key={`time-${recruiter.id}`} className="flex items-center">
                                    <div className="w-32 text-sm text-white">{recruiter.name}</div>
                                    <div className="flex-1 bg-[#0a1929] rounded-full h-6 relative">
                                      {recruiter.avgClosingTimeValue > 0 ? (
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-amber-500 rounded-full flex items-center px-2"
                                          style={{ width: `${closingTimeWidth}%`, minWidth: '20px' }}
                                        >
                                          <span className="text-xs text-white">{recruiter.avgClosingTimeValue} дн.</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-0 left-0 h-full flex items-center px-2 text-gray-400">
                                          <span className="text-xs">0 дн.</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 