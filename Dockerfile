FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

COPY . .

# Build the application with production environment
RUN npm run build -- --configuration=production

FROM docker.io/library/nginx:alpine AS production

# Copy custom nginx site configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist/trackoss/browser /usr/share/nginx/html

# Copy and set up the entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set default environment variables (can be overridden at runtime)
ENV BASE_URL="/api/map-proxy"
ENV VALHALLA_URL="/api/valhalla"

EXPOSE 80

# Use the entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
