# Use an official Node.js runtime as a parent image
# Use a specific LTS version for stability
FROM node:18-alpine

# Declare build argument
# ARG NEXT_PUBLIC_API_URL
# Set environment variable for build process
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=http://109.73.198.72:8000 

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json* ./

# Install dependencies
# Use --frozen-lockfile to ensure we use the exact versions from the lock file
RUN npm install --frozen-lockfile

# Copy the rest of the frontend application code
COPY . .

# Build the Next.js application for production
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Command to run the application
# This will start the Next.js production server
CMD ["npm", "start"] 