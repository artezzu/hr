'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { config } from '@/config';

// Интерфейс для контекста WebSocket
interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

// Создаем контекст
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
});

// Провайдер WebSocket
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Получаем токен из localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('WebSocket: No token found, skipping connection');
      return;
    }

    // Создаем WebSocket соединение
    const wsUrl = `${config.wsUrl}?token=${token}`;
    console.log('Attempting to connect to WebSocket at', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    // Обработчики событий WebSocket
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        console.log('WebSocket raw data received:', event.data);
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Воспроизведение звука для уведомления о задаче
        if (data.type === 'upcoming_task') {
          console.log('Upcoming task notification received, playing sound...');
          // Создаем и воспроизводим звук
          // Убедитесь, что файл /sounds/notification.mp3 существует в папке public
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(err => {
              console.error("Error playing sound:", err);
              // Ошибки могут возникать из-за политики браузера (автовспроизведение)
              // Можно добавить уведомление пользователю о необходимости взаимодействия для включения звука
            });
          } catch (soundError) {
            console.error("Could not create or play audio:", soundError);
          }
          
          // Здесь можно также обновить состояние уведомлений или показать всплывающее сообщение
          // Например, с использованием react-hot-toast
          // toast.info(`Скоро начнется задача: ${data.task.title}`);
        }
        
        // Проверяем статус подключения
        if (data.status === 'connected') {
          console.log('WebSocket authenticated as user:', data.user);
        }
        
        // Здесь можно добавить обработку других типов сообщений
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };

    // Сохраняем соединение в состоянии
    setSocket(ws);

    // Очистка при размонтировании компонента
    return () => {
      ws.close();
    };
  }, []);

  // Функция для отправки сообщений через WebSocket
  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Хук для использования WebSocket контекста
export function useWebSocket() {
  return useContext(WebSocketContext);
} 