// Этот файл содержит конфигурацию переменных окружения, которые должны быть доступны на клиенте

// Базовые URL'ы
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL.replace(/^http/, 'ws');

// API Intelligence IO URL с правильным форматом
export const IO_INTELLIGENCE_URL = process.env.NEXT_PUBLIC_IO_INTELLIGENCE_URL || 'https://api.intelligence.io.solutions/api/v1';

// API ключи - временно хардкодим для отладки
export const IO_INTELLIGENCE_API_KEY = 'io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImM2MzZlZTUzLTQ4ODItNDk2My05YTE3LWYzZjdlMjBhNjAyYSIsImV4cCI6NDg5NjY3MzE4OH0.RmZKYZxm7EQ-IKxIfpIU3bgZdlDtaJ9gnwWPQkXl7UINoQ-PHp9GpHvv1qDiO2i_hUiaW6u9XH1-5N_rj9w2Og';

// Логируем конфигурацию для отладки
console.log('Environment configuration loaded:');
console.log('- API URL:', API_URL);
console.log('- WebSocket URL:', WS_URL);
console.log('- IO Intelligence URL:', IO_INTELLIGENCE_URL);
console.log('- IO Intelligence API Key defined:', !!IO_INTELLIGENCE_API_KEY);
console.log('- IO Intelligence API Key length:', IO_INTELLIGENCE_API_KEY.length); 