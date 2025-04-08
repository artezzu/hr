import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, LabelList, PieChart, Pie, Sector } from 'recharts';
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
interface DailyData {
  date: string;
  weekday: string;
  month: string;
  counts: {
    [key: string]: number;
  };
}

interface HistoryData {
  daily_data: DailyData[];
  total_stats: {
    [key: string]: number;
  };
}

interface MonthlyData {
  month: string;
  month_name: string;
  counts: {
    [key: string]: number;
  };
}

interface MonthOption {
  label: string;
  value: string;
  year: number;
  monthIndex: number;
}

interface StatusHistoryChartProps {
  startDate?: string;
  endDate?: string;
  displayMode?: 'daily' | 'monthly';
}

const StatusHistoryChart: React.FC<StatusHistoryChartProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  displayMode = 'daily'
}) => {
  const [historyData, setHistoryData] = useState<HistoryData | MonthlyData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);
  const [internalDisplayMode, setInternalDisplayMode] = useState<'daily' | 'monthly'>(displayMode);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'pie'>('bar');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [comparisonMonths, setComparisonMonths] = useState<MonthOption[]>([]);
  const [comparingData, setComparingData] = useState<{[key: string]: MonthlyData[] | HistoryData}>({});
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg'>('lg');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const statusColorMap: { [key: string]: string } = {
    'combined_новый': '#4287f5',            // Синий
    'combined_на_рассмотрении': '#f59e0b',  // Оранжевый
    'combined_телефонное_интервью': '#f97316', // Темно-оранжевый
    'combined_собеседование': '#a855f7',     // Фиолетовый
    'combined_служба_безопасности': '#14b8a6', // Бирюзовый
    'combined_оффер': '#ec4899',             // Розовый
    'combined_офер': '#ec4899',              // Розовый (альтернативное написание)
    'combined_сбор_документов': '#6366f1',   // Индиго
    'combined_принят_на_работу': '#22c55e',  // Зеленый
    'combined_резерв': '#64748b',           // Серый
    'combined_отказ': '#ef4444',             // Красный
    // Добавляем маппинги для возможных вариантов написания
    'combined_на рассмотрении': '#f59e0b',
    'combined_телефонное интервью': '#f97316',
    'combined_служба безопасности': '#14b8a6',
    'combined_сбор документов': '#6366f1',
    'combined_принят на работу': '#22c55e'
  };
  
  const statusNameMap: { [key: string]: string } = {
    'combined_новый': 'Новый',
    'combined_на_рассмотрении': 'На рассмотрении',
    'combined_телефонное_интервью': 'Телефонное интервью',
    'combined_собеседование': 'Собеседование',
    'combined_служба_безопасности': 'Служба безопасности',
    'combined_оффер': 'Оффер',
    'combined_офер': 'Оффер',
    'combined_сбор_документов': 'Сбор документов',
    'combined_принят_на_работу': 'Принят на работу',
    'combined_резерв': 'Резерв',
    'combined_отказ': 'Отказ',
    // Добавляем маппинги для возможных вариантов написания
    'combined_на рассмотрении': 'На рассмотрении',
    'combined_телефонное интервью': 'Телефонное интервью',
    'combined_служба безопасности': 'Служба безопасности',
    'combined_сбор документов': 'Сбор документов',
    'combined_принят на работу': 'Принят на работу'
  };
  
  // Создаем список всех доступных месяцев
  useEffect(() => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Генерируем список месяцев для текущего и прошлого года
    const options: MonthOption[] = [];
    
    // Текущий год
    for (let i = 0; i <= currentMonth; i++) {
      options.push({
        label: `${months[i]} ${currentYear}`,
        value: `${currentYear}-${(i + 1).toString().padStart(2, '0')}`,
        year: currentYear,
        monthIndex: i
      });
    }
    
    // Прошлый год
    for (let i = 0; i < 12; i++) {
      options.push({
        label: `${months[i]} ${currentYear - 1}`,
        value: `${currentYear - 1}-${(i + 1).toString().padStart(2, '0')}`,
        year: currentYear - 1,
        monthIndex: i
      });
    }
    
    setAvailableMonths(options);
  }, []);
  
  // Список доступных лет для выбора
  const availableYears = [];
  const currentYear = new Date().getFullYear();
  for (let i = 2022; i <= currentYear; i++) {
    availableYears.push(i);
  }
  
  // Функция для получения параметров запроса по месяцам
  const getMonthFilterParams = (year: number, monthIndex: number) => {
    // Создаем дату первого дня выбранного месяца
    const startDate = new Date(year, monthIndex, 1);
    
    // Создаем дату первого дня следующего месяца
    const endDate = new Date(year, monthIndex + 1, 1);
    
    // Форматируем даты в ISO-строки для API
    return {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };
  };
  
  // Функция для загрузки данных по конкретному месяцу
  const fetchMonthData = async (year: number, monthIndex: number, monthKey: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }
      
      // Получаем параметры фильтрации для указанного месяца
      const { start_date, end_date } = getMonthFilterParams(year, monthIndex);
      
      // Формируем URL в зависимости от режима отображения
      const url = new URL(`${config.apiUrl}/analytics/status-history`);
      url.searchParams.append('start_date', start_date);
      url.searchParams.append('end_date', end_date);
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки данных: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Добавляем загруженные данные в map сравниваемых месяцев
      setComparingData(prev => ({
        ...prev,
        [monthKey]: data
      }));
      
      return data;
    } catch (err) {
      console.error(`Ошибка при загрузке данных для ${year}-${monthIndex+1}:`, err);
      return null;
    }
  };
  
  // Загрузка данных истории статусов
  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Не найден токен авторизации');
        }
        
        // Если активен режим сравнения, проверяем есть ли выбранные месяцы
        if (compareMode && comparisonMonths.length > 0) {
          // Загружаем данные для каждого выбранного месяца
          const promises = comparisonMonths.map(month => 
            fetchMonthData(month.year, month.monthIndex, month.value)
          );
          
          await Promise.all(promises);
          setIsLoading(false);
          return;
        }
        
        // Для обычного режима - стандартная загрузка
        let url;
        if (internalDisplayMode === 'daily') {
          url = new URL(`${config.apiUrl}/analytics/status-history`);
          if (startDate) url.searchParams.append('start_date', startDate);
          if (endDate) url.searchParams.append('end_date', endDate);
        } else {
          url = new URL(`${config.apiUrl}/analytics/monthly-status-history`);
          url.searchParams.append('year', selectedYear.toString());
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка загрузки данных: ${errorText}`);
        }
        
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        console.error('Ошибка при загрузке данных истории статусов:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке данных');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoryData();
  }, [startDate, endDate, internalDisplayMode, selectedYear, compareMode, comparisonMonths]);
  
  // Функция для добавления месяца в сравнение
  const addMonthToComparison = (month: MonthOption) => {
    // Проверяем, не выбран ли уже этот месяц
    if (comparisonMonths.some(m => m.value === month.value)) {
      return;
    }
    
    // Добавляем месяц в список сравнения
    setComparisonMonths(prev => [...prev, month]);
    
    // Загружаем данные для этого месяца, если их еще нет
    if (!comparingData[month.value]) {
      fetchMonthData(month.year, month.monthIndex, month.value);
    }
  };
  
  // Функция для удаления месяца из сравнения
  const removeMonthFromComparison = (monthValue: string) => {
    setComparisonMonths(prev => prev.filter(m => m.value !== monthValue));
    
    // Удаляем данные этого месяца из сравнения
    setComparingData(prev => {
      const newData = { ...prev };
      delete newData[monthValue];
      return newData;
    });
  };
  
  // Получаем список всех статусов из данных
  const getUniqueStatuses = () => {
    if (!historyData && !compareMode) return [];
    
    if (compareMode) {
      // Собираем все статусы из всех сравниваемых месяцев
      const statuses = new Set<string>();
      
      Object.values(comparingData).forEach(monthData => {
        if ('daily_data' in monthData) {
          monthData.daily_data.forEach(day => {
            Object.keys(day.counts).forEach(status => {
              if (status.startsWith('combined_')) {
                statuses.add(status);
              }
            });
          });
        }
      });
      
      return Array.from(statuses).sort();
    }
    
    // Для daily_data
    if ('daily_data' in historyData!) {
      const statuses = new Set<string>();
      historyData!.daily_data.forEach(day => {
        Object.keys(day.counts).forEach(status => {
          // Фильтруем только комбинированные статусы для более чистой диаграммы
          if (status.startsWith('combined_')) {
            statuses.add(status);
          }
        });
      });
      return Array.from(statuses).sort();
    }
    
    // Для monthly_data
    const statuses = new Set<string>();
    (historyData as MonthlyData[]).forEach((month: MonthlyData) => {
      Object.keys(month.counts).forEach(status => {
        if (status.startsWith('combined_')) {
          statuses.add(status);
        }
      });
    });
    return Array.from(statuses).sort();
  };
  
  // Преобразование данных для recharts в режиме сравнения
  const prepareComparisonChartData = () => {
    if (Object.keys(comparingData).length === 0) return [];
    
    const result: any[] = [];
    
    // Создаем набор уникальных имен статусов (значений, а не ключей)
    const uniqueStatusNames = new Set<string>();
    Object.entries(statusNameMap).forEach(([key, name]) => {
      if (key.startsWith('combined_')) {
        uniqueStatusNames.add(name);
      }
    });
    
    // Сопоставляем каждое уникальное имя статуса с соответствующим ключом
    // Берем первый ключ для каждого имени статуса
    const statusNameToKey: {[name: string]: string} = {};
    Object.entries(statusNameMap).forEach(([key, name]) => {
      if (key.startsWith('combined_') && !statusNameToKey[name]) {
        statusNameToKey[name] = key;
      }
    });
    
    // Создаем данные для каждого уникального статуса
    Array.from(uniqueStatusNames).forEach(statusName => {
      // Находим все ключи, соответствующие этому имени статуса
      const statusKeys = Object.entries(statusNameMap)
        .filter(([key, name]) => name === statusName && key.startsWith('combined_'))
        .map(([key]) => key);
      
      // Инициализируем объект данных для этого статуса
      const dataObj: any = { status: statusName };
      
      // Добавляем данные из каждого месяца
      comparisonMonths.forEach(month => {
        const monthData = comparingData[month.value];
        if (!monthData) {
          dataObj[month.label] = 0;
          return;
        }
        
        let value = 0;
        
        // Суммируем значения для ВСЕХ ключей этого статуса по всем дням месяца
        if ('daily_data' in monthData) {
          monthData.daily_data.forEach(day => {
            statusKeys.forEach(statusKey => {
              value += day.counts[statusKey] || 0;
            });
          });
        }
        
        // Добавляем значение в объект данных под ключом с названием месяца
        dataObj[month.label] = value;
      });
      
      // Добавляем статус в результаты
      result.push(dataObj);
    });
    
    // Сортируем статусы в логичном порядке
    result.sort((a, b) => {
      // Определяем порядок статусов
      const statusOrder: { [key: string]: number } = {
        'Новый': 1,
        'На рассмотрении': 2,
        'Телефонное интервью': 3,
        'Собеседование': 4,
        'Служба безопасности': 5,
        'Оффер': 6,
        'Сбор документов': 7,
        'Принят на работу': 8,
        'Резерв': 9,
        'Отказ': 10
      };
      
      // Получаем порядковые номера
      const orderA = statusOrder[a.status as string] || 999;
      const orderB = statusOrder[b.status as string] || 999;
      
      return orderA - orderB;
    });
    
    return result;
  };
  
  // Преобразование данных для recharts
  const prepareChartData = () => {
    if (!historyData) return [];
    
    // Для daily_data
    if ('daily_data' in historyData) {
      // Группируем данные по месяцам для более ясного отображения
      const monthlyData: { [key: string]: { [status: string]: number } } = {};
      const monthNames: { [key: string]: string } = {};
      
      // Группировка по месяцам
      historyData.daily_data.forEach(day => {
        const monthYear = day.date.substring(0, 7); // Формат YYYY-MM
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {};
          monthNames[monthYear] = `${day.month.charAt(0).toUpperCase() + day.month.slice(1)} ${day.date.substring(0, 4)}`;
        }
        
        // Суммируем значения статусов по месяцам
        Object.entries(day.counts).forEach(([status, count]) => {
          if (status.startsWith('combined_')) {
            monthlyData[monthYear][status] = (monthlyData[monthYear][status] || 0) + count;
          }
        });
      });
      
      // Преобразуем в формат для диаграммы
      return Object.entries(monthlyData).map(([monthYear, counts]) => ({
        name: monthNames[monthYear],
        date: monthNames[monthYear],
        ...counts
      }));
    }
    
    // Для monthly_data
    return (historyData as MonthlyData[]).map((month: MonthlyData) => ({
      name: `${month.month_name} ${month.month.split('-')[0]}`,
      date: `${month.month_name} ${month.month.split('-')[0]}`,
      ...month.counts
    }));
  };
  
  // Функция для преобразования данных в формат для круговой диаграммы
  const preparePieChartData = () => {
    if (!historyData) return [];
    
    // Для режима сравнения между месяцами круговая диаграмма не подходит
    if (compareMode) {
      return prepareComparisonChartData();
    }
    
    // Получаем все статусы
    const statuses = getUniqueStatuses();
    
    // Создаем данные для круговой диаграммы
    const pieData: any[] = [];
    
    // Получаем общую сумму
    let totalCount = 0;
    
    // Вычисляем общую сумму для расчета процентов
    if ('total_stats' in historyData!) {
      const relevantStats = Object.entries(historyData!.total_stats)
        .filter(([status]) => status.startsWith('combined_'));
        
      totalCount = relevantStats.reduce((sum, [_, count]) => sum + (count as number), 0);
      
      // Формируем данные для круговой диаграммы
      relevantStats.forEach(([status, count]) => {
        const value = count as number;
        if (value > 0) {
          pieData.push({
            name: statusNameMap[status] || status,
            value: value,
            percent: ((value / totalCount) * 100).toFixed(1),
            color: statusColorMap[status] || '#8884d8'
          });
        }
      });
    } else {
      // Если нет total_stats (например, для monthly_data), агрегируем данные
      const statusCounts: {[key: string]: number} = {};
      
      if (Array.isArray(historyData)) {
        // Для monthly_data
        historyData.forEach((month: MonthlyData) => {
          Object.entries(month.counts).forEach(([status, count]) => {
            if (status.startsWith('combined_')) {
              statusCounts[status] = (statusCounts[status] || 0) + (count as number);
              totalCount += (count as number);
            }
          });
        });
      }
      
      // Формируем данные для круговой диаграммы из статусов
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          pieData.push({
            name: statusNameMap[status] || status,
            value: count,
            percent: ((count / totalCount) * 100).toFixed(1),
            color: statusColorMap[status] || '#8884d8'
          });
        }
      });
    }
    
    // Сортируем данные по значению (от большего к меньшему)
    return pieData.sort((a, b) => b.value - a.value);
  };
  
  // Функция для создания активного сектора круговой диаграммы с анимацией
  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const RADIAN = Math.PI / 180;
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
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.9}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
          opacity={0.7}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          textAnchor={textAnchor} 
          fill="#ccc" 
          fontSize={screenSize === 'sm' ? 10 : 12}
        >
          {payload.name}
        </text>
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          dy={18} 
          textAnchor={textAnchor} 
          fill="#999" 
          fontSize={screenSize === 'sm' ? 10 : 12}
        >
          {`${payload.percent}% (${value})`}
        </text>
      </g>
    );
  };
  
  // Обработчик наведения мыши на сектор
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  // Определение размера экрана для адаптации компонентов
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('sm');
      } else if (width < 1024) {
        setScreenSize('md');
      } else {
        setScreenSize('lg');
      }
    };
    
    // Инициализация при монтировании
    handleResize();
    
    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', handleResize);
    
    // Очистка при размонтировании
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Оптимизация отображения графика в зависимости от размера экрана
  const getChartMargin = () => {
    switch (screenSize) {
      case 'sm':
        return compareMode 
          ? { top: 10, right: 10, left: 80, bottom: 5 } 
          : { top: 50, right: 20, left: 0, bottom: 40 };
      case 'md':
        return compareMode 
          ? { top: 15, right: 20, left: 100, bottom: 5 } 
          : { top: 50, right: 30, left: 0, bottom: 40 };
      default:
        return compareMode 
          ? { top: 20, right: 30, left: 120, bottom: 5 } 
          : { top: 50, right: 40, left: 10, bottom: 30 };
    }
  };
  
  // Оптимизация размера шрифта для меток
  const getChartFontSize = () => {
    return screenSize === 'sm' ? 10 : screenSize === 'md' ? 11 : 12;
  };
  
  // Определение высоты графика
  const getChartHeight = () => {
    return compareMode 
      ? Math.max(300, comparisonMonths.length * 30 + 150) // Динамическая высота для сравнения
      : screenSize === 'sm' ? 300 : 400;
  };
  
  // Кастомный компонент для тиков оси Y в режиме сравнения
  const CustomComparisonYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={-10} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fill="#e2e8f0" 
          fontSize={getChartFontSize() + 1}
          style={{ whiteSpace: 'nowrap' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };
  
  // Кастомный компонент для отрисовки тиков Y-оси с цветовыми индикаторами (для обычного режима)
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload, width } = props;
    const status = payload.value;
    const statusKey = prepareStatusBarData().find(item => item.status === status)?.statusKey;
    const color = statusKey ? statusColorMap[statusKey] : '#fff';
    
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
          {status}
        </text>
      </g>
    );
  };
  
  // Функция для создания пользовательской всплывающей подсказки с детальной информацией
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Сортируем статусы для отображения в том же порядке, что и в легенде
      const sortedPayload = [...payload].sort((a, b) => {
        const orderA = getStatusOrder(a.dataKey);
        const orderB = getStatusOrder(b.dataKey);
        return orderA - orderB;
      });

      return (
        <div className="bg-[#1e293b] border border-[#475569] rounded-md p-3 shadow-lg transform scale-105 transition-all duration-200 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {sortedPayload.map((entry, index) => {
            // Получаем читаемое имя статуса и проверяем, что это комбинированный статус
            if (!entry.dataKey.startsWith('combined_')) return null;
            
            const statusName = statusNameMap[entry.dataKey] || entry.dataKey.replace('combined_', '');
            return (
              <div key={`item-${index}`} className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 mr-2" 
                    style={{ backgroundColor: entry.fill }}
                  ></div>
                  <span className="text-sm text-[#ccc]">{statusName}</span>
                </div>
                <span className="text-sm font-medium ml-4" style={{ color: entry.fill }}>
                  : {entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Функция для определения порядка сортировки статусов
  const getStatusOrder = (status: string) => {
    // Нормализуем статус для сравнения
    const normalizedStatus = status.replace(/[-_\s]/g, '').toLowerCase();
    
    const order: { [key: string]: number } = {
      'combinedновый': 1,
      'combinedнарассмотрении': 2,
      'combinedтелефонноеинтервью': 3,
      'combinedсобеседование': 4,
      'combinedслужбабезопасности': 5,
      'combinedоффер': 6,
      'combinedофер': 6,
      'combinedсбордокументов': 7,
      'combinedпринятнаработу': 8,
      'combinedрезерв': 9,
      'combinedотказ': 10
    };
    return order[normalizedStatus] || 999;
  };
  
  // Функция для расчета общей суммы статусов для указанного месяца
  const calculateMonthTotal = (monthData: any) => {
    return Object.entries(monthData)
      .filter(([key]) => key.startsWith('combined_'))
      .reduce((sum, [_, value]) => sum + (value as number), 0);
  };
  
  // Функция для подготовки данных для горизонтальной гистограммы со статусами
  const prepareStatusBarData = () => {
    if (!chartData || chartData.length === 0) return [];
    
    // Берем последний месяц из данных
    const lastMonth = chartData[chartData.length - 1];
    const totalCount = calculateMonthTotal(lastMonth);
    
    // Создаем набор уникальных имен статусов (как для режима сравнения)
    const uniqueStatusNames = new Set<string>();
    const statusNameToKeys: { [name: string]: string[] } = {};
    
    // Находим все уникальные имена статусов и соответствующие им ключи
    uniqueStatuses
      .filter(status => status.startsWith('combined_'))
      .forEach(statusKey => {
        const statusName = statusNameMap[statusKey] || statusKey.replace('combined_', '');
        uniqueStatusNames.add(statusName);
        
        if (!statusNameToKeys[statusName]) {
          statusNameToKeys[statusName] = [];
        }
        statusNameToKeys[statusName].push(statusKey);
      });
    
    // Формируем данные где каждый статус - отдельная строка
    const result = Array.from(uniqueStatusNames).map(statusName => {
      // Все ключи для данного имени статуса
      const statusKeys = statusNameToKeys[statusName] || [];
      
      // Суммируем значения по всем ключам этого статуса
      let totalCount = 0;
      statusKeys.forEach(statusKey => {
        if (lastMonth[statusKey]) {
          totalCount += lastMonth[statusKey] as number;
        }
      });
      
      // Берем первый ключ как представительный для цвета
      const statusKey = statusKeys[0];
      const percent = totalCount > 0 ? Math.round((totalCount / calculateMonthTotal(lastMonth)) * 100) : 0;
      
      return {
        status: statusName,
        count: totalCount,
        percent: percent,
        value: totalCount,
        statusKey: statusKey,
        formattedValue: `${totalCount}`
      };
    });
    
    // Отфильтровываем статусы с нулевыми значениями и сортируем по убыванию
    return result
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };
  
  // Обновим функцию для получения названия месяца
  const getMonthName = (monthIndex: number) => {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return monthNames[monthIndex];
  };
  
  // В начале компонента добавим обработчик переключения режима отображения
  const handleDisplayModeChange = (mode: 'daily' | 'monthly') => {
    setInternalDisplayMode(mode);
    if (mode === 'daily') {
      // При переключении на daily режим, используем даты выбранного месяца
      const monthStartDate = new Date(selectedYear, selectedMonth, 1);
      const monthEndDate = new Date(selectedYear, selectedMonth + 1, 0);
      setStartDate(monthStartDate.toISOString());
      setEndDate(monthEndDate.toISOString());
    }
  };
  
  // Добавим функцию для обработки смены месяца
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    
    // При смене месяца всегда обновляем даты для корректного отображения данных
    const monthStartDate = new Date(selectedYear, newMonth, 1);
    const monthEndDate = new Date(selectedYear, newMonth + 1, 0);
    
    // Если мы в режиме по месяцам, но переключаемся между месяцами,
    // мы должны обновить даты для корректного отображения данных
    setStartDate(monthStartDate.toISOString());
    setEndDate(monthEndDate.toISOString());
    
    // Принудительно очищаем данные, чтобы показать сообщение "нет данных" до загрузки новых
    setHistoryData(null);
  };
  
  // Добавим функцию для обработки смены года
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    
    // При смене года всегда обновляем даты
    const monthStartDate = new Date(newYear, selectedMonth, 1);
    const monthEndDate = new Date(newYear, selectedMonth + 1, 0);
    
    setStartDate(monthStartDate.toISOString());
    setEndDate(monthEndDate.toISOString());
    
    // Принудительно очищаем данные
    setHistoryData(null);
  };
  
  // Добавим функцию проверки наличия данных за выбранный период
  const hasDataForSelectedPeriod = () => {
    // Проверка на будущие месяцы
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Если выбранный месяц в будущем, точно нет данных
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      return false;
    }
    
    // Если данные еще не загружены
    if (!historyData) return false;
    
    // Для daily_data
    if ('daily_data' in historyData) {
      // Проверяем есть ли дни за выбранный месяц
      if (historyData.daily_data.length === 0) return false;
      
      // Проверяем, что данные относятся к выбранному месяцу и году
      const dataForSelectedPeriod = historyData.daily_data.some(day => {
        const dayDate = new Date(day.date);
        return dayDate.getMonth() === selectedMonth && dayDate.getFullYear() === selectedYear;
      });
      
      if (!dataForSelectedPeriod) return false;
      
      // Проверяем, что в данных за месяц есть хоть какие-то статусы с ненулевыми значениями
      const hasAnyData = Object.values(historyData.total_stats || {})
        .some(count => (count as number) > 0);
      
      return hasAnyData;
    }
    
    // Для monthly_data
    if (Array.isArray(historyData)) {
      if (historyData.length === 0) return false;
      
      // Проверяем, есть ли данные для выбранного месяца
      const monthData = historyData.find(month => {
        const [year, monthNum] = month.month.split('-').map(Number);
        return year === selectedYear && monthNum === selectedMonth + 1;
      });
      
      if (!monthData) return false;
      
      // Проверяем, есть ли в данных ненулевые значения
      const hasAnyData = Object.values(monthData.counts || {})
        .some(count => (count as number) > 0);
      
      return hasAnyData;
    }
    
    return false;
  };
  
  // Добавляем функцию для экспорта в Excel
  const exportToExcel = () => {
    let exportData;
    
    if (compareMode && comparisonMonths.length > 0) {
      // Для режима сравнения
      exportData = chartData.map(item => {
        const rowData: any = { 'Статус': item.status };
        comparisonMonths.forEach(month => {
          rowData[month.label] = item[month.label] || 0;
        });
        return rowData;
      });
    } else {
      // Для обычного режима
      const data = prepareStatusBarData();
      exportData = data.map(item => ({
        'Статус': item.status,
        'Количество': item.count,
        'Процент': `${item.percent}%`
      }));
    }

    // Создание рабочей книги Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Установка ширины столбцов
    const colWidths = [
      { wch: 25 }, // Статус
      ...Object.keys(exportData[0] || {}).slice(1).map(() => ({ wch: 15 }))
    ];
    ws['!cols'] = colWidths;

    // Добавление листа в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'История статусов');

    // Сохранение файла
    const fileName = compareMode 
      ? `История_статусов_сравнение_${new Date().toISOString().split('T')[0]}.xlsx`
      : `История_статусов_${getMonthName(selectedMonth)}_${selectedYear}.xlsx`;
    
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
        <p className="font-medium">Ошибка</p>
        <p>{error}</p>
      </div>
    );
  }
  
  // Готовим данные для диаграммы в зависимости от типа
  const chartData = (() => {
    if (compareMode) return prepareComparisonChartData();
    if (chartType === 'pie') return preparePieChartData();
    return prepareChartData();
  })();
  
  const uniqueStatuses = getUniqueStatuses();
  
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
                  // При включении режима сравнения переключаем на столбчатую диаграмму
                  if (newCompareMode && chartType === 'pie') {
                    setChartType('bar');
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
      
      {/* Компонент для выбора месяцев для сравнения - оптимизирован для мобильных */}
      {compareMode && (
        <div className="mb-6 p-3 sm:p-4 bg-[#131f35] rounded-lg">
          <h3 className="text-base sm:text-lg font-medium text-blue-300 mb-2 sm:mb-3">Выбор месяцев для сравнения</h3>
          
          {/* Отображение выбранных месяцев - адаптивно */}
          <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
            {comparisonMonths.length === 0 ? (
              <div className="text-gray-400 text-xs sm:text-sm italic">Выберите месяцы для сравнения</div>
            ) : (
              comparisonMonths.map((month, index) => (
                <div 
                  key={month.value}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-700 text-white text-xs sm:text-sm rounded-lg"
                  style={{ borderLeft: `3px solid ${statusColorMap[month.value.split('_')[1]]}` }}
                >
                  <span>{month.label}</span>
                  <button
                    onClick={() => removeMonthFromComparison(month.value)}
                    className="ml-1 sm:ml-2 text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Выпадающий список для добавления месяцев - более компактный */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="w-full sm:w-64">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">Добавить месяц</label>
              <div className="relative">
                <select
                  className="block w-full pl-2 pr-8 py-1 sm:pl-3 sm:pr-10 sm:py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  onChange={(e) => {
                    const selectedOption = availableMonths.find(m => m.value === e.target.value);
                    if (selectedOption) {
                      addMonthToComparison(selectedOption);
                    }
                  }}
                  value=""
                >
                  <option value="" disabled>Выберите месяц</option>
                  {availableMonths.map((month) => (
                    <option 
                      key={month.value} 
                      value={month.value}
                      disabled={comparisonMonths.some(m => m.value === month.value)}
                    >
                      {month.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            <button
              className="px-2 py-1 sm:px-3 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 flex items-center justify-center sm:justify-start gap-1"
              onClick={() => {
                // Добавление текущего месяца, если он еще не выбран
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth();
                const monthValue = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
                
                if (!comparisonMonths.some(m => m.value === monthValue)) {
                  const monthOption = availableMonths.find(m => m.value === monthValue);
                  if (monthOption) {
                    addMonthToComparison(monthOption);
                  }
                }
              }}
            >
              <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Добавить текущий месяц</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-[#0F172A] rounded-lg shadow-lg p-3 sm:p-4">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            {compareMode 
              ? 'Сравнение статусов по месяцам' 
              : `История статусов за ${getMonthName(selectedMonth)} ${selectedYear}`
            }
          </h2>
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed font-medium"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Скачать в Excel
          </button>
        </div>
        
        <div ref={chartContainerRef} style={{ height: chartType === 'pie' ? (screenSize === 'sm' ? 350 : 450) : getChartHeight() }}>
          {!hasDataForSelectedPeriod() ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 max-w-md">
                <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-base font-medium text-gray-300">Нет данных</h3>
                <p className="mt-1 text-sm text-gray-400">
                  За выбранный период ({getMonthName(selectedMonth)} {selectedYear}) нет данных о кандидатах.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {compareMode ? (
                // Режим сравнения - с улучшенным дизайном
                <BarChart 
                  data={chartData}
                  layout="vertical"
                  margin={getChartMargin()}
                  barGap={screenSize === 'sm' ? 2 : 4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b4b6b" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#e2e8f0', fontSize: getChartFontSize() + 1 }} 
                    tickFormatter={(value) => screenSize === 'sm' ? value.toString() : value.toString()}
                    axisLine={{ stroke: '#4b5f88' }}
                    tickLine={{ stroke: '#4b5f88' }}
                  />
                  <YAxis 
                    dataKey="status" 
                    type="category" 
                    width={screenSize === 'sm' ? 150 : screenSize === 'md' ? 180 : 200}
                    axisLine={{ stroke: '#4b5f88' }}
                    tickLine={{ stroke: '#4b5f88' }}
                    interval={0}
                    tickCount={chartData.length}
                    tick={<CustomComparisonYAxisTick />}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      borderColor: '#4b5f88',
                      color: '#fff',
                      fontSize: getChartFontSize() + 1,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                      borderRadius: '0.5rem',
                      padding: '10px 14px',
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      fontSize: getChartFontSize() + 1, 
                      color: '#e2e8f0',
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: '5px',
                      padding: '5px 10px',
                    }}
                    layout={screenSize === 'sm' ? 'horizontal' : 'horizontal'}
                    verticalAlign={screenSize === 'sm' ? 'bottom' : 'top'}
                    align="center"
                    iconSize={10}
                    iconType="circle"
                  />
                  
                  {comparisonMonths.map((month, index) => {
                    const color = statusColorMap[month.value.split('_')[1]];
                    const showLabel = screenSize !== 'sm'; // Скрываем метки на маленьких экранах
                    
                    // Разные яркие цвета для разных месяцев/годов
                    const monthColors = [
                      '#6399ff', // Яркий голубой
                      '#ff9475', // Яркий оранжевый
                      '#65de6a', // Яркий зеленый
                      '#ffb952', // Яркий желтый
                      '#b687ff', // Яркий фиолетовый
                      '#54c7c5', // Яркий бирюзовый
                      '#ff7eb6', // Яркий розовый
                      '#59b0ff'  // Яркий синий
                    ];
                    
                    // Выбираем цвет в зависимости от индекса месяца
                    const barColor = monthColors[index % monthColors.length];
                    
                    return (
                      <Bar 
                        key={month.value} 
                        dataKey={month.label}
                        name={screenSize === 'sm' ? month.label.split(' ')[0] : month.label} // Сокращаем названия месяцев
                        fill={barColor}
                        background={{ fill: '#1e293b', opacity: 0.1 }}
                        radius={[0, 5, 5, 0]}
                        minPointSize={5}
                        animationDuration={750}
                        isAnimationActive={true}
                        stroke="none"
                      >
                        {showLabel && (
                          <LabelList 
                            dataKey={month.label} 
                            position="right" 
                            fill="#ffffff" 
                            fontSize={screenSize === 'md' ? 12 : 13}
                            fontWeight="bold"
                            formatter={(value: number) => value > 0 ? value : ''}
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.7)' }}
                          />
                        )}
                        {comparisonMonths.length <= 2 && chartData.map((entry, i) => (
                          <Cell 
                            key={`cell-${i}`} 
                            fill={barColor}
                            opacity={1.0}
                            stroke="none"
                          />
                        ))}
                      </Bar>
                    );
                  })}
                </BarChart>
              ) : chartType === 'pie' ? (
                // Круговая диаграмма с интерактивностью
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
                    labelFormatter={() => 'Статус'}
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
                // Стандартная диаграмма областей 
                <AreaChart 
                  data={chartData}
                  margin={getChartMargin()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="date"
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
                  <Legend 
                    wrapperStyle={{ fontSize: getChartFontSize(), color: '#ccc' }}
                    layout={screenSize === 'sm' ? 'horizontal' : 'horizontal'}
                    verticalAlign="top"
                    align="center"
                  />
                  
                  {uniqueStatuses
                    .filter(status => status.startsWith('combined_'))
                    .map(status => (
                      <Area
                        key={status}
                        type="monotone"
                        dataKey={status}
                        name={statusNameMap[status] || status}
                        fill={statusColorMap[status]}
                        stroke={statusColorMap[status]}
                        fillOpacity={0.6}
                        stackId="1"
                      />
                    ))}
                </AreaChart>
              ) : (
                <BarChart 
                  data={prepareStatusBarData()}
                  layout="vertical"
                  margin={{ top: 20, right: 140, left: 140, bottom: 5 }}
                  barGap={5}
                  barSize={screenSize === 'sm' ? 25 : 35}
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
                    width={140}
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
                    {prepareStatusBarData().map((entry, index) => {
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={statusColorMap[entry.statusKey]} 
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
              )}
            </ResponsiveContainer>
          )}
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
      </div>
      
      {!compareMode && historyData && 'total_stats' in historyData && chartType !== 'pie' && (
        <div className="mt-4 sm:mt-6 bg-[#0F172A] rounded-lg shadow-lg p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Общая статистика</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
            {Object.entries(historyData.total_stats)
              .filter(([status]) => status.startsWith('combined_'))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([status, count]) => (
                <div
                  key={status}
                  className="bg-gray-800 rounded-lg p-2 sm:p-3 border-l-4"
                  style={{ borderLeftColor: statusColorMap[status] || '#8884d8' }}
                >
                  <p className="text-xs sm:text-sm text-gray-400">{statusNameMap[status] || status}</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{count}</p>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {compareMode && comparisonMonths.length > 0 && (
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
                    <th className="py-2 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold rounded-l-md">Статус</th>
                    {comparisonMonths.map((month, idx) => (
                      <th 
                        key={month.value} 
                        className={`py-2 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium ${idx === comparisonMonths.length - 1 ? 'rounded-r-md' : ''}`}
                        style={{ 
                          color: 'white',
                          backgroundColor: `${statusColorMap[month.value.split('_')[1]]}30` 
                        }}
                      >
                        {screenSize === 'sm' ? month.label.split(' ')[0] : month.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="border-t border-[#2d3c59] hover:bg-[#1e293b] transition-colors duration-150">
                      <td className="py-1.5 sm:py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm">{row.status}</td>
                      {comparisonMonths.map((month, monthIdx) => {
                        const value = row[month.label] || 0;
                        const color = statusColorMap[month.value.split('_')[1]];
                        return (
                          <td 
                            key={`${idx}-${month.value}`} 
                            className="py-1.5 sm:py-2 px-3 sm:px-4 text-right font-semibold text-xs sm:text-sm"
                            style={{ 
                              color: value > 0 ? color : '#64748b',
                              backgroundColor: value > 0 ? `${color}10` : 'transparent'
                            }}
                          >
                            {value || 0}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusHistoryChart; 