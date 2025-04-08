from datetime import date
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"
    position: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    position: Optional[str] = None

class User(UserBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    application_id: int
    sender: str
    created_at: datetime
    is_read: bool
    delivery_status: str = 'pending'

    class Config:
        from_attributes = True

class StatusHistoryBase(BaseModel):
    status: str
    comment: str
    created_by: str

class StatusHistoryCreate(StatusHistoryBase):
    application_id: int

class StatusHistory(StatusHistoryBase):
    id: int
    application_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    full_name: str
    birth_date: str
    position: str
    specialization: str
    education: str
    citizenship: str
    experience: str
    city: str
    phone: str
    telegram: str
    languages: str
    source: str
    telegram_chat_id: Optional[str] = None
    resume_file_path: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class Application(ApplicationBase):
    id: int
    status: str
    created_at: datetime
    status_history: List[StatusHistory] = []
    messages: List[Message] = []

    class Config:
        from_attributes = True

class StatusUpdate(BaseModel):
    status: str
    comment: str

class HHStatusHistoryBase(BaseModel):
    status: str
    comment: str
    created_by: str

class HHStatusHistoryCreate(HHStatusHistoryBase):
    pass

class HHStatusHistory(HHStatusHistoryBase):
    id: int
    candidate_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class HHCandidateBase(BaseModel):
    full_name: str
    birth_date: str
    phone: str
    position: str
    resume_file_path: Optional[str] = None
    status: str = "новый"

class HHCandidateCreate(HHCandidateBase):
    comment: Optional[str] = None

class HHCandidate(HHCandidateBase):
    id: int
    created_at: datetime
    modified_at: Optional[datetime] = None
    status_history: List[HHStatusHistory] = []

    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    time: Optional[str] = None
    status: str = "planned"
    assigned_to: Optional[int] = None
    created_by_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    created_by_id: Optional[int] = None

class TaskCreator(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    creator: Optional[TaskCreator] = None

    class Config:
        from_attributes = True

# Схемы для уведомлений
class NotificationBase(BaseModel):
    message: str
    task_id: Optional[int] = None
    vacancy_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime
    is_read: bool
    task: Optional[Task] = None
    vacancy: Optional["Vacancy"] = None

    class Config:
        from_attributes = True

class VacancyBase(BaseModel):
    title: str
    requirements: Optional[str] = None
    conditions: Optional[str] = None
    description: Optional[str] = None

class VacancyCreate(VacancyBase):
    pass

class VacancyUpdate(BaseModel):
    title: Optional[str] = None
    requirements: Optional[str] = None
    conditions: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class Vacancy(VacancyBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    closed_by_id: Optional[int] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VacancyDetail(Vacancy):
    creator: Optional[User] = None
    closed_by: Optional[User] = None
    assignments: List["VacancyAssignmentDetail"] = []

class VacancyAssignmentBase(BaseModel):
    vacancy_id: int
    recruiter_id: int

class VacancyAssignmentCreate(VacancyAssignmentBase):
    pass

class VacancyAssignmentUpdate(BaseModel):
    status: Optional[str] = None
    candidate_id: Optional[int] = None

class VacancyAssignment(VacancyAssignmentBase):
    id: int
    assigned_at: datetime
    closed_at: Optional[datetime] = None
    status: str
    candidate_id: Optional[int] = None

    class Config:
        from_attributes = True

class VacancyAssignmentDetail(VacancyAssignment):
    vacancy: Vacancy
    recruiter: User
    candidate: Optional[dict] = None

# Обновляем аннотации для решения циклических импортов
VacancyDetail.update_forward_refs() 
Notification.update_forward_refs()

# Схемы для папок
class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderCreate(FolderBase):
    pass

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class Folder(FolderBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FolderDetail(Folder):
    subfolders: List["FolderDetail"] = []
    documents: List["Document"] = []

    class Config:
        from_attributes = True

# Схемы для документов
class DocumentBase(BaseModel):
    name: str
    folder_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None

class Document(DocumentBase):
    id: int
    file_path: str
    file_type: str
    file_size: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Схемы для доступа к документам
class DocumentAccessBase(BaseModel):
    document_id: int
    user_id: int
    access_level: str

class DocumentAccessCreate(DocumentAccessBase):
    pass

class DocumentAccess(DocumentAccessBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Обновление циклических ссылок
FolderDetail.update_forward_refs() 

# В конец файла добавляем новые схемы

class TelegramBroadcast(BaseModel):
    """Схема для массовой рассылки сообщений через Telegram бот"""
    message: str
    status: Optional[str] = None  # Статус пользователей для рассылки (если выбор по статусу)
    user_ids: Optional[List[int]] = None  # Список ID пользователей (если выбор индивидуальный)

    class Config:
        schema_extra = {
            "example": {
                "message": "Важное сообщение для всех пользователей!",
                "user_ids": [1, 2, 3]
            }
        }


class TelegramBroadcastCreate(TelegramBroadcast):
    """Схема для создания рассылки"""
    pass


class TelegramBroadcastResponse(TelegramBroadcast):
    """Схема ответа для рассылки"""
    id: int
    sender_id: int
    created_at: datetime
    status: str  # completed, failed
    recipients_count: int
    confirmed_count: int

    class Config:
        orm_mode = True

class MessageConfirmationResponse(BaseModel):
    id: int
    broadcast_id: int
    telegram_chat_id: str
    status: str
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TelegramBroadcastDetailResponse(TelegramBroadcastResponse):
    confirmations: List[MessageConfirmationResponse] = []

    class Config:
        from_attributes = True 