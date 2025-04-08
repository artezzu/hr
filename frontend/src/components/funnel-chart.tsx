import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface FunnelItem {
  label: string;
  value: number;
  color: string;
  gradient: string;
}

export interface FunnelChartRef {
  exportToExcel: () => void;
}

const FunnelChart = forwardRef<FunnelChartRef>((props, ref) => {
  const [data, setData] = useState<FunnelItem[]>([
    { 
      label: 'Новый', 
      value: 120,
      color: '#4287f5',
      gradient: 'from-blue-600 to-blue-400'
    },
    { 
      label: 'На рассмотрении', 
      value: 82,
      color: '#f59e0b',
      gradient: 'from-orange-500 to-orange-400'
    },
    { 
      label: 'Телефонное интервью', 
      value: 56,
      color: '#f97316',
      gradient: 'from-orange-600 to-orange-400'
    },
    { 
      label: 'Собеседование', 
      value: 43,
      color: '#a855f7',
      gradient: 'from-purple-600 to-purple-400'
    },
    { 
      label: 'Служба безопасности', 
      value: 34,
      color: '#14b8a6',
      gradient: 'from-teal-600 to-teal-400'
    },
    { 
      label: 'Оффер', 
      value: 26,
      color: '#ec4899',
      gradient: 'from-pink-600 to-pink-400'
    },
    { 
      label: 'Сбор документов', 
      value: 21,
      color: '#6366f1',
      gradient: 'from-indigo-600 to-indigo-400'
    },
    { 
      label: 'Принят на работу', 
      value: 18,
      color: '#22c55e',
      gradient: 'from-green-600 to-green-400'
    },
    { 
      label: 'Резерв', 
      value: 12,
      color: '#64748b',
      gradient: 'from-slate-600 to-slate-400'
    },
    { 
      label: 'Отказ', 
      value: 37,
      color: '#ef4444',
      gradient: 'from-red-600 to-red-400'
    }
  ]);

  // Функция для экспорта данных в Excel
  const exportToExcel = () => {
    try {
      // Подготовка данных для экспорта
      const exportData = data.map(item => ({
        'Статус': item.label,
        'Количество кандидатов': item.value
      }));
      
      // Добавляем итоговую строку с общим числом кандидатов
      const totalCandidates = data.reduce((sum, item) => sum + item.value, 0);
      exportData.push({
        'Статус': 'ВСЕГО',
        'Количество кандидатов': totalCandidates
      });

      // Создание рабочей книги Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Установка ширины столбцов
      const colWidths = [
        { wch: 25 }, // Статус
        { wch: 20 }  // Количество кандидатов
      ];
      ws['!cols'] = colWidths;

      // Добавление листа в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'Воронка рекрутинга');

      // Сохранение файла
      XLSX.writeFile(wb, `Воронка_рекрутинга_${new Date().toISOString().split('T')[0]}.xlsx`);
      console.log('Excel файл успешно создан и скачан');
    } catch (error) {
      console.error('Ошибка при создании Excel файла:', error);
      alert('Произошла ошибка при экспорте данных. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Экспортируем функцию через ref
  useImperativeHandle(ref, () => ({
    exportToExcel
  }));

  // Кастомный компонент для всплывающих подсказок
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0F172A] border border-gray-700 rounded-md p-3 shadow-lg text-white">
          <p className="font-semibold">{payload[0].payload.label}</p>
          <p className="text-lg">{`${payload[0].value} кандидатов`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="funnel-chart" className="bg-[#0a1929] border border-[#1e3a5f]/50 shadow-lg shadow-blue-900/20 rounded-lg p-6 w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Воронка рекрутинга</h2>
      </div>
      
      <div className="h-[600px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 150,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#243557" />
            <XAxis type="number" tick={{ fill: '#CBD5E1' }} domain={[0, 'dataMax']} />
            <YAxis 
              dataKey="label" 
              type="category" 
              tick={{ fill: '#CBD5E1', fontSize: 14 }} 
              width={140}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#${entry.gradient})`} />
              ))}
            </Bar>
            {data.map((item, index) => (
              <defs key={`gradient-${index}`}>
                <linearGradient id={item.gradient.replace('from-', '').replace('to-', '')} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={item.color} />
                  <stop offset="100%" stopColor={`${item.color}cc`} />
                </linearGradient>
              </defs>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {data.map((item, index) => (
          <div 
            key={`stat-${index}`}
            className={`bg-[#0F172A] rounded-lg p-3 border-l-4 transform transition-transform hover:scale-105`}
            style={{ borderLeftColor: item.color }}
          >
            <div className="text-gray-400 text-sm mb-1">{item.label}</div>
            <div className="text-xl font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

FunnelChart.displayName = 'FunnelChart';

export default FunnelChart; 