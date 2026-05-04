use axum::{
    Router, Json,
    extract::State,
    routing::post,
};
use chrono::{Utc, Duration};
use jsonwebtoken::{encode, Header, EncodingKey};
use uuid::Uuid;
use serde_json::json;

use crate::state::AppState;
use crate::models::*;
use crate::errors::{AppError, AppResult};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/verify-otp", post(verify_otp))
}

async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate email
    if !body.email.contains('@') {
        return Err(AppError::BadRequest("Invalid email address".to_string()));
    }

    // Check duplicate
    let users = state.store.users.read().unwrap();
    if users.contains_key(&body.email) {
        return Err(AppError::BadRequest("Email already registered".to_string()));
    }
    drop(users);

    // Hash password
    let password_hash = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = User {
        id: Uuid::new_v4(),
        email: body.email.clone(),
        password_hash,
        display_name: body.name.clone(),
        role: UserRole::User,
        status: UserStatus::Active,
        wallet_address: None,
        profile_cid: None,
        created_at: Utc::now(),
    };

    // Issue token
    let token = issue_token(&user, &state.jwt_secret)?;
    let public_user = to_public(&user);

    state.store.users.write().unwrap().insert(user.email.clone(), user);

    Ok(Json(json!({
        "token": token,
        "user": public_user,
    })))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let users = state.store.users.read().unwrap();
    let user = users.get(&body.email)
        .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?
        .clone();
    drop(users);

    // Check status
    if user.status == UserStatus::Banned {
        return Err(AppError::Forbidden("Account has been banned".to_string()));
    }

    // Verify password
    let valid = bcrypt::verify(&body.password, &user.password_hash)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if !valid {
        return Err(AppError::Unauthorized("Invalid email or password".to_string()));
    }

    // Role check
    let requested_role = if body.role == "admin" { UserRole::Admin } else { UserRole::User };
    if requested_role == UserRole::Admin && user.role != UserRole::Admin {
        return Err(AppError::Forbidden("Not authorized as admin".to_string()));
    }

    // Admin requires OTP step
    if user.role == UserRole::Admin {
        let temp_token = issue_token(&user, &state.jwt_secret)?;
        return Ok(Json(json!({
            "token": temp_token,
            "user": to_public(&user),
            "requires_otp": true,
        })));
    }

    let token = issue_token(&user, &state.jwt_secret)?;
    Ok(Json(json!({
        "token": token,
        "user": to_public(&user),
    })))
}

async fn verify_otp(
    State(state): State<AppState>,
    Json(body): Json<OtpRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // In production: validate TOTP code against user's TOTP secret
    // using totp_rs::TOTP
    if body.otp_code.len() != 6 || !body.otp_code.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::Unauthorized("Invalid OTP code".to_string()));
    }

    // Dev: accept any 6-digit code for demo
    Ok(Json(json!({
        "token": "admin-verified-token-placeholder",
        "verified": true,
    })))
}

pub fn issue_token(user: &User, secret: &str) -> AppResult<String> {
    let now = Utc::now();
    let exp = now + Duration::hours(if user.role == UserRole::Admin { 4 } else { 24 });

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: format!("{:?}", user.role).to_lowercase(),
        wallet: user.wallet_address.clone(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn to_public(user: &User) -> UserPublic {
    UserPublic {
        id: user.id.to_string(),
        email: user.email.clone(),
        display_name: user.display_name.clone(),
        role: user.role.clone(),
        status: user.status.clone(),
        wallet_address: user.wallet_address.clone(),
        profile_cid: user.profile_cid.clone(),
        created_at: user.created_at,
    }
}
