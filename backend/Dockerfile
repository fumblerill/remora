# ---------- Stage 1: Build ----------
FROM rustlang/rust:nightly AS builder

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем файлы манифеста для кеширования зависимостей
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src

# Копируем общий .env (если нужен на этапе компиляции)
COPY .env .env

# Собираем бинарник (release)
RUN cargo build --release


# ---------- Stage 2: Runtime ----------
FROM debian:bookworm-slim AS runtime

# Устанавливаем только нужные пакеты (SSL, SQLite)
RUN apt-get update && apt-get install -y libssl3 ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Копируем бинарник из builder — подставь имя пакета из Cargo.toml (скорее всего "remora" или "remora-backend")
COPY --from=builder /app/target/release/remora-backend /app/backend

# Копируем данные и .env
COPY backend/data ./data
COPY .env .env

# Открываем порт (значение приходит из env_file)
EXPOSE ${RUST_PORT}

# Запуск без bash — окружение уже подставляется Docker’ом
CMD ["./backend"]
