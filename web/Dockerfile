# ---------- Stage 1: Build ----------
FROM node:22 AS builder

WORKDIR /app

# Сначала зависимости для кеша
COPY web/package*.json ./
RUN npm ci

# Копируем исходники фронта
COPY web ./

# ⚠️ Копируем .env туда, где его реально ищет npm run build → ../.env
COPY .env ../.env

# Строим проект
RUN npm run build


# ---------- Stage 2: Runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./
COPY .env .env

CMD ["bash", "-c", "set -a && source .env && set +a && exec npx next start -p 3000"]

