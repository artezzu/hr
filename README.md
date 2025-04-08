# HR Platform

Modern HR platform built with Next.js and FastAPI.

## Project Structure

- `frontend/` - Next.js frontend application
- `backend/` - FastAPI backend application

## Deployment Instructions

### Prerequisites

- Docker
- Docker Compose
- Git

### Server Setup

1. **Install Docker and Docker Compose on the server:**
   ```bash
   # For Ubuntu/Debian:
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   # Log out and log back in for the group changes to take effect
   ```

2. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd platformatest
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

4. **Build and start the containers:**
   ```bash
   docker-compose up --build -d
   ```

5. **Check the logs:**
   ```bash
   docker-compose logs -f
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# PostgreSQL Settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=abstract_hr
POSTGRES_SERVER=db
POSTGRES_PORT=5432

# Backend Settings
SECRET_KEY=your_secure_secret_key
CORS_ORIGINS=http://localhost:3000,http://frontend:3000,https://your-domain.com
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Frontend Settings
NEXT_PUBLIC_API_URL=http://backend:8000

# HeadHunter API Settings (if needed)
HH_API_CLIENT_ID=your_client_id
HH_API_CLIENT_SECRET=your_client_secret

# Telegram Bot Settings (if needed)
BOT_TOKEN=your_bot_token
```

### Important Notes

1. **Security:**
   - Change all default passwords in production
   - Use strong, unique passwords
   - Keep your `.env` file secure and never commit it to version control

2. **Database:**
   - PostgreSQL data is persisted in a Docker volume
   - Regular backups are recommended

3. **File Storage:**
   - Uploaded files are stored in:
     - `backend/uploads/`
     - `backend/resumes/`
     - `backend/documents/`
   - These directories are mounted as volumes

4. **SSL/HTTPS:**
   - For production, set up SSL certificates
   - Consider using a reverse proxy like Nginx

### Maintenance

1. **Update the application:**
   ```bash
   git pull
   docker-compose down
   docker-compose up --build -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

3. **Restart services:**
   ```bash
   docker-compose restart [service_name]
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

### Troubleshooting

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **View container logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

3. **Access container shell:**
   ```bash
   docker-compose exec [service_name] sh
   ```

4. **Database backup:**
   ```bash
   docker-compose exec db pg_dump -U postgres abstract_hr > backup.sql
   ```

5. **Database restore:**
   ```bash
   docker-compose exec -T db psql -U postgres abstract_hr < backup.sql
   ```

## Setup Instructions

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at http://localhost:8000

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:3000

## Features (Planned)
- Employee Management
- Recruitment and Hiring
- Time and Attendance
- Performance Management
- Training and Development
- Document Management
- Analytics and Reporting 