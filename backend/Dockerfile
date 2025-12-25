# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
