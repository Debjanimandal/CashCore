use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use crate::models::{User, Transaction, UserRole, UserStatus};
use chrono::Utc;

/// In-memory store for development — replace with PostgreSQL in production
#[derive(Clone, Default)]
pub struct InMemoryStore {
    pub users: Arc<RwLock<HashMap<String, User>>>,
    pub transactions: Arc<RwLock<Vec<Transaction>>>,
    pub sessions: Arc<RwLock<HashMap<String, String>>>, // token -> user_id
}

impl InMemoryStore {
    pub fn new() -> Self {
        let store = InMemoryStore::default();

        // Seed admin user
        let admin_id = Uuid::new_v4().to_string();
        let admin = User {
            id: Uuid::parse_str(&admin_id).unwrap(),
            email: "admin@cashcore.io".to_string(),
            password_hash: bcrypt::hash("admin1234", bcrypt::DEFAULT_COST).unwrap(),
            display_name: "CashCore Admin".to_string(),
            role: UserRole::Admin,
            status: UserStatus::Active,
            wallet_address: None,
            profile_cid: None,
            created_at: Utc::now(),
        };

        store.users.write().unwrap().insert(admin.email.clone(), admin);
        store
    }
}

#[derive(Clone)]
pub struct AppState {
    pub store: InMemoryStore,
    pub jwt_secret: String,
    pub pinata_key: String,
    pub pinata_secret: String,
    pub pinata_gateway: String,
}

impl AppState {
    pub async fn new() -> Self {
        AppState {
            store: InMemoryStore::new(),
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| "cashcore-dev-secret-change-in-prod".to_string()),
            pinata_key: std::env::var("PINATA_API_KEY").unwrap_or_default(),
            pinata_secret: std::env::var("PINATA_SECRET_API_KEY").unwrap_or_default(),
            pinata_gateway: std::env::var("NEXT_PUBLIC_PINATA_GATEWAY")
                .unwrap_or_else(|_| "https://gateway.pinata.cloud/ipfs".to_string()),
        }
    }
}
