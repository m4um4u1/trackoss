FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

COPY . .

# Build the application for production with docker-specific configuration
RUN npm run build -- --configuration=docker

FROM docker.io/library/nginx:alpine AS production

# Copy custom nginx site configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist/trackoss/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
