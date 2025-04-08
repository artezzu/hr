import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, LabelList, Sector } from 'recharts';
import { config } from '@/config';
import { 
  ChevronDownIcon, 
  XMarkIcon, 
  ChevronDoubleRightIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowsPointingOutIcon,
  PlusIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

// Интерфейсы для данных
interface SourceData {
  name: string;
  value: number;
  color: string;
  percent: number;
}

// Интерфейс периода для сравнения
interface ComparisonPeriod {
  year: number;
  month: number;
  label: string; // Формат "Март 2025"
  data: SourceData[];
  color?: string;
}

// Интерфейс для Application
interface Application {
  id: number;
  full_name: string;
  position: string;
  specialization: string;
  status: string;
  created_at: string;
  phone: string;
  telegram: string;
  source?: string;
}

// Интерфейс для HHCandidate
interface HHCandidate {
  id: number;
  full_name: string;
  position: string;
  status: string;
  created_at: string;
  phone: string;
  resume_url?: string;
}

interface SourceStatisticsChartProps {
  // Можно добавить параметры для настройки компонента
  period?: string;
  displayMode?: 'monthly' | 'daily';
}

const SourceStatisticsChart: React.FC<SourceStatisticsChartProps> = ({
  period,
  displayMode = 'monthly'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'area'>('bar');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [internalDisplayMode, setInternalDisplayMode] = useState<'monthly' | 'daily'>(displayMode);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg'>('lg');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [sourcesData, setSourcesData] = useState<SourceData[]>([]);
  const [comparisonData, setComparisonData] = useState<SourceData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [hhCandidates, setHHCandidates] = useState<HHCandidate[]>([]);
  
  // Новые состояния для сравнения нескольких периодов
  const [comparisonPeriods, setComparisonPeriods] = useState<ComparisonPeriod[]>([]);
  const [addingPeriod, setAddingPeriod] = useState<boolean>(false);
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState<number>(new Date().getMonth());
  
  // Цвета для периодов сравнения
  const periodColors = ["#4287f5", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#6366f1"];

  // Цвета для различных источников
  const sourceColorMap: { [key: string]: string } = {
    "Head hunter": "#D6001C", // Красный, как у HeadHunter
    "Facebook": "#1877F2", // Синий Facebook
    "Instagram": "#C13584", // Розовый Instagram
    "Linkedin": "#0A66C2", // Синий LinkedIn
    "Olx": "#6ECA00", // Зеленый OLX
    "Вузы": "#4285F4", // Синий для университетов
    "Приглашен через знакомого": "#34C759", // Зеленый для рекомендаций
    "Телеграм": "#2AABEE", // Синий Telegram
    "Другие": "#64748b", // Серый для прочих источников
    // Английские варианты
    "HeadHunter": "#D6001C",
    "Universities": "#4285F4",
    "Friend": "#34C759",
    "Telegram": "#2AABEE",
    "Other": "#64748b"
  };

  useEffect(() => {
    // Определяем размер экрана для адаптивности
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScreenSize('sm');
      } else if (window.innerWidth < 1024) {
        setScreenSize('md');
      } else {
        setScreenSize('lg');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    fetchSourcesData();
  }, [selectedYear, selectedMonth, internalDisplayMode]);

  // Функция для получения параметров фильтрации по месяцу
  const getMonthFilterParams = (year: number, month: number) => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Создаем дату на основе выбранного года и месяца
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    // Форматируем даты в строки ISO для API
    const start_date = startDate.toISOString().split('T')[0];
    const end_date = endDate.toISOString().split('T')[0];
    
    return { start_date, end_date };
  };

  // Получаем реальные данные из API
  const fetchSourcesData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }
      
      const { start_date, end_date } = getMonthFilterParams(selectedYear, selectedMonth);
      
      // Получаем обычные заявки
      const appUrl = new URL(`${config.apiUrl}/applications/`);
      appUrl.searchParams.append('start_date', start_date);
      appUrl.searchParams.append('end_date', end_date);
      
      console.log('Отправляем запрос на URL:', appUrl.toString());
      
      const appResponse = await fetch(appUrl.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!appResponse.ok) {
        throw new Error(`Ошибка при получении заявок: ${appResponse.status}`);
      }

      const appData = await appResponse.json();
      console.log(`Получено ${appData.length} заявок:`, appData);
      
      // Получаем HH кандидатов
      const hhUrl = new URL(`${config.apiUrl}/hh-candidates/`);
      hhUrl.searchParams.append('start_date', start_date);
      hhUrl.searchParams.append('end_date', end_date);
      
      console.log('Отправляем запрос для HH кандидатов:', hhUrl.toString());
      
      const hhResponse = await fetch(hhUrl.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!hhResponse.ok) {
        throw new Error(`Ошибка при получении HH кандидатов: ${hhResponse.status}`);
      }

      const hhData = await hhResponse.json();
      console.log(`Получено ${hhData.length} HH кандидатов:`, hhData);

      // Обновляем состояния
      setApplications(appData);
      setHHCandidates(hhData);

      // Теперь подготовим данные для графика на основе полученных заявок
      const currentSourcesData = getDetailedSourcesData(appData, hhData);
      setSourcesData(currentSourcesData);

      if (compareMode) {
        // Для режима сравнения получаем данные за предыдущий месяц
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        
        const prevStartDate = new Date(prevYear, prevMonth, 1);
        const prevEndDate = new Date(prevYear, prevMonth + 1, 0);
        
        const prev_start_date = prevStartDate.toISOString().split('T')[0];
        const prev_end_date = prevEndDate.toISOString().split('T')[0];
        
        // Получаем обычные заявки за предыдущий период
        const prevAppUrl = new URL(`${config.apiUrl}/applications/`);
        prevAppUrl.searchParams.append('start_date', prev_start_date);
        prevAppUrl.searchParams.append('end_date', prev_end_date);
        
        const prevAppResponse = await fetch(prevAppUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!prevAppResponse.ok) {
          throw new Error(`Ошибка при получении предыдущих заявок: ${prevAppResponse.status}`);
        }

        const prevAppData = await prevAppResponse.json();
        
        // Получаем HH кандидатов за предыдущий период
        const prevHhUrl = new URL(`${config.apiUrl}/hh-candidates/`);
        prevHhUrl.searchParams.append('start_date', prev_start_date);
        prevHhUrl.searchParams.append('end_date', prev_end_date);
        
        const prevHhResponse = await fetch(prevHhUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!prevHhResponse.ok) {
          throw new Error(`Ошибка при получении предыдущих HH кандидатов: ${prevHhResponse.status}`);
        }

        const prevHhData = await prevHhResponse.json();
        
        // Подготовка данных для сравнения
        const previousSourcesData = getDetailedSourcesData(prevAppData, prevHhData);
        setComparisonData(previousSourcesData);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching sources data:", err);
      setError("Не удалось загрузить данные. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для получения детальных данных об источниках
  const getDetailedSourcesData = (apps: Application[], hhCands: HHCandidate[]): SourceData[] => {
    // Создаем карту для подсчета источников
    const sourcesMap: { [key: string]: number } = {};
    
    // Подсчитываем количество заявок по каждому источнику
    apps.forEach(app => {
      // Используем source из данных заявки или устанавливаем "Другие" как источник по умолчанию
      const source = app.source || "Другие";
      sourcesMap[source] = (sourcesMap[source] || 0) + 1;
    });
    
    // Добавляем HeadHunter как отдельный источник
    const headhunterCandidates = hhCands.length;
    if (headhunterCandidates > 0) {
      sourcesMap["HeadHunter"] = headhunterCandidates;
    }
    
    // Если нет данных о источниках и нет заявок, добавляем фиктивные данные для демонстрации
    if (Object.keys(sourcesMap).length === 0) {
      sourcesMap["Head hunter"] = 31;
      sourcesMap["Facebook"] = 15;
      sourcesMap["Instagram"] = 12;
      sourcesMap["Linkedin"] = 10;
      sourcesMap["Olx"] = 8;
      sourcesMap["Вузы"] = 7;
      sourcesMap["Приглашен через знакомого"] = 7;
      sourcesMap["Телеграм"] = 6;
      sourcesMap["Другие"] = 4;
    }
    
    // Вычисляем общее количество кандидатов для расчета процентов
    const totalCandidates = Object.values(sourcesMap).reduce((a, b) => a + b, 0);
    
    // Преобразуем карту в массив для отображения
    const result = Object.entries(sourcesMap).map(([name, value]) => {
      return {
        name,
        value,
        color: sourceColorMap[name] || "#64748b", // Используем предопределенный цвет или серый по умолчанию
        percent: Math.round((value / totalCandidates) * 100)
      };
    });
    
    // Сортируем по убыванию количества
    return result.sort((a, b) => b.value - a.value);
  };

  // Функция для форматирования метки периода
  const formatPeriodLabel = (year: number, month: number): string => {
    return `${getMonthName(month)} ${year}`;
  };

  // Проверка, является ли период будущим
  const isFuturePeriod = (year: number, month: number): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return year > currentYear || (year === currentYear && month > currentMonth);
  };

  // Добавить период сравнения
  const addComparisonPeriod = async (year: number, month: number) => {
    // Проверяем, не является ли период будущим
    if (isFuturePeriod(year, month)) {
      setError("Нельзя добавить будущий период для сравнения");
      return;
    }

    // Проверяем, не существует ли период уже
    const periodLabel = formatPeriodLabel(year, month);
    if (comparisonPeriods.some(p => p.label === periodLabel)) {
      return; // Период уже добавлен
    }
    
    setAddingPeriod(true);
    
    try {
      // Получаем данные для периода
      const { start_date, end_date } = getMonthFilterParams(year, month);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      // Построение URL для запросов
      const appUrl = new URL(`${config.apiUrl}/applications/`);
      appUrl.searchParams.append('start_date', start_date);
      appUrl.searchParams.append('end_date', end_date);
      
      const hhUrl = new URL(`${config.apiUrl}/hh-candidates/`);
      hhUrl.searchParams.append('start_date', start_date);
      hhUrl.searchParams.append('end_date', end_date);

      // Параллельные запросы для получения данных
      const [appResponse, hhResponse] = await Promise.all([
        fetch(appUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(hhUrl.toString(), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!appResponse.ok) {
        throw new Error(`Ошибка запроса заявок: ${appResponse.status}`);
      }
      
      if (!hhResponse.ok) {
        throw new Error(`Ошибка запроса кандидатов HH: ${hhResponse.status}`);
      }

      // Обработка результатов
      const appData: Application[] = await appResponse.json();
      const hhData: HHCandidate[] = await hhResponse.json();
      
      // Получаем данные по источникам
      const sourceData = getDetailedSourcesData(appData, hhData);
      
      // Выбираем цвет для нового периода
      const colorIndex = comparisonPeriods.length % periodColors.length;
      const color = periodColors[colorIndex];
      
      // Создаем новый период
      const newPeriod: ComparisonPeriod = {
        year,
        month,
        label: periodLabel,
        data: sourceData,
        color
      };
      
      // Добавляем период и сортируем по дате (сначала новые)
      setComparisonPeriods(prev => {
        const updated = [...prev, newPeriod];
        return updated.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
      });

      setError(null);
    } catch (err) {
      console.error('Ошибка при получении данных для периода:', err);
      setError(`Ошибка при добавлении периода: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setAddingPeriod(false);
    }
  };
  
  // Удалить период сравнения
  const removeComparisonPeriod = (index: number) => {
    setComparisonPeriods(prev => prev.filter((_, i) => i !== index));
  };

  // Добавить текущий период
  const addCurrentPeriod = () => {
    addComparisonPeriod(selectedYear, selectedMonth);
  };

  // Получаем названия месяцев
  const getMonthName = (monthIndex: number): string => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[monthIndex];
  };

  // Настройка отступов для графика
  const getChartMargin = () => {
    return { top: 20, right: 30, left: 20, bottom: 10 };
  };

  // Настройка размера шрифта в зависимости от размера экрана
  const getChartFontSize = () => {
    switch (screenSize) {
      case 'sm': return 11;
      case 'md': return 12;
      default: return 13;
    }
  };

  // Обработчик нажатия на элемент круговой диаграммы
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Обработчик изменения года
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
  };

  // Обработчик изменения месяца
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
  };

  // Обработчик изменения режима отображения
  const handleDisplayModeChange = (mode: 'monthly' | 'daily') => {
    setInternalDisplayMode(mode);
  };

  // Функция для отображения активного сектора в круговой диаграмме
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#0F172A"
          strokeWidth={2}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#E2E8F0" fontSize={13}>{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#64748B" fontSize={12}>
          {`${value} (${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  // Кастомный компонент для отрисовки тиков Y-оси с цветовыми индикаторами
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload, width } = props;
    const source = payload.value;
    const color = sourceColorMap[source] || '#fff';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <rect x="-22" y="-6" width="12" height="12" fill={color} rx="2" />
        <text 
          x="-32" 
          y="0" 
          dy="0.32em" 
          textAnchor="end" 
          fill="#fff" 
          fontSize={screenSize === 'sm' ? 12 : 14}
          fontWeight="500"
          dominantBaseline="middle"
        >
          {source}
        </text>
      </g>
    );
  };

  // Кастомный компонент для Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] border border-[#475569] shadow-lg rounded-lg p-3 text-white">
          <p className="font-semibold">{payload[0].payload.status}</p>
          <p className="text-lg mt-1">{`${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Функция для подготовки данных для горизонтальной гистограммы
  const prepareBarChartData = () => {
    if (!sourcesData.length) return [];
    
    return sourcesData.map(source => ({
      status: source.name,
      count: source.value,
      formattedValue: source.value.toString(),
      statusKey: source.name,
      color: source.color
    }));
  };

  // Хелпер для получения всех уникальных имен источников из периодов сравнения
  const getAllSourceNames = (): string[] => {
    const sourceNames = new Set<string>();
    
    comparisonPeriods.forEach(period => {
      period.data.forEach(source => {
        // Добавляем источник только если у него есть ненулевые значения хотя бы в одном периоде
        if (source.value > 0) {
          sourceNames.add(source.name);
        }
      });
    });
    
    return Array.from(sourceNames).sort();
  };
  
  // Функция для получения общего количества кандидатов в периоде
  const getTotalCandidatesForPeriod = (period: ComparisonPeriod): number => {
    return period.data.reduce((sum, source) => sum + source.value, 0);
  };

  // Хелпер для форматирования процентного значения
  const formatPercent = (value: number, total: number): string => {
    if (total === 0) return '0%';
    const percent = (value / total) * 100;
    return `${percent.toFixed(1)}%`;
  };
  
  // Рендер таблицы сравнительной статистики
  const renderComparisonTable = () => {
    if (!compareMode || comparisonPeriods.length === 0) return null;
    
    const sourceNames = getAllSourceNames();
    
    return (
      <div className="mt-8 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-3">Сравнительная статистика</h3>
        <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-800 border-b border-gray-700">
                Источник
              </th>
              {comparisonPeriods.map((period, index) => (
                <th 
                  key={`header-${index}`} 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-800 border-b border-gray-700"
                  style={{ borderLeft: '1px solid rgba(75, 85, 99, 0.5)' }}
                >
                  <div className="flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: period.color }}
                    ></span>
                    {period.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {sourceNames.map((sourceName, rowIndex) => {
              // Проверяем, есть ли ненулевые значения для этого источника
              const hasNonZeroValue = comparisonPeriods.some(period => {
                const sourceData = period.data.find(d => d.name === sourceName);
                return sourceData && sourceData.value > 0;
              });
              
              if (!hasNonZeroValue) return null;
              
              return (
                <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-gray-850' : 'bg-gray-900'}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200 border-r border-gray-800">
                    <div className="flex items-center">
                      <span 
                        className="w-2 h-2 rounded-sm mr-2"
                        style={{ backgroundColor: sourceColorMap[sourceName] || '#64748b' }}
                      ></span>
                      {sourceName}
                    </div>
                  </td>
                  {comparisonPeriods.map((period, colIndex) => {
                    const sourceData = period.data.find(d => d.name === sourceName);
                    const value = sourceData ? sourceData.value : 0;
                    const totalForPeriod = getTotalCandidatesForPeriod(period);
                    
                    return (
                      <td 
                        key={`cell-${rowIndex}-${colIndex}`}
                        className="px-4 py-2 whitespace-nowrap text-sm font-medium text-center"
                        style={{ 
                          borderLeft: '1px solid rgba(75, 85, 99, 0.4)',
                          color: value > 0 ? '#fff' : '#6b7280'
                        }}
                      >
                        <span className="font-semibold">{value}</span>{' '}
                        <span className="text-gray-400">({formatPercent(value, totalForPeriod)})</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Итоговая строка */}
            <tr className="bg-gray-800 border-t-2 border-gray-700">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white">
                Всего
              </td>
              {comparisonPeriods.map((period, colIndex) => {
                const total = getTotalCandidatesForPeriod(period);
                
                return (
                  <td 
                    key={`total-${colIndex}`} 
                    className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white text-center"
                    style={{ borderLeft: '1px solid rgba(75, 85, 99, 0.4)' }}
                  >
                    {total}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Подготовка данных для диаграммы сравнения
  const prepareComparisonData = () => {
    const sourceNames = getAllSourceNames();
    return sourceNames.map(sourceName => {
      const result: any = { name: sourceName };
      let hasData = false;
      
      comparisonPeriods.forEach(period => {
        const sourceData = period.data.find(d => d.name === sourceName);
        const value = sourceData ? sourceData.value : 0;
        result[period.label] = value;
        if (value > 0) hasData = true;
      });
      
      // Возвращаем результат только если есть данные
      return hasData ? result : null;
    }).filter(Boolean); // Удаляем null значения
  };

  // Обновляем функцию для получения доступных годов
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Формируем список доступных годов (текущий и предыдущие)
    const years = [currentYear];
    if (currentMonth > 0) { // Если текущий месяц не январь, добавляем предыдущие годы
      years.push(currentYear - 1, currentYear - 2);
    } else {
      years.push(currentYear - 1);
    }
    
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  // Функция для экспорта данных в Excel
  const exportToExcel = () => {
    let exportData;
    
    if (compareMode && comparisonPeriods.length > 0) {
      // Для режима сравнения - как было раньше
      exportData = comparisonPeriods.map(period => {
        const periodData = period.data.reduce((acc: any, source) => {
          acc[source.name] = source.value;
          return acc;
        }, {});
        
        return {
          'Период': period.label,
          'Всего кандидатов': getTotalCandidatesForPeriod(period),
          ...periodData
        };
      });
    } else {
      // Для обычного режима - экспортируем текущие данные
      const totalCandidates = sourcesData.reduce((sum, source) => sum + source.value, 0);
      
      exportData = sourcesData.map(source => ({
        'Источник': source.name,
        'Количество': source.value,
        'Процент': `${source.percent}%`
      }));
      
      // Добавляем итоговую строку
      exportData.push({
        'Источник': 'ВСЕГО',
        'Количество': totalCandidates,
        'Процент': '100%'
      });
    }

    // Создание рабочей книги Excel
    const wb = XLSX.utils.book_new();
    
    // Создаем лист в зависимости от режима
    let ws;
    if (compareMode && comparisonPeriods.length > 0) {
      ws = XLSX.utils.json_to_sheet(exportData, {
        header: ['Период', 'Всего кандидатов', ...getAllSourceNames()]
      });
      
      // Установка ширины столбцов для режима сравнения
      const colWidths = [
        { wch: 15 }, // Период
        { wch: 15 }, // Всего кандидатов
        ...getAllSourceNames().map(() => ({ wch: 12 }))
      ];
      ws['!cols'] = colWidths;
    } else {
      ws = XLSX.utils.json_to_sheet(exportData);
      
      // Установка ширины столбцов для обычного режима
      const colWidths = [
        { wch: 20 }, // Источник
        { wch: 15 }, // Количество
        { wch: 10 }  // Процент
      ];
      ws['!cols'] = colWidths;
    }

    // Добавление листа в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'Статистика источников');

    // Сохранение файла
    const fileName = compareMode 
      ? `Статистика_источников_сравнение_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Статистика_источников_${getMonthName(selectedMonth)}_${selectedYear}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
      </div>
    );
  }

  // Готовим данные для диаграммы в зависимости от типа
  const chartData = compareMode ? comparisonData : sourcesData;

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Тип диаграммы</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Гистограмма
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm ${
                  chartType === 'pie'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Круговая
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm ${
                  chartType === 'area'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Область
              </button>
            </div>
          </div>
          
          {!compareMode && (
            <div className="flex gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Год</label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      handleYearChange(newYear);
                    }}
                    className="block w-full pl-2 pr-8 py-1 sm:pl-3 sm:pr-10 sm:py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Месяц</label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value);
                      handleMonthChange(newMonth);
                    }}
                    className="block w-full pl-2 pr-8 py-1 sm:pl-3 sm:pr-10 sm:py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Режим отображения</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDisplayModeChange('monthly')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-l-md text-xs sm:text-sm ${
                  internalDisplayMode === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                По месяцам
              </button>
              <button
                onClick={() => handleDisplayModeChange('daily')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-r-md text-xs sm:text-sm ${
                  internalDisplayMode === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                По дням
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Режим сравнения</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newCompareMode = !compareMode;
                  setCompareMode(newCompareMode);
                  if (newCompareMode && chartType === 'pie') {
                    setChartType('bar');
                  }
                  // Если включаем сравнение и нет периодов, добавляем текущий
                  if (newCompareMode && comparisonPeriods.length === 0) {
                    addCurrentPeriod();
                  }
                  // Если выключаем сравнение, очищаем периоды
                  if (!newCompareMode) {
                    setComparisonPeriods([]);
                  }
                }}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm ${
                  compareMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {compareMode ? 'Выключить сравнение' : 'Включить сравнение'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Выбор месяцев для сравнения */}
      {compareMode && (
        <div className="mt-4 mb-6">
          <h3 className="text-gray-300 font-medium mb-2">Выбор месяцев для сравнения</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {comparisonPeriods.map((period, index) => (
              <div 
                key={`${period.year}-${period.month}`}
                className="flex items-center bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 shadow-sm"
                style={{ borderLeft: `4px solid ${period.color}` }}
              >
                <span className="flex items-center">
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: period.color }}
                  ></span>
                  <span className="text-white text-sm font-medium">{period.label}</span>
                </span>
                <button 
                  onClick={() => removeComparisonPeriod(index)}
                  className="ml-3 text-gray-400 hover:text-white transition-colors"
                  aria-label="Удалить период"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm text-gray-300 font-medium mb-1.5">Добавить месяц для сравнения</label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={tempMonth}
                    onChange={(e) => setTempMonth(Number(e.target.value))}
                    className="bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 transition-shadow shadow-sm hover:shadow-md"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const isDisabled = tempYear === new Date().getFullYear() && i > new Date().getMonth();
                      return (
                        <option 
                          key={i} 
                          value={i}
                          disabled={isDisabled}
                          className={isDisabled ? 'text-gray-500' : ''}
                        >
                          {getMonthName(i)}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="relative">
                  <select
                    value={tempYear}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setTempYear(newYear);
                      // Если выбран текущий год и месяц больше текущего, сбрасываем месяц
                      if (newYear === new Date().getFullYear() && tempMonth > new Date().getMonth()) {
                        setTempMonth(new Date().getMonth());
                      }
                    }}
                    className="bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 transition-shadow shadow-sm hover:shadow-md"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <button
                  onClick={() => addComparisonPeriod(tempYear, tempMonth)}
                  disabled={isLoading || addingPeriod}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading || addingPeriod ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                  Добавить месяц
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-200 text-xl font-semibold">
          {compareMode 
            ? "Сравнение источников по месяцам" 
            : `Статистика источников за ${getMonthName(selectedMonth)} ${selectedYear}`}
        </div>
        
        <button
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed font-medium"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Скачать в Excel
        </button>
      </div>

      <div 
        ref={chartContainerRef} 
        className="w-full" 
        style={{ 
          height: chartType === 'pie' ? '400px' : 
                  chartType === 'bar' ? `${Math.max(300, sourcesData.length * 35 + 50)}px` : 
                  '400px'  
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            // Круговая диаграмма
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={screenSize === 'sm' ? 55 : 80}
                outerRadius={screenSize === 'sm' ? 80 : 110}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="#0F172A"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#475569',
                  color: '#fff',
                  fontSize: getChartFontSize()
                }}
                formatter={(value, name) => {
                  const entry = chartData.find(item => item.name === name);
                  return [`${entry?.percent}% (${value})`, name];
                }}
                labelFormatter={() => 'Источник'}
              />
              <Legend 
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ 
                  fontSize: getChartFontSize(), 
                  color: '#ccc',
                  paddingTop: '15px'
                }}
                formatter={(value, entry: any) => {
                  const { color } = entry;
                  const item = chartData.find(item => item.name === value);
                  return (
                    <span style={{ color: '#ccc', marginRight: 10 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '10px', 
                        height: '10px', 
                        backgroundColor: color,
                        marginRight: '5px',
                        borderRadius: '2px'
                      }}></span>
                      {value} - {item?.percent}%
                    </span>
                  );
                }}
              />
            </PieChart>
          ) : chartType === 'area' ? (
            // Диаграмма области
            <AreaChart 
              data={sourcesData}
              margin={getChartMargin()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#ccc', fontSize: getChartFontSize() }}
                interval={screenSize === 'sm' ? 'preserveEnd' : 'preserveStartEnd'}
                angle={screenSize === 'sm' ? -45 : 0}
                textAnchor={screenSize === 'sm' ? 'end' : 'middle'}
                height={screenSize === 'sm' ? 50 : 30}
              />
              <YAxis tick={{ fill: '#ccc', fontSize: getChartFontSize() }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#475569',
                  color: '#fff',
                  fontSize: getChartFontSize()
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                name="Количество" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.5} 
              />
            </AreaChart>
          ) : (
            // Гистограмма (по умолчанию)
            compareMode && comparisonPeriods.length > 0 ? (
              // Режим сравнения нескольких периодов
              <BarChart
                data={prepareComparisonData()}
                layout="vertical"
                margin={{ top: 20, right: 50, left: 180, bottom: 5 }}
                barGap={0}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#444" opacity={0.3} />
                <XAxis
                  type="number"
                  tick={{ fill: '#ccc', fontSize: getChartFontSize() }}
                  tickLine={{ stroke: '#444' }}
                  axisLine={{ stroke: '#444' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#ccc', fontSize: getChartFontSize() }}
                  tickLine={{ stroke: '#444' }}
                  axisLine={{ stroke: '#444' }}
                  width={160}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    color: '#fff',
                    fontSize: getChartFontSize() + 1,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '10px 14px',
                    border: '1px solid rgba(71, 85, 105, 0.5)'
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    const total = comparisonPeriods.reduce((sum, period) => {
                      const periodValue = props.payload[period.label] || 0;
                      return sum + periodValue;
                    }, 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                    return [`${value} (${percent}%)`, name];
                  }}
                  labelFormatter={(label) => `Источник: ${label}`}
                />
                <Legend 
                  verticalAlign="top" 
                  wrapperStyle={{ paddingBottom: '10px' }}
                  formatter={(value, entry: any) => {
                    const period = comparisonPeriods.find(p => p.label === value);
                    const color = period?.color || '#ccc';
                    return (
                      <span style={{ color: '#ccc', padding: '0 8px', fontWeight: 500 }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: color,
                          marginRight: '8px',
                          borderRadius: '3px',
                          verticalAlign: 'middle'
                        }}></span>
                        {value}
                      </span>
                    );
                  }}
                />
                
                {comparisonPeriods.map((period, index) => (
                  <Bar 
                    key={`period-${index}`}
                    dataKey={period.label}
                    name={period.label}
                    fill={period.color}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={25}
                  >
                    <LabelList
                      dataKey={period.label}
                      position="right"
                      fill="#fff"
                      fontSize={12}
                      formatter={(value: any) => value > 0 ? value : ''}
                      style={{
                        textShadow: '0px 0px 3px rgba(0, 0, 0, 0.7)',
                        fontWeight: '500'
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            ) : (
              // Обычная гистограмма
              <BarChart
                data={prepareBarChartData()}
                layout="vertical"
                margin={getChartMargin()}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" opacity={0.3} />
                <XAxis
                  type="number"
                  tick={{ fill: '#ccc', fontSize: getChartFontSize() + 1 }}
                  axisLine={{ stroke: '#444' }}
                  tickLine={{ stroke: '#444' }}
                  domain={[0, 'dataMax']}
                  tickFormatter={(value) => `${value}`}
                />
                <YAxis 
                  dataKey="status"
                  type="category"
                  tick={<CustomYAxisTick />}
                  axisLine={{ stroke: '#444' }}
                  tickLine={{ stroke: '#444' }}
                  width={180}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const item = props.payload;
                    return [`${item.formattedValue}`, item.status];
                  }}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    color: '#fff',
                    fontSize: getChartFontSize() + 2,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '10px 14px',
                    border: '1px solid rgba(71, 85, 105, 0.5)'
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="count"
                  name="Количество"
                  background={{ fill: '#1e293b' }}
                  radius={[0, 4, 4, 0]}
                >
                  {prepareBarChartData().map((entry, index) => {
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        fillOpacity={hoveredBar === `bar-${index}` ? 1 : 0.85}
                      />
                    );
                  })}
                  <LabelList 
                    dataKey="formattedValue" 
                    position="right" 
                    fill="#fff" 
                    fontSize={screenSize === 'sm' ? 13 : 14} 
                    style={{
                      textShadow: '0px 0px 3px rgba(0, 0, 0, 0.7)',
                      fontWeight: 'bold'
                    }}
                  />
                </Bar>
              </BarChart>
            )
          )}
        </ResponsiveContainer>
      </div>

      {/* Дополнительная статистика для круговой диаграммы */}
      {chartType === 'pie' && !compareMode && chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {chartData.map((entry, index) => (
            <div 
              key={`stat-${index}`}
              className={`bg-gray-800 rounded-lg p-2 sm:p-3 border-l-4 transition-transform duration-300 hover:scale-105 cursor-pointer ${
                index === activeIndex ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{ borderLeftColor: entry.color }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <p className="text-xs sm:text-sm text-gray-400">{entry.name}</p>
              <div className="flex justify-between items-center">
                <p className="text-base sm:text-lg font-bold text-white">{entry.value}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-300">{entry.percent}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Детальная статистика для сравнения */}
      {compareMode && chartData.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-[#0F172A] rounded-lg shadow-lg p-3 sm:p-4 border border-[#2d3c59]">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">Сравнительная статистика</h2>
            {screenSize === 'sm' && (
              <div className="text-xs text-gray-400 flex items-center">
                <ChevronDoubleRightIcon className="h-3 w-3 mr-1 animate-pulse" />
                Свайп для прокрутки
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto -mx-3 px-3 pb-1">
            <div className="min-w-[500px]">
              <table className="w-full bg-transparent text-white">
                <thead>
                  <tr className="bg-[#1e293b]">
                    <th className="py-2 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold rounded-l-md">Источник</th>
                    <th className="py-2 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium">
                      Текущий период ({getMonthName(selectedMonth)} {selectedYear})
                    </th>
                    <th className="py-2 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium rounded-r-md">
                      Предыдущий период
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sourcesData.map((source, idx) => {
                    const comparisonValue = comparisonData[idx]?.value || 0;
                    const change = source.value - comparisonValue;
                    const changePercent = comparisonValue === 0 
                      ? 100 
                      : Math.round((change / comparisonValue) * 100);
                    
                    return (
                      <tr key={idx} className="border-t border-[#2d3c59] hover:bg-[#1e293b] transition-colors duration-150">
                        <td className="py-1.5 sm:py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm">
                          <div className="flex items-center">
                            <span className="w-3 h-3 mr-2 rounded-sm" style={{ backgroundColor: source.color }}></span>
                            {source.name}
                          </div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 sm:px-4 text-right font-semibold text-xs sm:text-sm">
                          {source.value} <span className="text-gray-400">({source.percent}%)</span>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 sm:px-4 text-right font-semibold text-xs sm:text-sm">
                          {comparisonValue} <span className="text-gray-400">({comparisonData[idx]?.percent || 0}%)</span>
                          <span className={`ml-2 ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {change > 0 ? '↑' : change < 0 ? '↓' : ''}
                            {change !== 0 && ` ${Math.abs(changePercent)}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Добавляем сюда вызов функции для рендеринга таблицы сравнительной статистики */}
      {renderComparisonTable()}
    </div>
  );
};

export default SourceStatisticsChart;