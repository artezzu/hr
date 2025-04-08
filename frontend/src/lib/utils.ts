import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse } from "date-fns"
import { ru } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateString: string) {
  try {
    // Попробуем распарсить дату, добавив информацию о временной зоне, если ее нет
    // Предполагаем, что время приходит в UTC или локальном времени сервера, отображаем в локальном времени клиента
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Проверка на валидность даты
      console.warn("Invalid date string received for formatDateTime:", dateString);
      return "Неверная дата";
    }
    return format(date, 'dd MMMM yyyy HH:mm', { locale: ru });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Ошибка даты";
  }
}

// Новая функция для форматирования времени
export function formatTime(timeString: string): string {
  try {
    // Проверяем формат HH:MM или HH:MM:SS
    if (!/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(timeString)) {
      console.warn("Invalid time string received for formatTime:", timeString);
      return "--:--"; // Возвращаем плейсхолдер или пустую строку
    }
    
    // Парсим время. Добавляем фиктивную дату, так как parse требует дату
    const dateWithTime = parse(timeString, 'HH:mm:ss', new Date());
    if (isNaN(dateWithTime.getTime())) {
      // Если парсинг с секундами не удался, пробуем без секунд
      const dateWithoutSeconds = parse(timeString, 'HH:mm', new Date());
      if (isNaN(dateWithoutSeconds.getTime())) {
        console.warn("Failed to parse time string:", timeString);
        return "--:--"; 
      }
      return format(dateWithoutSeconds, 'HH:mm');
    }
    
    return format(dateWithTime, 'HH:mm'); // Форматируем в HH:MM
  } catch (error) {
    console.error("Error formatting time:", timeString, error);
    return "Ошибка времени";
  }
} 