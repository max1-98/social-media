//! Lightweight single-binary backend for the sports social network.
//!
//! Target architecture (see `docs/REBUILD_PLAN.md`): one always-on Axum process
//! on a fixed-price EU VM serves the JSON API, the static frontend (`web/dist`),
//! and a media proxy — replacing the old Django + Daphne + Nginx + Redis +
//! RabbitMQ + Celery + Flower + Channels stack.
//!
//! Phase 1 (this scaffold) wires up the process, a health check, and a hello
//! endpoint, plus static-file serving with SPA fallback. Domain logic lands in
//! later phases — see the module stubs below.

mod routes;

// Domain modules — placeholders that map 1:1 onto the existing Django apps so
// the parity port (Phase 4) is auditable. Implemented in later phases.
mod domain;
mod email;
mod geocode;
mod matchmaking;
mod media;
mod rating;

use std::net::SocketAddr;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = routes::router();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listen address");
    axum::serve(listener, app).await.expect("server error");
}
