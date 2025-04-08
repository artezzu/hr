'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  MapPin, 
  Phone, 
  MessageCircle,
  Languages,
  Calendar,
  FileText,
  Clock,
  Send
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { config } from '@/config';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Transition } from '@headlessui/react';

interface StatusHistory {
  id: number;
  status: string;
  comment: string;
  created_at: string;
  created_by: string;
}

interface Application {
  id: number;
  position: string;
  full_name: string;
  birth_date: string;
  specialization: string;
  education: string;
  citizenship: string;
  experience: string;
  city: string;
  phone: string;
  telegram: string;
  languages: string;
  source: string;
  status: string;
  created_at: string;
  status_history: StatusHistory[];
  hasUnreadMessages: boolean;
  resume_file_path?: string;
}

interface Message {
  id: number;
  content: string;
  sender: string;
  sender_name?: string;
  created_at: string;
}

// Выносим компонент сообщения в отдельный мемоизированный компонент
const ChatMessage = memo(({ message, formatDate }: { message: Message, formatDate: (date: string) => string }) => {
  const userName = localStorage.getItem('user_name') || 'HR Manager';
  
  return (
    <div
      className={`flex ${message.sender === 'hr' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.sender === 'hr'
            ? 'bg-[#3b5998] text-white'
            : 'bg-[#1e1f25] text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <User className="w-3 h-3 text-gray-300" />
          <span className="text-xs opacity-70">
            {message.sender === 'hr' ? userName : 'Кандидат'}
          </span>
        </div>
        <div className="text-sm">{message.content}</div>
        <div className="text-xs mt-1 opacity-70">
          {formatDate(message.created_at)}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

// Выносим компонент списка сообщений
const MessagesList = memo(({ messages, formatDate, messagesEndRef }: { 
  messages: Message[], 
  formatDate: (date: string) => string,
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>
}) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
    <style jsx global>{`
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #1F2937;
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #4B5563;
        border-radius: 3px;
        border: 2px solid #1F2937;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #6B7280;
      }
    `}</style>
    {messages.map((message) => (
      <ChatMessage key={message.id} message={message} formatDate={formatDate} />
    ))}
    <div ref={messagesEndRef} />
  </div>
));

MessagesList.displayName = 'MessagesList';

const ChatDialog = memo(({ 
  application, 
  onClose,
  ws,
  setIsChatOpen,
  fetchMessages,
  formatDate
}: { 
  application: Application, 
  onClose: () => void,
  ws: WebSocket | null,
  setIsChatOpen: (isOpen: boolean) => void,
  fetchMessages: (applicationId: number) => Promise<Message[]>,
  formatDate: (date: string) => string
}) => {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localNewMessage, setLocalNewMessage] = useState('');
  const localMessagesEndRef = useRef<HTMLDivElement>(null);
  const messageHandler = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    setIsChatOpen(true);
    const loadMessages = async () => {
      const msgs = await fetchMessages(application.id);
      setLocalMessages(msgs);
    };
    loadMessages();

    return () => {
      setIsChatOpen(false);
    };
  }, [application.id, setIsChatOpen, fetchMessages]);

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      messageHandler.current = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.application_id === application.id) {
            setLocalMessages(prev => {
              if (prev.some(msg => msg.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
            
            requestAnimationFrame(() => {
              if (localMessagesEndRef.current) {
                localMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
              }
            });
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      ws.addEventListener('message', messageHandler.current);
      return () => {
        if (messageHandler.current) {
          ws.removeEventListener('message', messageHandler.current);
        }
      };
    }
  }, [ws?.readyState, application.id]);

  const handleSendMessage = useCallback(async () => {
    if (!localNewMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const userName = localStorage.getItem('user_name') || 'HR Manager';
      const response = await fetch(`${config.apiUrl}${config.endpoints.messages(application.id)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: localNewMessage,
          sender_name: userName
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const message = await response.json();
      setLocalMessages(prev => [...prev, message]);
      setLocalNewMessage('');
      requestAnimationFrame(() => {
        if (localMessagesEndRef.current) {
          localMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [localNewMessage, application.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <DialogContent 
      className="bg-[#0a1929] border-0 text-white max-w-2xl h-[80vh] flex flex-col custom-scrollbar"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogTitle className="sr-only">
        Чат с кандидатом
      </DialogTitle>
      <DialogDescription className="sr-only">
        Диалог для общения с кандидатом. Здесь вы можете просматривать историю сообщений и отправлять новые сообщения.
      </DialogDescription>
      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1e88e5 #0a1929;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a1929;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1e88e5;
          border-radius: 3px;
          border: 2px solid #0a1929;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #2196f3;
        }
      `}</style>
      <DialogHeader>
        <DialogTitle>Чат с кандидатом</DialogTitle>
        <DialogDescription>
          Чат для общения с кандидатом
        </DialogDescription>
      </DialogHeader>

      <MessagesList 
        messages={localMessages} 
        formatDate={formatDate} 
        messagesEndRef={localMessagesEndRef}
      />

      <div className="p-4 border-t border-[#1e3a5f]">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Введите сообщение..."
            value={localNewMessage}
            onChange={(e) => setLocalNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[#0d2137] border border-[#1e3a5f] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSendMessage();
            }}
            className="bg-[#2196f3] hover:bg-[#1e88e5] text-white px-4 rounded-md flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <Button 
          onClick={onClose}
          className="w-full bg-[#3b5998] hover:bg-[#4c70ba] transition-colors duration-200"
        >
          Закрыть
        </Button>
      </div>
    </DialogContent>
  );
});

ChatDialog.displayName = 'ChatDialog';

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<{id: number; message: string; application: Application}[]>([]);
  const [notificationSound, setNotificationSound] = useState<HTMLAudioElement | null>(null);
  const isComponentMounted = useRef(true);
  const processedMessages = useRef(new Set<string>());

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      processedMessages.current.clear();
    };
  }, []);

  useEffect(() => {
    fetchApplications();

    // Добавляем слушатель события для открытия чата
    const handleOpenChat = (event: CustomEvent) => {
      const { application, openChat } = event.detail;
      if (application) {
        setSelectedApp(application);
        setIsModalOpen(true);
        setIsChatOpen(openChat === true);
      }
    };

    window.addEventListener('openApplicationChat', handleOpenChat as EventListener);

    return () => {
      window.removeEventListener('openApplicationChat', handleOpenChat as EventListener);
    };
  }, []);

  // Добавляем функцию для запроса разрешения на уведомления
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Инициализируем звук при монтировании компонента
  useEffect(() => {
              const audio = new Audio('/sounds/notification.mp3');
              audio.volume = 0.5;
    setNotificationSound(audio);
  }, []);

  // Отдельный эффект для управления WebSocket соединением и переподключением
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !isComponentMounted.current) return;

    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 5000;

    const connectWebSocket = () => {
      if (!isComponentMounted.current) return;

      try {
        console.log(`Attempting to connect to WebSocket at ${config.wsUrl}${config.endpoints.ws}`);
        const newWs = new WebSocket(`${config.wsUrl}${config.endpoints.ws}?token=${token}`);

        newWs.onopen = () => {
          if (!isComponentMounted.current) {
            newWs.close();
            return;
          }
          console.log('WebSocket connection established');
          setWs(newWs);
          reconnectAttempts = 0;
        };

        newWs.onclose = (event) => {
          if (!isComponentMounted.current) return;
          
          console.log(`WebSocket connection closed: code=${event.code}, reason="${event.reason}"`);
          setWs(null);

          if (reconnectAttempts < maxReconnectAttempts) {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts}) in ${reconnectDelay}ms...`);
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, reconnectDelay);
          } else {
            console.log('Max reconnection attempts reached');
          }
        };

        newWs.onerror = (error) => {
          if (!isComponentMounted.current) return;
          console.error('WebSocket error:', error);
          // Не закрываем соединение здесь, onclose будет вызван автоматически
        };

        // Добавляем обработчик первоначального сообщения для диагностики
        newWs.onmessage = (event) => {
          try {
            console.log('WebSocket raw data received:', event.data);
            const data = JSON.parse(event.data);
            console.log('WebSocket initial message:', data);
            
            // Проверяем сообщения об ошибках от сервера
            if (data.error) {
              console.error('WebSocket server error:', data.error);
              newWs.close(1000, 'Error from server: ' + data.error);
              return;
            }
            
            // Подтверждение подключения
            if (data.status === 'connected') {
              console.log(`WebSocket authenticated as user: ${data.user}`);
            }
            
            // После получения первого сообщения, удаляем этот обработчик,
            // чтобы позволить другим обработчикам работать
            newWs.onmessage = null;
          } catch (error) {
            console.error('Error parsing initial WebSocket message:', error, 'Raw data:', event.data);
          }
        };

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, reconnectDelay);
        }
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Отдельный эффект для подписки на сообщения
  useEffect(() => {
    if (selectedApp && ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'subscribe',
          application_id: selectedApp.id
        }));
      } catch (error) {
        console.error('Ошибка при отправке подписки:', error);
      }
    }
  }, [selectedApp?.id, ws?.readyState]);

  // Оптимизируем эффект для чтения сообщений
  useEffect(() => {
    if (selectedApp) {
      const loadMessages = async () => {
        const msgs = await fetchMessages(selectedApp.id);
        setMessages(prev => {
          // Проверяем, изменились ли сообщения
          if (JSON.stringify(prev) === JSON.stringify(msgs)) {
            return prev;
          }
          return msgs;
        });
        
        setApplications(prev => {
          const appExists = prev.some(app => app.id === selectedApp.id);
          if (!appExists) return prev;
          
          return prev.map(app => {
        if (app.id === selectedApp.id) {
          return { ...app, hasUnreadMessages: false };
        }
        return app;
          });
        });
      };
      
      loadMessages();
    }
  }, [selectedApp?.id]);

  // Отдельный эффект для обработки WebSocket сообщений
  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!isComponentMounted.current) return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message' && data.message.sender === 'candidate') {
          // Проверяем, не обработали ли мы уже это сообщение
          const messageKey = `${data.application_id}-${data.message.id}-${Date.now()}`;
          if (processedMessages.current.has(messageKey)) {
            return;
          }
          processedMessages.current.add(messageKey);

          // Очищаем старые ключи (оставляем только последние 100)
          if (processedMessages.current.size > 100) {
            const entries = Array.from(processedMessages.current);
            entries.slice(0, entries.length - 100).forEach(key => {
              processedMessages.current.delete(key);
            });
          }

          let application = applications.find(app => app.id === data.application_id);
          
          if (!application) {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${config.apiUrl}/applications/${data.application_id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (response.ok) {
                const fetchedApplication = await response.json();
                if (fetchedApplication) {
                  setApplications(prev => [fetchedApplication, ...prev.filter(app => app.id !== fetchedApplication.id)]);
                  application = fetchedApplication;
                }
              }
            } catch (error) {
              console.error('Error fetching application:', error);
              return;
            }
          }

          if (application && (!isChatOpen || selectedApp?.id !== data.application_id)) {
            // Звуковое уведомление
            if (notificationSound && document.hasFocus()) {
              const playPromise = notificationSound.play();
              if (playPromise) {
                playPromise.catch(() => {});
              }
            }

            // Обновляем индикатор непрочитанных сообщений
            setApplications(prev =>
              prev.map(app =>
                app.id === data.application_id
                  ? { ...app, hasUnreadMessages: true }
                  : app
              )
            );
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, applications, isChatOpen, selectedApp?.id, notificationSound]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedApp) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}${config.endpoints.messages(selectedApp.id)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newMessage }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const message = await response.json();
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${config.apiUrl}${config.endpoints.applications}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(Array.isArray(data) ? data.filter(app => app.status !== 'удален') : []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'новый': 'bg-blue-600 hover:bg-blue-700',
      'на рассмотрении': 'bg-amber-500 hover:bg-amber-600',
      'телефонное интервью': 'bg-orange-500 hover:bg-orange-600',
      'собеседование': 'bg-violet-600 hover:bg-violet-700',
      'служба безопасности': 'bg-teal-600 hover:bg-teal-700',
      'оффер': 'bg-pink-600 hover:bg-pink-700',
      'сбор документов': 'bg-indigo-600 hover:bg-indigo-700',
      'принят на работу': 'bg-green-600 hover:bg-green-700',
      'резерв': 'bg-slate-600 hover:bg-slate-700',
      'отказ': 'bg-red-600 hover:bg-red-700',
      'удален': 'bg-gray-600 hover:bg-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-slate-600';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleRowClick = (application: Application) => {
    setSelectedApp(application);
    setIsModalOpen(true);
    setIsChatOpen(false);
  };

  const getIconColor = (type: string) => {
    const colors = {
      user: 'text-violet-400',
      briefcase: 'text-blue-400',
      education: 'text-green-400',
      globe: 'text-cyan-400',
      location: 'text-pink-400',
      phone: 'text-yellow-400',
      chat: 'text-orange-400',
      language: 'text-indigo-400',
    };
    return colors[type as keyof typeof colors] || 'text-gray-400';
  };

  const openTelegramChat = (username: string) => {
    window.open(`https://t.me/${username.replace('@', '')}`, '_blank');
  };

  const fetchMessages = async (applicationId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}${config.endpoints.messages(applicationId)}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const handleResumeView = async (application: Application) => {
    if (application.resume_file_path) {
      try {
        const token = localStorage.getItem('token');
        window.open(`${config.apiUrl}/resumes/${application.resume_file_path}`, '_blank');
      } catch (error) {
        console.error('Error opening resume:', error);
      }
    }
  };

  const ApplicationDialog = ({ application, onClose }: { application: Application, onClose: () => void }) => {
    // Состояния для управления модальными окнами и формой
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isExperienceOpen, setIsExperienceOpen] = useState(false);
    const [isResumeOpen, setIsResumeOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [localStatusComment, setLocalStatusComment] = useState('');

    const handleClose = () => {
      setIsModalOpen(false);
      onClose();
    };

    const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
        const response: Response = await fetch(`${config.apiUrl}/applications/${application.id}`, {
          method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete application');
        }
        
        setIsModalOpen(false);
        onClose();
        await fetchApplications();
      } catch (error: unknown) {
        console.error('Error deleting application:', error);
      }
    };

    const statusColors = {
      'Новый': 'bg-blue-600 hover:bg-blue-700 text-white',
      'На рассмотрении': 'bg-amber-500 hover:bg-amber-600 text-white',
      'Телефонное интервью': 'bg-orange-500 hover:bg-orange-600 text-white',
      'Собеседование': 'bg-violet-600 hover:bg-violet-700 text-white',
      'Служба безопасности': 'bg-teal-600 hover:bg-teal-700 text-white',
      'Оффер': 'bg-pink-600 hover:bg-pink-700 text-white',
      'Сбор документов': 'bg-indigo-600 hover:bg-indigo-700 text-white',
      'Принят на работу': 'bg-green-600 hover:bg-green-700 text-white',
      'Резерв': 'bg-slate-600 hover:bg-slate-700 text-white',
      'Отказ': 'bg-red-600 hover:bg-red-700 text-white'
    };

    const handleLocalStatusChange = async (status: string) => {
    try {
      const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/applications/${application.id}/status`, {
          method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            status,
            comment: localStatusComment,
            created_by: localStorage.getItem('user_name') || 'HR Manager'
          }),
        });

        if (!response.ok) throw new Error('Failed to update status');

        const updatedAppResponse = await fetch(`${config.apiUrl}/applications/${application.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!updatedAppResponse.ok) throw new Error('Failed to fetch updated application');
        
        const updatedApp = await updatedAppResponse.json();
        
        // Обновляем состояние без перезагрузки всего списка
        setApplications(prev => 
          prev.map(app => app.id === updatedApp.id ? updatedApp : app)
        );
        
        setSelectedApp(updatedApp);
        setLocalStatusComment('');
        setSelectedStatus('');
        setIsStatusOpen(false);
    } catch (error) {
        console.error('Error updating status:', error);
      }
    };

    return (
      <>
      <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="bg-[#0a1929] border-0 text-white max-w-5xl">
            <DialogTitle className="sr-only">
              Информация о кандидате
            </DialogTitle>
            <DialogDescription className="sr-only">
              Детальная информация о кандидате и его заявке
              </DialogDescription>
            <div className="transition-all duration-300 ease-in-out">
              <DialogHeader>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl">Информация о кандидате</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                      className="bg-[#3b5998] hover:bg-[#4c70ba] text-white transition-colors duration-200"
                  onClick={() => setIsChatOpen(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Открыть чат
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                        className="bg-transparent border border-gray-700 hover:bg-gray-800 transition-colors duration-200"
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                  >
                        {application.status === 'офер' ? 'Офер' : application.status}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                      <Transition
                        show={isStatusOpen}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                    <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-[#1a1b1e] border border-gray-700 z-50">
                      <div className="p-3">
                        <div className="mb-3">
                          <Input
                            placeholder="Добавить комментарий..."
                            value={localStatusComment}
                            onChange={(e) => setLocalStatusComment(e.target.value)}
                            className="bg-[#1e1f25] border-gray-700 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          {Object.entries(statusColors).map(([status, color]) => (
                            <button
                              key={status}
                              className={`${color} w-full text-left px-4 py-2 text-sm rounded ${
                                selectedStatus.toLowerCase() === status.toLowerCase() ? 'ring-2 ring-white' : ''
                              }`}
                              onClick={() => {
                                setSelectedStatus(status.toLowerCase());
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              if (selectedStatus) {
                                handleLocalStatusChange(selectedStatus);
                              }
                            }}
                            disabled={!selectedStatus}
                          >
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    </div>
                      </Transition>
                </div>
              </div>
            </div>
              </DialogHeader>

              <div className="grid grid-cols-[1fr,400px] gap-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Первая колонка */}
                  <div className="space-y-3">
                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <User className={getIconColor('user')} />
                  <div>
                    <div className="text-gray-400 text-sm">ФИО</div>
                    <div>{application.full_name}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Briefcase className={getIconColor('briefcase')} />
                  <div>
                    <div className="text-gray-400 text-sm">Специальность</div>
                    <div>{application.specialization}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <GraduationCap className={getIconColor('education')} />
                  <div>
                    <div className="text-gray-400 text-sm">Образование</div>
                    <div>{application.education}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Globe className={getIconColor('globe')} />
                  <div>
                    <div className="text-gray-400 text-sm">Гражданство</div>
                    <div>{application.citizenship}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Phone className={getIconColor('phone')} />
                  <div>
                    <div className="text-gray-400 text-sm">Телефон</div>
                    <div>{application.phone}</div>
                        </div>
                      </div>
                  </div>
                </div>

                  {/* Вторая колонка */}
                  <div className="space-y-3">
                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Languages className={getIconColor('language')} />
                  <div>
                    <div className="text-gray-400 text-sm">Язык</div>
                    <div>{application.languages}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <MessageCircle className={getIconColor('chat')} />
                  <div>
                    <div className="text-gray-400 text-sm">Telegram</div>
                    <div>{application.telegram}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <FileText className={getIconColor('briefcase')} />
                  <div>
                    <div className="text-gray-400 text-sm">Вакансия</div>
                    <div>{application.position}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Clock className={getIconColor('chat')} />
                  <div>
                    <div className="text-gray-400 text-sm">Источник</div>
                    <div>{application.source}</div>
                        </div>
                  </div>
                </div>

                    <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30">
                <div className="flex items-center gap-3">
                  <Briefcase className={getIconColor('briefcase')} />
                  <div>
                    <div className="text-gray-400 text-sm">Опыт работы</div>
                          <button 
                            className="cursor-pointer hover:text-[#3b5998] transition-colors"
                            onClick={() => setIsExperienceOpen(true)}
                    >
                      Нажмите, чтобы посмотреть
                          </button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Правая колонка с историей статусов */}
                <div className="border-l border-[#1e3a5f] pl-6 flex flex-col">
                  <div className="bg-[#0d1829] p-4 rounded-lg border border-[#1e3a5f]/30 mb-4">
                    <h3 className="text-lg text-white">История статусов</h3>
                  </div>
                  <div className="space-y-0 overflow-y-auto pr-4 custom-scrollbar h-[600px]">
                    <style jsx global>{`
                      .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-track {
                        background: #0a1929;
                        border-radius: 3px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: #1e88e5;
                        border-radius: 3px;
                        border: 2px solid #0a1929;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background-color: #2196f3;
                      }
                    `}</style>
                  {[...application.status_history].reverse().map((history, index) => (
                      <div key={index} className="relative pl-6 pb-6">
                        {/* Вертикальная линия */}
                        <div 
                          className="absolute left-[3px] top-0 bottom-0 w-[2px]"
                          style={{
                            background: '#3B82F6',
                            opacity: 0.5
                          }}
                        />
                        
                        {/* Точка */}
                        <div 
                          className="absolute left-0 top-2 w-[8px] h-[8px] rounded-full bg-blue-500 ring-[3px] ring-[#1a1b1e] z-10"
                        />
                        
                        {/* Контент */}
                        <div className="ml-4">
                          <div className={`${getStatusColor(history.status)} inline-block rounded px-2 py-1 text-white text-sm`}>
                        {history.status}
                      </div>
                          <div className="text-gray-400 text-xs mt-2">{formatDate(history.created_at)}</div>
                      {history.comment && (
                            <div className="text-sm mt-2 text-gray-300">{history.comment}</div>
                      )}
                          <div className="text-xs mt-2 text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {history.created_by || 'Система'}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
                <div className="flex gap-2">
              <Button 
                variant="destructive" 
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
              >
                Удалить кандидата
              </Button>
                  {application.resume_file_path && (
                    <Button 
                      variant="outline" 
                      className="bg-[#3b5998] hover:bg-[#4c70ba] text-white"
                      onClick={() => setIsResumeOpen(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Просмотреть резюме
                    </Button>
                  )}
                </div>
              <Button 
                onClick={handleClose}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Закрыть
              </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Диалог для опыта работы */}
        <Dialog open={isExperienceOpen} onOpenChange={setIsExperienceOpen}>
          <DialogContent className="bg-[#0a1929] border-0 text-white">
              <DialogTitle>Опыт работы</DialogTitle>
            <div className="mt-4">
              <p className="text-gray-300">{application.experience}</p>
              </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setIsExperienceOpen(false)}>
                Закрыть
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Диалог для просмотра резюме */}
        <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
          <DialogContent className="bg-[#0a1929] border-0 text-white max-w-4xl h-[80vh] flex flex-col">
            <DialogTitle>Резюме кандидата</DialogTitle>
            <div className="flex-1 overflow-hidden bg-[#1a1b1e] rounded-lg p-4 flex flex-col">
              <div className="flex-1 h-full w-full mb-4">
                {application.resume_file_path && (
                  <object
                    data={`${config.apiUrl}/resumes/${application.resume_file_path}`}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <p>Ваш браузер не поддерживает просмотр PDF. 
                      <a 
                        href={`${config.apiUrl}/resumes/${application.resume_file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400 ml-2"
                      >
                        Скачать PDF
                      </a>
                    </p>
                  </object>
                )}
              </div>
              <div className="flex justify-center">
              <Button 
                  variant="outline" 
                  className="bg-[#3b5998] hover:bg-[#4c70ba] text-white flex items-center gap-2 transition-all duration-200 transform hover:scale-105 px-6"
                  onClick={() => {
                    setIsResumeOpen(false);
                    setIsModalOpen(true);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Вернуться к информации
              </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const handleNotificationClick = useCallback((application: Application) => {
    console.log('Notification clicked:', application);
    
    // Фокусируем окно
    window.focus();
    
    // Обновляем состояния
    setSelectedApp(application);
    setIsModalOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 fade-in">
        <div className="animated-background" />
        <div className="glass-card rounded-lg p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 fade-in">
        <div className="animated-background" />
        <div className="glass-card rounded-lg p-6">
          <div className="text-red-400">{error}</div>
          <Button onClick={fetchApplications} className="mt-4 bg-violet-600 hover:bg-violet-700">
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      <div className="animated-background" />
      
      <div className="glass-card rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2 text-white">Заявки кандидатов</h1>
        <p className="text-gray-300">Список всех заявок от кандидатов через Telegram бота</p>
      </div>

      <div className="rounded-lg border border-[#1e3a5f] bg-[#0d2137]/95">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#1e3a5f] hover:bg-[#0a1929]">
              <TableHead className="text-gray-300">Кандидат</TableHead>
              <TableHead className="text-gray-300">Специализация</TableHead>
              <TableHead className="text-gray-300">Контакты</TableHead>
              <TableHead className="text-gray-300">Статус</TableHead>
              <TableHead className="text-gray-300">Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-300 py-8">
                  Нет доступных заявок
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow 
                  key={app.id} 
                  className="border-b border-[#1e3a5f] cursor-pointer hover:bg-[#0a1929]"
                  onClick={() => handleRowClick(app)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-300" />
                      <div>
                        <div className="font-medium text-white">{app.full_name}</div>
                        <div className="text-sm text-gray-300">{app.city}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-300" />
                      <div>
                        <div className="font-medium text-white">{app.position}</div>
                        <div className="text-sm text-gray-300">{app.specialization}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-300" />
                      <div>
                        <div className="text-white">{app.phone}</div>
                        <div className="text-sm text-gray-300 flex items-center gap-2">
                          {app.telegram}
                          {app.hasUnreadMessages && (
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(app.status)} text-white font-medium px-3 py-1`}>
                      {app.status === 'новый' && 'Новый'}
                      {app.status === 'на рассмотрении' && 'На рассмотрении'}
                      {app.status === 'телефонное интервью' && 'Телефонное интервью'}
                      {app.status === 'собеседование' && 'Собеседование'}
                      {app.status === 'служба безопасности' && 'Служба безопасности'}
                      {app.status === 'оффер' && 'Оффер'}
                      {app.status === 'сбор документов' && 'Сбор документов'}
                      {app.status === 'принят на работу' && 'Принят на работу'}
                      {app.status === 'резерв' && 'Резерв'}
                      {app.status === 'отказ' && 'Отказ'}
                      {app.status === 'удален' && 'Удален'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4" />
                      {formatDate(app.created_at)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Модальное окно для отображения информации о кандидате */}
          {selectedApp && (
        <Dialog 
          open={isModalOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setIsModalOpen(false);
              setSelectedApp(null);
            }
          }}
        >
          {isChatOpen ? (
            <ChatDialog 
              application={selectedApp}
              onClose={() => setIsChatOpen(false)}
              ws={ws}
              setIsChatOpen={setIsChatOpen}
              fetchMessages={fetchMessages}
              formatDate={formatDate}
            />
          ) : (
            <ApplicationDialog 
              application={selectedApp}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedApp(null);
              }}
            />
          )}
      </Dialog>
      )}
    </div>
  );
} 