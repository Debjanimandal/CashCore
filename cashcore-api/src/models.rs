use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub wallet_address: Option<String>,
    pub profile_cid: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    User,
    Admin,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Restricted,
    Banned,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: String,
    pub from_wallet: String,
    pub to_wallet: String,
    pub amount: i128,
    pub token: String,
    pub fee: String,
    pub status: TxStatus,
    pub block: Option<u64>,
    pub tx_cid: Option<String>,
    pub created_at: DateTime<Utc>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TxStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,       // user id
    pub email: String,
    pub role: String,
    pub wallet: Option<String>,
    pub exp: i64,
    pub iat: i64,
}

// --- Request DTOs ---

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct OtpRequest {
    pub otp_code: String,
}

#[derive(Deserialize)]
pub struct WalletConnectRequest {
    pub address: String,
    pub signature: String,
    pub public_key: String,
}

#[derive(Deserialize)]
pub struct InitiateTxRequest {
    pub to: String,
    pub amount: String,
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

// --- Response DTOs ---

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserPublic,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_otp: Option<bool>,
}

#[derive(Serialize)]
pub struct UserPublic {
    pub id: String,
    pub email: String,
    pub display_name: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub wallet_address: Option<String>,
    pub profile_cid: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct TxResponse {
    pub tx_hash: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct BalanceResponse {
    pub balance: String,
    pub address: String,
}

#[derive(Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Serialize)]
pub struct StatsResponse {
    pub total_users: u64,
    pub active_wallets: u64,
    pub transactions_today: u64,
    pub volume_today: String,
}
