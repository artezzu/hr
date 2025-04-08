const getBaseUrl = () => {
  // В продакшене здесь будет другой URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const getWsUrl = () => {
  // В продакшене здесь будет другой URL для WebSocket
  // Получаем базовый URL и преобразуем его для WebSocket
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Заменяем http на ws и https на wss
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  
  console.log(`WebSocket URL configured as: ${wsUrl}`);
  return process.env.NEXT_PUBLIC_WS_URL || wsUrl;
};

const getIoIntelligenceUrl = () => {
  // URL для API IO Intelligence
  const url = process.env.NEXT_PUBLIC_IO_INTELLIGENCE_URL || 'https://api.intelligence.io.solutions';
  console.log(`Intelligence IO URL configured as: ${url}`);
  return url;
};

// Для отладки - покажем, что API ключ определен
console.log('Intelligence API Key is defined:', !!process.env.NEXT_PUBLIC_IO_INTELLIGENCE_API_KEY);

export const config = {
  apiUrl: getBaseUrl(),
  wsUrl: getWsUrl(),
  ioIntelligenceUrl: getIoIntelligenceUrl(),
  endpoints: {
    applications: '/applications/',
    messages: (applicationId: number) => `/applications/${applicationId}/messages`,
    status: (applicationId: number) => `/applications/${applicationId}/status`,
    ws: '/ws'
  }
}; 