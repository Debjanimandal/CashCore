use axum::{
    Router,
    http::{Method, HeaderValue},
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use dotenvy::dotenv;

mod auth;
mod wallet;
mod transactions;
mod admin;
mod models;
mod errors;
mod state;
mod ipfs;

#[tokio::main]
async fn main() {
    // Load .env
    dotenv().ok();

    // Tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "cashcore_api=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // App state
    let state = state::AppState::new().await;

    // CORS — allow Next.js frontend
    let cors = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::COOKIE,
        ])
        .allow_credentials(true);

    // Router
    let app = Router::new()
        .nest("/api/auth", auth::router())
        .nest("/api/wallet", wallet::router())
        .nest("/api/tx", transactions::router())
        .nest("/api/admin", admin::router())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("CashCore API listening on :8080");
    axum::serve(listener, app).await.unwrap();
}
