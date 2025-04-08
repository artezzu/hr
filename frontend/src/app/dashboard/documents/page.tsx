'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Card, 
  Input, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui';
import { 
  FileIcon, 
  FolderIcon, 
  FolderPlusIcon, 
  UploadIcon, 
  ArrowLeftIcon, 
  TrashIcon, 
  ShareIcon,
  DownloadIcon,
  PencilIcon
} from 'lucide-react';
import { config } from '@/config';

interface Document {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  folder_id: number | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: number | null, name: string}[]>([{ id: null, name: 'Корневая папка' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<{id: number, type: 'folder' | 'document', name: string} | null>(null);
  const [newItemName, setNewItemName] = useState('');
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchFoldersAndDocuments();
  }, [currentFolder]);

  const fetchFoldersAndDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch folders
      const foldersResponse = await fetch(`${config.apiUrl}/folders/?${currentFolder !== null ? `parent_id=${currentFolder}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (foldersResponse.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (!foldersResponse.ok) {
        throw new Error('Failed to fetch folders');
      }

      const foldersData = await foldersResponse.json();
      setFolders(Array.isArray(foldersData) ? foldersData : []);

      // Fetch documents
      const documentsResponse = await fetch(`${config.apiUrl}/documents/?${currentFolder !== null ? `folder_id=${currentFolder}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!documentsResponse.ok) {
        throw new Error('Failed to fetch documents');
      }

      const documentsData = await documentsResponse.json();
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load folders and documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolder(folder.id);
    setFolderHistory([...folderHistory, { id: folder.id, name: folder.name }]);
  };

  const handleGoBack = () => {
    if (folderHistory.length > 1) {
      const newHistory = [...folderHistory];
      newHistory.pop();
      const prevFolder = newHistory[newHistory.length - 1];
      setCurrentFolder(prevFolder.id);
      setFolderHistory(newHistory);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/folders/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolder,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create folder');
      }
      
      setNewFolderName('');
      setIsNewFolderDialogOpen(false);
      fetchFoldersAndDocuments();
    } catch (error) {
      console.error('Error creating folder:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleDeleteItem = async (id: number, type: 'folder' | 'document') => {
    if (!confirm(`Вы уверены, что хотите удалить этот ${type === 'folder' ? 'каталог' : 'файл'}?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      let url = `${config.apiUrl}/${type === 'folder' ? 'folders' : 'documents'}/${id}`;
      
      // Если удаляем папку, добавляем параметр recursive=true
      if (type === 'folder') {
        url += '?recursive=true';
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to delete ${type}`);
      }
      
      fetchFoldersAndDocuments();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleRenameItem = async () => {
    if (!itemToRename || !newItemName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const url = `${config.apiUrl}/${itemToRename.type === 'folder' ? 'folders' : 'documents'}/${itemToRename.id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newItemName,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to rename ${itemToRename.type}`);
      }
      
      setIsRenameDialogOpen(false);
      setItemToRename(null);
      setNewItemName('');
      fetchFoldersAndDocuments();
    } catch (error) {
      console.error('Error renaming item:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUploadFile = async () => {
    if (!fileToUpload) return;
    
    try {
      setIsUploading(true);
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      if (currentFolder !== null) {
        formData.append('folder_id', currentFolder.toString());
      }
      
      const response = await fetch(`${config.apiUrl}/documents/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload file');
      }
      
      setFileToUpload(null);
      // Очищаем поле загрузки файла
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      fetchFoldersAndDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = async (documentId: number, documentName: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Создаем ссылку для скачивания
      const downloadUrl = `${config.apiUrl}/documents/${documentId}/download`;
      
      // Создаем временный элемент <a> для скачивания
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = documentName;
      a.target = '_blank';
      
      // Добавляем заголовок авторизации
      fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          a.href = url;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      
    } catch (error) {
      console.error('Error downloading file:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBreadcrumbs = () => {
    return (
      <div className="flex items-center space-x-2 mb-4">
        {folderHistory.map((folder, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}
            <button
              onClick={() => {
                const newHistory = folderHistory.slice(0, index + 1);
                setFolderHistory(newHistory);
                setCurrentFolder(folder.id);
              }}
              className="text-blue-500 hover:underline"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Документы</h1>
      
      {getBreadcrumbs()}
      
      <div className="flex space-x-4 mb-6">
        {folderHistory.length > 1 && (
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
        )}
        
        <Button onClick={() => setIsNewFolderDialogOpen(true)}>
          <FolderPlusIcon className="w-4 h-4 mr-2" />
          Новая папка
        </Button>
        
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <Button variant="outline" disabled={isUploading}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Выбрать файл
          </Button>
        </div>
        
        {fileToUpload && (
          <Button onClick={handleUploadFile} disabled={isUploading}>
            {isUploading ? 'Загрузка...' : 'Загрузить'}
          </Button>
        )}
      </div>
      
      {fileToUpload && (
        <div className="mb-4 p-2 bg-slate-700 rounded border border-slate-600 text-white">
          <p>Выбран файл: {fileToUpload.name} ({formatFileSize(fileToUpload.size)})</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Размер</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.length === 0 && documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-white bg-slate-800">
                    Эта папка пуста
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {folders.map((folder) => (
                    <TableRow key={`folder-${folder.id}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <FolderIcon className="w-5 h-5 mr-2 text-yellow-500" />
                          <button 
                            className="hover:underline"
                            onClick={() => handleFolderClick(folder)}
                          >
                            {folder.name}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>Папка</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{new Date(folder.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setItemToRename({
                                id: folder.id,
                                type: 'folder',
                                name: folder.name
                              });
                              setNewItemName(folder.name);
                              setIsRenameDialogOpen(true);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(folder.id, 'folder')}
                          >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.map((document) => (
                    <TableRow key={`document-${document.id}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <FileIcon className="w-5 h-5 mr-2 text-blue-500" />
                          <span>{document.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{document.file_type}</TableCell>
                      <TableCell>{formatFileSize(document.file_size)}</TableCell>
                      <TableCell>{new Date(document.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadFile(document.id, document.name)}
                          >
                            <DownloadIcon className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setItemToRename({
                                id: document.id,
                                type: 'document',
                                name: document.name
                              });
                              setNewItemName(document.name);
                              setIsRenameDialogOpen(true);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(document.id, 'document')}
                          >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {/* Dialog for creating a new folder */}
      {isNewFolderDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-600 p-6 rounded-lg shadow-lg w-full max-w-md text-white">
            <h2 className="text-xl font-bold mb-4">Создать новую папку</h2>
            <Input
              type="text"
              placeholder="Имя папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewFolderDialogOpen(false);
                  setNewFolderName('');
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleCreateFolder}>Создать</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dialog for renaming an item */}
      {isRenameDialogOpen && itemToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-600 p-6 rounded-lg shadow-lg w-full max-w-md text-white">
            <h2 className="text-xl font-bold mb-4">Переименовать {itemToRename.type === 'folder' ? 'папку' : 'файл'}</h2>
            <Input
              type="text"
              placeholder="Новое имя"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false);
                  setItemToRename(null);
                  setNewItemName('');
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleRenameItem}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 