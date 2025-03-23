FROM oven/bun:latest as builder

WORKDIR /app

# Copy package files
COPY package.json ./
RUN bun install

# Copy source
COPY . .

ARG APP_API

# Set environment variables - Use the correct Vite format
ENV VITE_APP_API=$APP_API

# Add a debug print to verify the environment variable
RUN echo "debug env: $VITE_APP_API"

# Build the application
RUN echo '#!/bin/sh\nbun vite build' > build.sh && chmod +x build.sh
RUN TSC_COMPILE_ON_ERROR=true VITE_TSCONFIG_NOCHECK=true CI=false ./build.sh

# Inject the API URL directly into the built files for additional safety
RUN sed -i "s|http://localhost:3001|$VITE_APP_API|g" /app/dist/assets/*.js

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server {listen 80;root /usr/share/nginx/html;index index.html;location / {try_files $uri $uri/ /index.html;}}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
