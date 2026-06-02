# syntax=docker/dockerfile:1
#
# Single-image build for the rebuild: compile the React SPA and the Axum binary,
# then ship one tiny runtime image that serves the JSON API *and* the static
# frontend on port 8080. SQLite migrations + seed run on first start, so the
# container is self-initialising.

# ---- Stage 1: build the React SPA (-> /web/dist) ----------------------------
FROM node:22-slim AS web-build
WORKDIR /web
# Install deps against the lockfile first so this layer caches across edits.
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- Stage 2: build the Rust binary (-> /server/target/release/server) ------
FROM rust:1-slim-bookworm AS server-build
# Build the compile-time-checked sqlx queries against the committed .sqlx cache
# instead of a live database.
ENV SQLX_OFFLINE=true
WORKDIR /server
# Warm the dependency layer with a stub main before copying the real sources.
COPY server/Cargo.toml server/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release \
    && rm -rf src
COPY server/ ./
# Touch so cargo rebuilds the crate (not just the cached stub) from real sources.
RUN touch src/main.rs && cargo build --release

# ---- Stage 3: runtime -------------------------------------------------------
FROM debian:bookworm-slim AS runtime
# ca-certificates: outbound HTTPS (geocoder / Resend). curl: container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Data dir must exist up front: sqlx create_if_missing makes the file, not the dir.
RUN mkdir -p /app/data /app/data/media
COPY --from=server-build /server/target/release/server /usr/local/bin/server
COPY --from=web-build /web/dist /app/web/dist
ENV WEB_DIST_DIR=/app/web/dist \
    DATABASE_URL=sqlite:///app/data/app.db \
    MEDIA_DIR=/app/data/media \
    PORT=8080
EXPOSE 8080
CMD ["server"]
