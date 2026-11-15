# Site vitrine + back-office (React) servis par Caddy, qui gère aussi le HTTPS et relaie /api vers l'API.
FROM node:22-alpine AS build
WORKDIR /app
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./
ARG VITE_API_URL=/api/v1
ARG VITE_PLAY_STORE_URL=
ARG VITE_APP_STORE_URL=
ARG VITE_CONTACT_EMAIL=
ENV VITE_API_URL=$VITE_API_URL VITE_PLAY_STORE_URL=$VITE_PLAY_STORE_URL VITE_APP_STORE_URL=$VITE_APP_STORE_URL VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npx vite build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/site
