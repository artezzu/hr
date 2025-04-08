from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, MetaData
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="user")  # "user", "admin", "recruiter"
    position = Column(String, nullable=True)  # Должность пользователя
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    birth_date = Column(String)
    position = Column(String)
    specialization = Column(String)
    education = Column(String)
    citizenship = Column(String)
    experience = Column(Text)
    city = Column(String)
    phone = Column(String)
    telegram = Column(String)
    telegram_chat_id = Column(String, nullable=True)
    languages = Column(String)
    source = Column(String)
    resume_file_path = Column(String, nullable=True)
    status = Column(String, default="новый")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status_history = relationship("StatusHistory", back_populates="application")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    status = Column(String)
    comment = Column(Text)
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    application = relationship("Application", back_populates="status_history")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    sender = Column(String)  # 'hr' или 'candidate'
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    delivery_status = Column(String, default='pending')  # pending, delivered, failed
    
    application = relationship("Application", backref="messages")

class HHCandidate(Base):
    __tablename__ = "hh_candidates"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    birth_date = Column(String)
    phone = Column(String)
    position = Column(String)
    resume_file_path = Column(String, nullable=True)
    status = Column(String, default="новый")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    status_history = relationship("HHStatusHistory", back_populates="candidate")

class HHStatusHistory(Base):
    __tablename__ = "hh_status_history"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("hh_candidates.id"))
    status = Column(String)
    comment = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String)
    candidate = relationship("HHCandidate", back_populates="status_history")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(String, nullable=False)  # хранится в формате YYYY-MM-DD
    time = Column(String, nullable=True)  # время выполнения задачи
    status = Column(String, default="planned")  # planned, completed, canceled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # ID создателя задачи
    
    user = relationship("User", foreign_keys=[assigned_to], backref="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by_id], backref="created_tasks")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=True)
    message = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    
    user = relationship("User", backref="notifications")
    task = relationship("Task", backref="notifications")
    vacancy = relationship("Vacancy", backref="notifications")

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # Название вакансии
    requirements = Column(Text, nullable=True)  # Требования к кандидату
    conditions = Column(Text, nullable=True)  # Условия работы
    description = Column(Text, nullable=True)  # Дополнительное описание
    status = Column(String, default="new")  # "new", "in_progress", "closed"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Кто закрыл вакансию
    closed_at = Column(DateTime(timezone=True), nullable=True)  # Когда закрыта
    
    creator = relationship("User", foreign_keys=[created_by_id], backref="created_vacancies")
    closed_by = relationship("User", foreign_keys=[closed_by_id], backref="closed_vacancies")
    assignments = relationship("VacancyAssignment", back_populates="vacancy")

class VacancyAssignment(Base):
    __tablename__ = "vacancy_assignments"

    id = Column(Integer, primary_key=True, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"))
    recruiter_id = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())  # Когда взята в работу
    closed_at = Column(DateTime(timezone=True), nullable=True)  # Когда закрыта
    candidate_id = Column(Integer, ForeignKey("applications.id"), nullable=True)  # Каким кандидатом закрыта
    status = Column(String, default="assigned")  # "assigned", "closed"
    
    vacancy = relationship("Vacancy", back_populates="assignments")
    recruiter = relationship("User", foreign_keys=[recruiter_id], backref="vacancy_assignments")
    candidate = relationship("Application", foreign_keys=[candidate_id], backref="closed_vacancies")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    owner = relationship("User", backref="folders")
    parent = relationship("Folder", remote_side=[id], backref="subfolders")
    documents = relationship("Document", back_populates="folder")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # size in bytes
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    owner = relationship("User", backref="documents")
    folder = relationship("Folder", back_populates="documents")
    access = relationship("DocumentAccess", back_populates="document")

class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_level = Column(String, nullable=False)  # 'read', 'write', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    document = relationship("Document", back_populates="access")
    user = relationship("User", backref="document_access")

class TelegramBroadcast(Base):
    """Модель для хранения истории рассылок сообщений через Telegram бот"""
    __tablename__ = "telegram_broadcasts"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=False)
    recipients_count = Column(Integer, default=0)  # Количество получателей
    confirmed_count = Column(Integer, default=0)   # Количество подтвердивших получение
    status = Column(String, default="pending")  # pending, completed, failed
    created_at = Column(DateTime, default=datetime.now)
    
    # Отношения
    sender = relationship("User", foreign_keys=[sender_id])
    confirmations = relationship("MessageConfirmation", back_populates="broadcast")

    def __repr__(self):
        return f"<TelegramBroadcast(id={self.id}, status={self.status})>"

class MessageConfirmation(Base):
    """Модель для хранения подтверждений получения сообщений"""
    __tablename__ = "message_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    broadcast_id = Column(Integer, ForeignKey("telegram_broadcasts.id"))
    telegram_chat_id = Column(String, nullable=False)
    status = Column(String, default="sent")  # sent, confirmed, rejected
    confirmed_at = Column(DateTime, nullable=True)
    message_id = Column(Integer, nullable=True)  # ID сообщения в Telegram
    confirmation_key = Column(String, nullable=True, index=True)  # Ключ для callback data
    
    # Отношения
    broadcast = relationship("TelegramBroadcast", back_populates="confirmations")

    def __repr__(self):
        return f"<MessageConfirmation(id={self.id}, status={self.status})>" 