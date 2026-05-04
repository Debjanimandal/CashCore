use axum::{
    Router, Json,
    extract::State,
    routing::{get, post},
};
use chrono::Utc;
use serde_json::json;

use crate::state::AppState;
use crate::models::*;
use crate::errors::{AppError, AppResult};
use crate::ipfs::pin_json;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/connect", post(connect_wallet))
        .route("/balance", get(get_balance))
        .route("/disconnect", post(disconnect_wallet))
}

async fn connect_wallet(
    State(state): State<AppState>,
    Json(body): Json<WalletConnectRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate address format — basic check
    if !body.address.starts_with("0x") || body.address.len() < 10 {
        return Err(AppError::BadRequest("Invalid wallet address format".to_string()));
    }

    // In production: verify body.signature against body.address and body.public_key
    // using the Friegter chain's signature verification

    // Check address not already used by another user
    {
        let users = state.store.users.read().unwrap();
        let conflict = users.values().any(|u| {
            u.wallet_address.as_deref() == Some(&body.address)
        });
        if conflict {
            return Err(AppError::BadRequest("This wallet address is already linked to another account".to_string()));
        }
    }

    // Build profile JSON and pin to IPFS
    let profile_json = json!({
        "schema": "cashcore_profile_v1",
        "wallet": body.address,
        "testnet": "friegter-testnet-v1",
        "connected_at": Utc::now().to_rfc3339(),
    });

    // Pin to IPFS (best-effort — don't fail connection if Pinata is unavailable)
    let profile_cid = pin_json(
        &state.pinata_key,
        &state.pinata_secret,
        &profile_json,
        &format!("profile_{}", &body.address[..12]),
    )
    .await
    .unwrap_or_else(|_| "pending-ipfs-pin".to_string());

    // Update first user found without wallet (demo) or by auth token in prod
    // In full implementation: extract user_id from JWT bearer token
    let mut users = state.store.users.write().unwrap();
    if let Some(user) = users.values_mut().find(|u| u.wallet_address.is_none()) {
        user.wallet_address = Some(body.address.clone());
        user.profile_cid = Some(profile_cid.clone());
    }

    Ok(Json(json!({
        "success": true,
        "address": body.address,
        "profile_cid": profile_cid,
        "network": "friegter-testnet-v1",
    })))
}

async fn get_balance(
    State(state): State<AppState>,
) -> AppResult<Json<BalanceResponse>> {
    // In production: call Friegter testnet RPC to get actual balance
    // For demo: return mock balance
    Ok(Json(BalanceResponse {
        balance: "10000".to_string(),
        address: "0xFRGT...4a9f".to_string(),
    }))
}

async fn disconnect_wallet(
    State(state): State<AppState>,
) -> AppResult<Json<SuccessResponse>> {
    Ok(Json(SuccessResponse { success: true }))
}
