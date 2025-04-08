# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by some Python packages if needed
# RUN apt-get update && apt-get install -y --no-install-commends some-package && rm -rf /var/lib/apt/lists/*
# psycopg2-binary generally doesn't need system libs, but regular psycopg2 might need postgresql-client or libpq-dev

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Use --no-cache-dir to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variables (can be overridden by docker-compose)
# Example: ENV DATABASE_URL postgresql://user:password@db:5432/dbname
# These should ideally be passed via docker-compose.yml for flexibility

# Command to run the application using uvicorn
# We will override this in docker-compose.yml to run migrations first
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 