import axios from 'axios';

// Типы данных для API
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  position: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string | null;
  status: string;
  assigned_to: number | null;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Vacancy {
  id: number;
  title: string;
  requirements: string | null;
  conditions: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
}

// Базовый URL API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Получение токена из localStorage
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Заголовки авторизации
export const getAuthHeaders = () => {
  const token = getToken();
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// API для работы с пользователями
export const usersApi = {
  // Получение списка всех пользователей
  getAll: async (): Promise<User[]> => {
    try {
      const response = await axios.get<User[]>(`${API_URL}/users/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка пользователей:', error);
      return [];
    }
  },

  // Получение текущего пользователя
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await axios.get<User>(`${API_URL}/users/me/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении текущего пользователя:', error);
      return null;
    }
  },
};

// API для работы с задачами
export const tasksApi = {
  // Получение всех задач
  getAll: async (): Promise<Task[]> => {
    try {
      const response = await axios.get<Task[]>(`${API_URL}/tasks/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка задач:', error);
      return [];
    }
  },

  // Получение задач по статусу
  getByStatus: async (status: string): Promise<Task[]> => {
    try {
      const response = await axios.get<Task[]>(`${API_URL}/tasks/?status=${status}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении задач со статусом ${status}:`, error);
      return [];
    }
  },

  // Получение задач на определенную дату
  getByDate: async (date: string): Promise<Task[]> => {
    try {
      const response = await axios.get<Task[]>(`${API_URL}/tasks/?date=${date}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении задач на дату ${date}:`, error);
      return [];
    }
  },

  // Получение задач назначенных на пользователя
  getByAssignee: async (userId: number): Promise<Task[]> => {
    try {
      const response = await axios.get<Task[]>(`${API_URL}/tasks/?assigned_to=${userId}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении задач пользователя ${userId}:`, error);
      return [];
    }
  },
};

// API для работы с вакансиями
export const vacanciesApi = {
  // Получение всех вакансий
  getAll: async (): Promise<Vacancy[]> => {
    try {
      const response = await axios.get<Vacancy[]>(`${API_URL}/vacancies/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка вакансий:', error);
      return [];
    }
  },

  // Получение вакансий по статусу
  getByStatus: async (status: string): Promise<Vacancy[]> => {
    try {
      const response = await axios.get<Vacancy[]>(`${API_URL}/vacancies/?status=${status}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении вакансий со статусом ${status}:`, error);
      return [];
    }
  },
};

// Функция аутентификации
export const authenticate = async (email: string, password: string): Promise<string | null> => {
  interface TokenResponse {
    access_token: string;
    token_type: string;
  }
  
  try {
    const response = await axios.post<TokenResponse>(`${API_URL}/token`, new URLSearchParams({
      username: email,
      password: password,
    }));
    
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    console.error('Ошибка при аутентификации:', error);
    return null;
  }
};

// Проверка валидности токена
export const validateToken = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/users/me/`, getAuthHeaders());
    return !!response.data;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return false;
  }
}; 