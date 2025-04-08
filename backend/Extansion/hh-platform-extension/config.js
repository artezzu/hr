/**
 * Конфигурация расширения HeadHunter Platform Import
 * 
 * Этот файл содержит все настраиваемые параметры расширения.
 * При развертывании на сервере измените только этот файл.
 */

const CONFIG = {
  // URL API бэкенда
  API_URL: 'http://localhost:8000',
  
  // Маппинг доменов HeadHunter для скачивания PDF файлов
  PDF_DOMAIN_MAPPINGS: {
    'hh.uz': 'https://tashkent.hh.uz',
    'hh.ru': 'https://hh.ru',
    // Добавьте другие домены по мере необходимости
  },
  
  // Настройки кнопки импорта
  BUTTON_STYLES: {
    normal: {
      backgroundColor: '#10b981', // Зеленый цвет
      color: 'white'
    },
    importing: {
      backgroundColor: '#6B7280', // Серый цвет
      color: 'white'
    },
    success: {
      backgroundColor: '#059669', // Темно-зеленый цвет
      color: 'white'
    },
    failed: {
      backgroundColor: '#EF4444', // Красный цвет
      color: 'white'
    },
    alreadyExists: {
      backgroundColor: '#F59E0B', // Оранжевый цвет
      color: 'white'
    }
  },
  
  // Настройки уведомлений
  NOTIFICATION_STYLES: {
    success: {
      backgroundColor: '#F0FDF4',
      textColor: '#166534',
      borderColor: '#10B981'
    },
    error: {
      backgroundColor: '#FEF2F2',
      textColor: '#B91C1C',
      borderColor: '#EF4444'
    },
    warning: {
      backgroundColor: '#FFFBEB',
      textColor: '#92400E',
      borderColor: '#F59E0B'
    }
  }
};

// Экспортируем конфигурацию
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
} 