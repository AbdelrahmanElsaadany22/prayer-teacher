# syntax=docker/dockerfile:1

# Build stage. VITE_API_URL is inlined into the bundle by Vite at build time,
# so it has to be supplied here as a build argument — setting it on the running
# container has no effect. Rebuild the image to point at a different API.
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Runtime stage — nginx serving the static bundle.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
