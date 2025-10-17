# ---------- Stage 1: Build ----------
FROM rustlang/rust:nightly AS builder

WORKDIR /app

# Копируем манифесты и исходники
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/vendor ./vendor
COPY backend/src ./src

# Копируем .env (опционально, если нужно во время сборки)
COPY .env .env

# Собираем release-бинарник
RUN cargo build --release


# ---------- Stage 2: Runtime ----------
FROM debian:bookworm-slim AS runtime

# Минимум зависимостей
RUN apt-get update && \
    apt-get install -y --no-install-recommends libssl3 ca-certificates sqlite3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Копируем бинарник
COPY --from=builder /app/target/release/remora-backend /app/backend

# ⚙️ Создаём каталог под базу — только структуру, без файлов
RUN mkdir -p /app/data

# Копируем .env
COPY .env .env

# Открываем фиксированный порт сервиса
EXPOSE 8080

# Запуск без оболочки (окружение уже подставляется Docker’ом)
CMD ["./backend"]
