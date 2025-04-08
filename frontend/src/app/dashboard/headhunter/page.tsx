'use client';

import { useState } from 'react';
import { ArrowUpTrayIcon, DocumentIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { config } from '@/config';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportedResume {
  full_name: string;
  birth_date: string;
  phone: string;
  position: string;
  resume_file_path: string;
}

const STATUS_OPTIONS = [
  { value: "новый", label: "Новый" },
  { value: "на рассмотрении", label: "На рассмотрении" },
  { value: "собеседование", label: "Собеседование" },
  { value: "принят на работу", label: "Принят на работу" },
  { value: "резерв", label: "Резерв" },
  { value: "отказ", label: "Отказ" }
];

export default function HeadHunterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ImportedResume | null>(null);
  const [status, setStatus] = useState("новый");
  const [comment, setComment] = useState("");
  const [manualPosition, setManualPosition] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualFullName, setManualFullName] = useState("");
  const [manualSpecialty, setManualSpecialty] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualBirthDate, setManualBirthDate] = useState("");
  const [manualStatus, setManualStatus] = useState("новый");
  const [manualComment, setManualComment] = useState("");
  const [manualResumeFile, setManualResumeFile] = useState<File | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const router = useRouter();

  const handleManualSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Basic validation
    if (!manualFullName || !manualSpecialty || !manualStatus) {
      setManualError('Пожалуйста, заполните обязательные поля: ФИО, Специализация, Статус.');
      return;
    }
    setManualError(null);
    setManualLoading(true);

    console.log('Сохранение кандидата, добавленного вручную...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Ошибка аутентификации. Пожалуйста, войдите снова.');
      }

      const formData = new FormData();
      formData.append('full_name', manualFullName);
      formData.append('specialty', manualSpecialty);
      formData.append('phone', manualPhone || 'Не указано'); // Отправляем 'Не указано', если пусто
      formData.append('birth_date', manualBirthDate || 'Не указано'); // Отправляем 'Не указано', если пусто
      formData.append('status', manualStatus);
      formData.append('comment', manualComment || 'Добавлен вручную'); // Комментарий по умолчанию

      // Добавляем недостающие обязательные поля с дефолтными значениями
      formData.append('education', 'Не указано');
      formData.append('experience', 'Не указано');
      formData.append('languages', 'Не указано');
      formData.append('location', 'Не указано');
      formData.append('citizenship', 'Не указано');

      // Добавляем файл резюме, если он выбран
      if (manualResumeFile) {
        formData.append('resume', manualResumeFile);
      }

      const response = await fetch(`${config.apiUrl}/api/hh/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type не указываем для FormData, браузер сделает это сам
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка сервера' }));
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
      }

      // Успех
      setIsManualAddOpen(false); // Закрываем диалог
      // Очистка формы (опционально, но хорошо)
      setManualFullName('');
      setManualSpecialty('');
      setManualPhone('');
      setManualBirthDate('');
      setManualStatus('новый');
      setManualComment('');
      setManualResumeFile(null);
      // Перенаправляем на страницу кандидатов
      router.push('/dashboard/hh-candidates'); 
      // Можно добавить уведомление об успехе, если используется библиотека типа react-toastify
      // toast.success('Кандидат успешно добавлен!');

    } catch (error) {
        console.error('Ошибка при ручном сохранении кандидата:', error);
        setManualError(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
    } finally {
        setManualLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Проверяем формат файла
      const fileType = selectedFile.type;
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!validTypes.includes(fileType)) {
        setError('Пожалуйста, загрузите файл в формате PDF, DOC или DOCX');
        return;
      }
      
      setFile(selectedFile);
      setOriginalFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    try {
      if (!file) {
        setError('Пожалуйста, выберите файл резюме');
        return;
      }

      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('resume', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/hh/parse-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка при импорте резюме');
      }

      const data = await response.json();
      console.log('Импортированные данные из резюме:', data);
      setImportedData(data);
      setFile(null);
      // Очищаем input файла
      const fileInput = document.getElementById('resumeFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при импорте');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!importedData) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Create FormData object
      const formData = new FormData();
      formData.append('full_name', importedData.full_name);
      formData.append('birth_date', importedData.birth_date);
      formData.append('phone', importedData.phone);
      formData.append('specialty', importedData.position === 'Не указана' ? manualPosition : importedData.position);
      // Adding these required fields with default values since they're required by the API
      formData.append('education', 'Не указано');
      formData.append('experience', 'Не указано');
      formData.append('languages', 'Не указано');
      formData.append('location', 'Не указано');
      formData.append('citizenship', 'Не указано');
      // Add status and comment
      formData.append('status', status);
      formData.append('comment', comment);
      
      // Добавляем файл резюме, если он есть
      if (originalFile) {
        formData.append('resume', originalFile);
      }

      const response = await fetch(`${config.apiUrl}/api/hh/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header as browser will set it automatically with the boundary
        },
        body: formData
      });

      if (!response.ok) {
        // Проверяем статус ответа
        if (response.status === 400) {
          // Пытаемся получить детали ошибки из ответа
          try {
            const errorData = await response.json();
            // Если в ответе есть конкретное сообщение, используем его
            if (errorData && errorData.detail) {
              throw new Error(errorData.detail);
            } else {
              // Если нет конкретного сообщения, но статус 400, вероятно это дубликат
              throw new Error('Кандидат с такими данными уже существует в базе');
            }
          } catch (jsonError) {
            // Если не удалось распарсить JSON, используем общее сообщение о дубликате
            throw new Error('Кандидат с такими данными уже существует в базе');
          }
        } else {
          throw new Error('Ошибка при сохранении кандидата');
        }
      }

      // После успешного сохранения переходим к списку кандидатов
      router.push('/dashboard/hh-candidates');
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 fade-in">
      <div className="glass-card rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2 text-white">Импорт резюме</h1>
        <p className="text-gray-300">Загрузите файл резюме для извлечения данных</p>
      </div>

      <div className="bg-[#0d2137]/95 rounded-lg border border-[#1e3a5f] p-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors">
            <input
              type="file"
              id="resumeFile"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="resumeFile"
              className="flex flex-col items-center cursor-pointer"
            >
              <DocumentIcon className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-gray-300 mb-2">
                {file ? file.name : 'Выберите файл резюме'}
              </span>
              <span className="text-sm text-gray-500">
                Поддерживаемые форматы: PDF, DOC, DOCX
              </span>
            </label>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              {loading ? 'Импорт...' : 'Импортировать'}
            </button>

            <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
              <DialogTrigger asChild>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center disabled:opacity-50"
                >
                  <UserPlusIcon className="w-5 h-5 mr-2" />
                  Добавить вручную
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a1929] border border-[#1e3a5f] text-white sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Добавить кандидата вручную</DialogTitle>
                  <DialogDescription>
                    Введите информацию о кандидате. Поля, отмеченные *, обязательны.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="manualFullName" className="text-right">
                      ФИО*
                    </Label>
                    <Input
                      id="manualFullName"
                      value={manualFullName}
                      onChange={(e) => setManualFullName(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="manualSpecialty" className="text-right">
                      Специализация*
                    </Label>
                    <Input
                      id="manualSpecialty"
                      value={manualSpecialty}
                      onChange={(e) => setManualSpecialty(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="manualPhone" className="text-right">
                      Телефон
                    </Label>
                    <Input
                      id="manualPhone"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="manualBirthDate" className="text-right">
                        Дата рождения
                     </Label>
                     <Input
                        id="manualBirthDate"
                        type="date"
                        value={manualBirthDate}
                        onChange={(e) => setManualBirthDate(e.target.value)}
                        className="col-span-3 bg-gray-700 border-gray-600 text-white"
                     />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="manualStatus" className="text-right">
                        Статус*
                     </Label>
                      <Select value={manualStatus} onValueChange={setManualStatus} required>
                          <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0d2137] text-white border-[#1e3a5f]">
                              {STATUS_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="manualComment" className="text-right">
                        Комментарий
                     </Label>
                     <Textarea
                        id="manualComment"
                        value={manualComment}
                        onChange={(e) => setManualComment(e.target.value)}
                        className="col-span-3 bg-gray-700 border-gray-600 text-white"
                        rows={3}
                     />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="manualResumeFile" className="text-right">
                        Резюме (файл)
                     </Label>
                     <Input
                        id="manualResumeFile"
                        type="file"
                        onChange={(e) => setManualResumeFile(e.target.files ? e.target.files[0] : null)}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                     />
                     <div className="col-span-3 flex items-center gap-2">
                        <Button
                           type="button"
                           variant="outline"
                           className="text-white border-gray-600 hover:bg-gray-700 flex-shrink-0"
                           onClick={() => document.getElementById('manualResumeFile')?.click()}
                        >
                           Выберите файл
                        </Button>
                        <span className="text-sm text-gray-400 truncate" title={manualResumeFile?.name}>
                           {manualResumeFile ? manualResumeFile.name : 'Файл не выбран'}
                        </span>
                     </div>
                  </div>
                  {manualError && <p className="col-span-4 text-red-500 text-sm">{manualError}</p>}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button variant="outline" className="text-white border-gray-600 hover:bg-gray-700">Отмена</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleManualSave} disabled={manualLoading} className="bg-blue-600 hover:bg-blue-700">
                    {manualLoading ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium">{error}</p>
                  {error === 'Кандидат с такими данными уже существует в базе' && (
                    <>
                      <p className="mt-1 text-sm">Вы можете проверить существующего кандидата в списке или изменить данные.</p>
                      <button 
                        onClick={() => router.push('/dashboard/hh-candidates')}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded flex items-center gap-1.5"
                      >
                        <span>Перейти к списку кандидатов</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {importedData && (
            <div className="bg-[#0F172A] rounded-lg p-6 border border-[#1e3a5f] mt-6">
              <h2 className="text-xl font-semibold text-blue-300 mb-4">Импортированные данные</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">ФИО:</span>
                  <span className="ml-2 text-white">{importedData.full_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Должность:</span>
                  {importedData.position === 'Не указана' ? (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Введите должность"
                        value={manualPosition}
                        onChange={(e) => {
                          const value = e.target.value;
                          setManualPosition(value);
                        }}
                        onBlur={(e) => {
                          if (importedData) {
                            setImportedData({
                              ...importedData,
                              position: e.target.value || 'Не указана'
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-yellow-500 text-sm mt-1">
                        Должность не найдена в резюме. Пожалуйста, введите её вручную.
                      </p>
                    </div>
                  ) : (
                    <span className="ml-2 text-white">{importedData.position}</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400">Дата рождения:</span>
                  <span className="ml-2 text-white">{importedData.birth_date}</span>
                </div>
                <div>
                  <span className="text-gray-400">Телефон:</span>
                  <span className="ml-2 text-white">{importedData.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400">Файл резюме:</span>
                  <span className="ml-2 text-white">
                    {importedData.resume_file_path ? 'Прикреплено' : 'Не прикреплено'}
                  </span>
                </div>

                <div className="pt-4 space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Статус</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Комментарий</label>
                    <Textarea
                      value={comment}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                      placeholder="Введите комментарий"
                      className="min-h-[100px]"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={loading || importedData.position === 'Не указана' || !importedData.position}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                    {loading ? 'Сохранение...' : 'Сохранить кандидата'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 