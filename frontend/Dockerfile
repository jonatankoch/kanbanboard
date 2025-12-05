# 1. Build-Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json /app/
RUN npm install

COPY . /app
RUN npm run build

# 2. Nginx-Stage
FROM nginx:alpine

# Nginx-Konfiguration (gleich unten)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build-Output rein
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
