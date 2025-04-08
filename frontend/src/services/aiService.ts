import { config } from '@/config';
import { IO_INTELLIGENCE_API_KEY, IO_INTELLIGENCE_URL } from '@/utils/envConfig';

export interface AIModel {
  id: string;
  name: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{type: string, text?: string, image?: string, image_url?: {url: string}}>;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIModelsResponse {
  object: string;
  data: AIModel[];
}

// Получение списка доступных моделей
export const getAIModels = async (): Promise<AIModel[]> => {
  console.log('getAIModels: Начинаю загрузку моделей...');
  
  // Набор моделей по умолчанию из API
  const defaultModels = [
    { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B' },
    { id: 'meta-llama/Llama-3.2-90B-Vision-Instruct', name: 'Llama 3.2 90B Vision' },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
    { id: 'mistralai/Mistral-Large-Instruct-2411', name: 'Mistral Large' },
    { id: 'Qwen/QwQ-32B', name: 'Qwen QwQ 32B' }
  ];
  
  console.log('getAIModels: Модели по умолчанию подготовлены:', defaultModels);

  try {
    const token = localStorage.getItem('token');
    console.log('Using IO Intelligence API URL:', IO_INTELLIGENCE_URL);
    console.log('API Key defined:', !!IO_INTELLIGENCE_API_KEY);
    console.log('API Key:', IO_INTELLIGENCE_API_KEY.substring(0, 15) + '...');
    
    // Проверяем, есть ли у нас ключ API
    if (!IO_INTELLIGENCE_API_KEY) {
      console.log('No API key available, using default models');
      return defaultModels;
    }
    
    console.log('getAIModels: Отправляю запрос на получение моделей...');
    const response = await fetch(`${IO_INTELLIGENCE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${IO_INTELLIGENCE_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('API Response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch AI models: ${response.status} ${response.statusText}`);
    }

    // Выводим ответ от API для отладки
    const rawResponse = await response.text();
    console.log('Raw API response:', rawResponse);
    
    try {
      // Преобразуем обратно в JSON
      const data = JSON.parse(rawResponse) as AIModelsResponse;
      
      // API возвращает данные в формате {object: 'list', data: [...]}
      console.log('getAIModels: Успешно получены модели из API:', data.data ? data.data.length : 0);
      
      if (data.data && data.data.length > 0) {
        return data.data;
      } else {
        console.log('getAIModels: API вернул пустой список, использую модели по умолчанию');
        return defaultModels;
      }
    } catch (jsonError) {
      console.error('getAIModels: Ошибка при разборе JSON:', jsonError);
      return defaultModels;
    }
  } catch (error) {
    console.error('Error fetching AI models:', error);
    // Всегда возвращаем набор моделей по умолчанию в случае ошибки
    return defaultModels;
  }
};

// Отправка запроса к чату
export const sendChatMessage = async (
  model: string,
  messages: Message[]
): Promise<ChatCompletionResponse> => {
  try {
    // Проверяем, есть ли у нас ключ API
    if (!IO_INTELLIGENCE_API_KEY) {
      console.log('No API key available, returning mock response');
      return createMockChatResponse(messages);
    }
    
    console.log('Sending request to:', `${IO_INTELLIGENCE_URL}/chat/completions`);
    console.log('With model:', model);
    console.log('Messages:', JSON.stringify(messages));
    
    const response = await fetch(`${IO_INTELLIGENCE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IO_INTELLIGENCE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Chat API Response not OK:', response.status, response.statusText);
      throw new Error(`Failed to get chat completion: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting chat completion:', error);
    // В случае ошибки возвращаем фиктивный ответ
    return createMockChatResponse(messages);
  }
};

// Функция для создания фиктивного ответа чата
const createMockChatResponse = (messages: Message[]): ChatCompletionResponse => {
  const lastUserMessage = messages.findLast(msg => msg.role === 'user');
  const userContent = typeof lastUserMessage?.content === 'string' 
    ? lastUserMessage.content 
    : 'Ваш запрос';
  
  return {
    id: 'mock-response-' + Date.now(),
    object: 'chat.completion',
    created: Date.now(),
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `Это имитация ответа от ИИ на ваш запрос: "${userContent}"\n\nДля получения реальных ответов необходимо настроить действующий API ключ NEXT_PUBLIC_IO_INTELLIGENCE_API_KEY.`
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
};

// Преобразование изображения в base64
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Удаляем префикс "data:image/jpeg;base64," из строки
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Создание сообщения с изображением
export const createMessageWithImage = async (
  textPrompt: string,
  imageFile: File
): Promise<Message> => {
  const base64Image = await convertImageToBase64(imageFile);
  return {
    role: 'user',
    content: [
      { type: 'text', text: textPrompt },
      { type: 'image', image: base64Image }
    ]
  };
};

// Создание сообщения с URL изображения
export const createMessageWithImageUrl = (
  textPrompt: string,
  imageUrl: string
): Message => {
  return {
    role: 'user',
    content: [
      { type: 'text', text: textPrompt },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  };
}; 