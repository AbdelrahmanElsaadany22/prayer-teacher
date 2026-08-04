# syntax=docker/dockerfile:1

# Build stage — needs devDependencies (nest CLI, TypeScript) to compile.
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage — production dependencies and the compiled output only.
# bcrypt ships a native binary, so it is installed against this same image
# rather than copied over from the build stage.
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# The app reads PORT and falls back to 3000.
EXPOSE 3000
USER node

CMD ["node", "dist/main"]
