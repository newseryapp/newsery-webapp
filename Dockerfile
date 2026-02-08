# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---------- Runtime stage (Nginx) ----------
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config: SPA + /api/* proxy -> feed-api (strip /api prefix)
# NOTE: frontend calls /api/feed, backend expects /feed
RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # DNS resolver for proxy_pass to hostname
  resolver 1.1.1.1 8.8.8.8 valid=30s ipv6=off;

  # Proxy API calls to feed-api (strip /api)
  location /api/ {
    # IMPORTANT: keep trailing slash
    set $upstream "https://api.newsery.app/";
    proxy_set_header Host api.newsery.app;
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass $upstream;

    proxy_http_version 1.1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
