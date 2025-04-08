'use client';

import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { config } from '@/config';
import { Textarea } from "@/components/ui/textarea";
import * as aiService from '@/services/aiService';
import { IO_INTELLIGENCE_API_KEY } from '@/utils/envConfig';

// Типы для работы с чатом
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Типы для моделей ИИ
interface AIModel {
  id: string;
  name: string;
}

export default function AIChatPage() {
  // Модели по умолчанию
  const defaultModels = [
    { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B' },
    { id: 'meta-llama/Llama-3.2-90B-Vision-Instruct', name: 'Llama 3.2 90B Vision' },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
    { id: 'mistralai/Mistral-Large-Instruct-2411', name: 'Mistral Large' },
    { id: 'Qwen/QwQ-32B', name: 'Qwen QwQ 32B' }
  ];

  // Состояния для чата
  const [messages, setMessages] = useState<aiService.Message[]>([
    { role: 'system', content: 'Вы общаетесь с ИИ-ассистентом. Чем я могу помочь?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>('meta-llama/Llama-3.3-70B-Instruct');
  const [availableModels, setAvailableModels] = useState<aiService.AIModel[]>(defaultModels);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  // Референс для автоскролла чата и input файла
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Эффект для прокрутки к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Функция для получения списка доступных моделей
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const models = await aiService.getAIModels();
      
      // Убедимся, что список моделей не пустой
      if (models && models.length > 0) {
        setAvailableModels(models);
      } else {
        // Если список пустой, используем модели по умолчанию
        setAvailableModels(defaultModels);
      }
      
      setIsInitialLoad(false);
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке моделей:', error);
      setError('Не удалось загрузить список моделей. Используются модели по умолчанию.');
      
      // При ошибке тоже устанавливаем модели по умолчанию
      setAvailableModels(defaultModels);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Загрузка моделей при монтировании компонента
  useEffect(() => {
    setModel('meta-llama/Llama-3.3-70B-Instruct');
    setAvailableModels(defaultModels);
    fetchModels();
  }, []);
  
  // Обработчик отправки сообщения
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !imageFile) return;
    
    // Проверяем есть ли активный API ключ
    const hasApiAccess = !!IO_INTELLIGENCE_API_KEY;
    
    // Если нет ключа API, показываем имитацию
    if (!hasApiAccess) {
      // Создаем сообщение пользователя
      let userMessage: aiService.Message;
      
      if (imageFile) {
        // Если есть изображение, создаем предварительный вид с текстом и изображением
        setImagePreview(URL.createObjectURL(imageFile));
        userMessage = { 
          role: 'user', 
          content: `${inputMessage}\n[Прикреплено изображение: ${imageFile.name}]`
        };
      } else {
        userMessage = { role: 'user', content: inputMessage };
      }
      
      // Добавляем сообщение пользователя
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInputMessage('');
      setImageFile(null);
      setImagePreview(null);
      setIsLoading(true);
      
      // Имитация ответа с задержкой
      setTimeout(() => {
        const assistantMessage: aiService.Message = { 
          role: 'assistant', 
          content: `Это имитация ответа от ИИ на ваш запрос: "${inputMessage}" 
          
Когда API ключ будет настроен в NEXT_PUBLIC_IO_INTELLIGENCE_API_KEY, здесь будет реальный ответ от выбранной модели (${model}).` 
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        setIsLoading(false);
      }, 1000);
      
      return;
    }
    
    // Создаем сообщение пользователя
    let userMessage: aiService.Message;
    
    try {
      if (imageFile) {
        // Если есть изображение и выбрана модель с поддержкой изображений
        if (model.includes('Vision')) {
          userMessage = await aiService.createMessageWithImage(inputMessage, imageFile);
        } else {
          // Если модель не поддерживает изображения, показываем ошибку
          setError(`Модель ${model} не поддерживает анализ изображений. Пожалуйста, выберите модель с Vision в названии.`);
          return;
        }
      } else {
        userMessage = { role: 'user', content: inputMessage };
      }
      
      // Добавляем сообщение пользователя (для отображения в UI)
      const displayUserMessage: aiService.Message = { 
        role: 'user', 
        content: imageFile 
          ? `${inputMessage}\n[Прикреплено изображение: ${imageFile.name}]`
          : inputMessage
      };
      setMessages(prevMessages => [...prevMessages, displayUserMessage]);
      
      // Очищаем поля ввода
      setInputMessage('');
      setImageFile(null);
      setImagePreview(null);
      setIsLoading(true);
      setError(null);
      
      // Отправляем запрос к API
      const chatMessages = [...messages.filter(m => m.role !== 'system'), userMessage];
      const response = await aiService.sendChatMessage(model, chatMessages);
      
      // Получаем ответ от API
      const assistantMessage: aiService.Message = { 
        role: 'assistant', 
        content: response.choices[0].message.content 
      };
      
      // Добавляем ответ ассистента в историю
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      
    } catch (error) {
      console.error('Ошибка при получении ответа:', error);
      setError('Не удалось получить ответ от ИИ. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Обработчик нажатия Enter для отправки сообщения
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Функция для загрузки изображения
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };
  
  // Обработчик выбора файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем, что файл - изображение
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите файл изображения (JPEG, PNG, WEBP или GIF)');
        return;
      }
      
      // Проверяем размер файла (не более 20 МБ)
      if (file.size > 20 * 1024 * 1024) {
        setError('Размер изображения не должен превышать 20 МБ');
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };
  
  // Функция для удаления выбранного изображения
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Функция для переключения селектора моделей
  const toggleModelSelector = () => {
    setIsModelSelectorOpen(!isModelSelectorOpen);
  };

  // Функция для выбора модели
  const selectModel = (modelId: string) => {
    setModel(modelId);
    setIsModelSelectorOpen(false);
  };
  
  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col bg-[#0d1525] text-gray-200 overflow-hidden">
      {/* Центральная область чата - с адаптивным расположением */}
      <div className="flex-grow relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto no-scrollbar px-4 md:pl-8">
          <div className="max-w-3xl mx-auto pt-10 pb-16">
            {messages.length <= 1 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-400px)]">
                <div className="text-lg text-center text-gray-400">
                  <span className="text-blue-500 mr-2">●</span>
                  Напишите ваше сообщение
                </div>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role !== 'system').map((message, index) => (
                  <div 
                    key={index} 
                    className="mb-4"
                  >
                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                      {message.role === 'user' ? (
                        <span>Вы</span>
                      ) : (
                        <><span className="mr-1.5 text-blue-500">●</span>Ассистент</>
                      )}
                    </div>
                    <div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{
                        typeof message.content === 'string' 
                          ? message.content 
                          : 'Содержимое сообщения не может быть отображено'
                      }</p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                      <span className="mr-1.5 text-blue-500">●</span>Ассистент
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="mb-3 text-red-400 text-xs">
                    <p>{error}</p>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-8"></div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Нижняя панель ввода - компактная и адаптивная */}
      <div className="bg-[#0d1525] border-t border-[#1e3a5f] w-full py-1.5">
        <div className="max-w-3xl mx-auto px-4 md:pl-8 relative">
          {isModelSelectorOpen && (
            <div className="absolute bottom-full mb-1 left-4 bg-[#0F172A] border border-[#1e3a5f] rounded-md shadow-lg py-1 z-20 max-h-[200px] w-[280px] overflow-y-auto">
              {availableModels.map((m) => (
                <button
                  key={m.id}
                  className={`block w-full text-left px-3 py-1 text-xs ${m.id === model ? 'bg-blue-900/30' : ''} hover:bg-[#1e3a5f]`}
                  onClick={() => selectModel(m.id)}
                >
                  {m.name || m.id}
                </button>
              ))}
              <div className="border-t border-[#1e3a5f] mt-1 pt-1">
                <button 
                  onClick={fetchModels}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-1 text-xs text-gray-400 hover:bg-[#1e3a5f] flex items-center gap-2"
                >
                  <ArrowPathIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Обновить список моделей
                </button>
              </div>
            </div>
          )}
          
          {imagePreview && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10">
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-14 rounded-md border border-[#1e3a5f]"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5"
                  title="Удалить изображение"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          {/* Счетчик токенов с компактным видом */}
          <div className="flex items-center justify-center mb-1 text-xs text-gray-500">
            <span>Каждое сообщение использует токены, которые обновляются ежедневно</span>
          </div>
          
          <div className="bg-[#0F172A] border border-[#1e3a5f] rounded-md overflow-hidden">
            <Textarea 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите ваше сообщение..."
              className="min-h-[36px] max-h-20 bg-transparent border-0 focus-visible:ring-0 resize-none flex-grow text-gray-200 text-sm py-1.5 px-3 w-full"
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between bg-[#0F172A] px-3 py-1 border-t border-[#1e3a5f]">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button 
                  onClick={handleImageUpload}
                  className="p-1 text-gray-400 hover:text-gray-200"
                  title="Загрузить изображение"
                  disabled={isLoading}
                >
                  <PhotoIcon className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={toggleModelSelector}
                  className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                  title="Сменить модель"
                >
                  <span className="truncate max-w-[120px]">
                    {model.split('/').pop() || 'Модель'}
                  </span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                
                {model.includes('Vision') && 
                  <span className="hidden sm:inline-block text-xs text-gray-500">• Поддерживает изображения</span>
                }
              </div>
              
              <button 
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !imageFile)}
                className={`rounded-full p-1.5 ${(!inputMessage.trim() && !imageFile) ? 'text-gray-600 bg-[#0F172A]' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Стили для скрытия полосы прокрутки и адаптивности */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        html, body {
          overflow: hidden;
        }
        body {
          padding: 0;
          margin: 0;
        }
      `}</style>
    </div>
  );
} 