use axum::{
    Router, Json,
    extract::{State, Path, Query},
    routing::{get, post},
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::state::AppState;
use crate::models::*;
use crate::errors::{AppError, AppResult};
use crate::ipfs::pin_json;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/initiate", post(initiate_tx))
        .route("/history", get(get_history))
        .route("/:hash", get(get_tx))
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub page: Option<u32>,
    pub filter: Option<String>,
}

async fn initiate_tx(
    State(state): State<AppState>,
    Json(body): Json<InitiateTxRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate Stellar address: starts with G, exactly 56 chars, all uppercase alphanumeric
    let is_valid_stellar = body.to.starts_with('G')
        && body.to.len() == 56
        && body.to.chars().all(|c| c.is_ascii_alphanumeric());

    if !is_valid_stellar {
        return Err(AppError::BadRequest(
            "Invalid recipient address. Please enter a valid Stellar address (starts with G, 56 characters).".to_string()
        ));
    }

    let amount: i128 = body.amount.parse()
        .map_err(|_| AppError::BadRequest("Invalid amount format".to_string()))?;

    if amount <= 0 {
        return Err(AppError::BadRequest("Amount must be greater than zero".to_string()));
    }

    // In production: extract from_wallet from JWT claims
    // For now use a placeholder — the real address comes from wallet connection
    let from_wallet = "GCASHCORE_SENDER_ADDRESS".to_string();

    // Self-transfer check
    if from_wallet == body.to {
        return Err(AppError::BadRequest("Cannot send to your own wallet".to_string()));
    }

    // In production: call Rust contract via RPC
    // let receipt = contract_interface::call_transfer(&from_wallet, &body.to, amount).await?;

    // Build mock receipt for demo
    let tx_hash = format!("0xtx{:016x}", rand_u64());
    let block_num: u64 = 1042000 + rand_u64() % 1000;

    // Pin TX record to IPFS
    let tx_json = json!({
        "schema": "cashcore_tx_v1",
        "hash": tx_hash,
        "from": from_wallet,
        "to": body.to,
        "amount": amount.to_string(),
        "token": "tFRGT",
        "fee": "0.001",
        "status": "confirmed",
        "block": block_num,
        "network": "friegter-testnet-v1",
        "timestamp": Utc::now().to_rfc3339(),
        "error": null,
    });

    let tx_cid = pin_json(
        &state.pinata_key,
        &state.pinata_secret,
        &tx_json,
        &format!("tx_{}", &tx_hash[..12]),
    )
    .await
    .unwrap_or_else(|_| "pending-ipfs-pin".to_string());

    // Store in index
    let tx = Transaction {
        hash: tx_hash.clone(),
        from_wallet: from_wallet.clone(),
        to_wallet: body.to.clone(),
        amount,
        token: "tFRGT".to_string(),
        fee: "0.001".to_string(),
        status: TxStatus::Confirmed,
        block: Some(block_num),
        tx_cid: Some(tx_cid),
        created_at: Utc::now(),
        error: None,
    };

    state.store.transactions.write().unwrap().push(tx);

    Ok(Json(json!({
        "tx_hash": tx_hash,
        "status": "confirmed",
        "block": block_num,
        "network": "friegter-testnet-v1",
    })))
}

async fn get_history(
    State(state): State<AppState>,
    Query(params): Query<HistoryQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let txs = state.store.transactions.read().unwrap();
    let filter = params.filter.as_deref().unwrap_or("all");
    let page = params.page.unwrap_or(1) as usize;
    let per_page = 20;

    let filtered: Vec<_> = txs.iter().filter(|tx| match filter {
        "sent" => tx.from_wallet == "0xFRGT...4a9f",
        "received" => tx.to_wallet == "0xFRGT...4a9f",
        "pending" => tx.status == TxStatus::Pending,
        _ => true,
    }).collect();

    let total = filtered.len();
    let page_items: Vec<_> = filtered
        .into_iter()
        .skip((page - 1) * per_page)
        .take(per_page)
        .collect();

    Ok(Json(json!({
        "transactions": page_items,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

async fn get_tx(
    State(state): State<AppState>,
    Path(hash): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let txs = state.store.transactions.read().unwrap();
    let tx = txs.iter().find(|t| t.hash == hash)
        .ok_or_else(|| AppError::NotFound(format!("Transaction {} not found", hash)))?;

    Ok(Json(json!(tx)))
}

fn rand_u64() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().subsec_nanos() as u64
}
