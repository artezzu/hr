import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent

# API Configuration
API_HOST = os.getenv('API_HOST', 'localhost')
API_PORT = int(os.getenv('API_PORT', '8000'))
API_URL = os.getenv('API_URL', f'http://{API_HOST}:{API_PORT}')

# Security Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-keep-it-secret')  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '480'))

# File Storage Configuration
RESUME_DIR = BASE_DIR / "resumes"
RESUME_DIR.mkdir(exist_ok=True)

# CORS Configuration
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,https://hh.ru,https://tashkent.hh.uz,https://hh.uz').split(',')

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL', f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', '5533951')}@{os.getenv('POSTGRES_SERVER', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'abstract_hr')}")

# Telegram Bot Configuration
BOT_TOKEN = os.getenv('BOT_TOKEN', '')

# HeadHunter API Configuration
HH_API_CLIENT_ID = os.getenv('HH_API_CLIENT_ID', '')
HH_API_CLIENT_SECRET = os.getenv('HH_API_CLIENT_SECRET', '') 