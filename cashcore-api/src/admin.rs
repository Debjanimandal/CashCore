use axum::{
    Router, Json,
    extract::{State, Path, Query},
    routing::{get, patch},
};
use serde::Deserialize;
use serde_json::json;
use chrono::Utc;

use crate::state::AppState;
use crate::models::*;
use crate::errors::{AppError, AppResult};
use crate::ipfs::pin_json;
use crate::auth::to_public;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(get_users))
        .route("/users/:id/status", patch(update_user_status))
        .route("/transactions", get(get_all_transactions))
        .route("/transactions/:hash/flag", patch(flag_transaction))
        .route("/stats", get(get_stats))
}

#[derive(Deserialize)]
pub struct UsersQuery {
    pub page: Option<u32>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct TxQuery {
    pub page: Option<u32>,
    pub filter: Option<String>,
}

async fn get_users(
    State(state): State<AppState>,
    Query(params): Query<UsersQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let users = state.store.users.read().unwrap();
    let status_filter = params.status.as_deref().unwrap_or("all");
    let search = params.search.as_deref().unwrap_or("").to_lowercase();

    let filtered: Vec<UserPublic> = users.values()
        .filter(|u| {
            let status_match = match status_filter {
                "active" => u.status == UserStatus::Active,
                "restricted" => u.status == UserStatus::Restricted,
                "banned" => u.status == UserStatus::Banned,
                _ => true,
            };
            let search_match = search.is_empty()
                || u.email.to_lowercase().contains(&search)
                || u.display_name.to_lowercase().contains(&search);
            status_match && search_match
        })
        .map(to_public)
        .collect();

    let total = filtered.len();

    Ok(Json(json!({
        "users": filtered,
        "total": total,
    })))
}

async fn update_user_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateStatusRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let new_status = match body.status.as_str() {
        "active" => UserStatus::Active,
        "restricted" => UserStatus::Restricted,
        "banned" => UserStatus::Banned,
        _ => return Err(AppError::BadRequest("Invalid status value".to_string())),
    };

    {
        let mut users = state.store.users.write().unwrap();
        let user = users.values_mut()
            .find(|u| u.id.to_string() == id)
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
        user.status = new_status;
    }

    // Fire-and-forget audit pin — owned values only
    let audit_name = format!("audit_{}_{}", &id, Utc::now().timestamp());
    let audit_content = json!({
        "schema": "cashcore_audit_v1",
        "action": format!("set_status_{}", &body.status),
        "target_user_id": &id,
        "new_status": &body.status,
        "timestamp": Utc::now().to_rfc3339(),
    });
    let pinata_key = state.pinata_key.clone();
    let pinata_secret = state.pinata_secret.clone();
    tokio::spawn(async move {
        let _ = pin_json(&pinata_key, &pinata_secret, &audit_content, &audit_name).await;
    });

    Ok(Json(json!({
        "success": true,
        "user_id": id,
        "new_status": body.status,
    })))
}

async fn get_all_transactions(
    State(state): State<AppState>,
    Query(params): Query<TxQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let txs = state.store.transactions.read().unwrap();
    let filter = params.filter.as_deref().unwrap_or("all");

    let filtered: Vec<_> = txs.iter().filter(|tx| match filter {
        "pending" => tx.status == TxStatus::Pending,
        "failed" => tx.status == TxStatus::Failed,
        _ => true,
    }).collect();

    let total = filtered.len();
    Ok(Json(json!({
        "transactions": filtered,
        "total": total,
    })))
}

async fn flag_transaction(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    // In production: update flagged field in DB and pin flag audit to IPFS
    tracing::warn!("Admin flagged transaction: {}", hash);
    Ok(Json(SuccessResponse { success: true }))
}

async fn get_stats(
    State(state): State<AppState>,
) -> AppResult<Json<StatsResponse>> {
    let users = state.store.users.read().unwrap();
    let txs = state.store.transactions.read().unwrap();

    let total_users = users.len() as u64;
    let active_wallets = users.values().filter(|u| u.wallet_address.is_some()).count() as u64;
    let transactions_today = txs.len() as u64;
    let volume_today: i128 = txs.iter().map(|t| t.amount).sum();

    Ok(Json(StatsResponse {
        total_users,
        active_wallets,
        transactions_today,
        volume_today: format!("{} tFRGT", volume_today),
    }))
}
