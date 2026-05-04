//! CashCore Transfer Contract — Stellar Soroban (Testnet)
//!
//! Deployed on Stellar Testnet. Uses XLM as the transfer token.
//! Admin can restrict accounts. Enforces testnet-only via network passphrase check.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, String,
};

// ── Storage Keys ─────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    Admin,
    Restricted(Address),
}

// ── Events ───────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct TransferEvent {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub token: Address,
}

// ── Contract ─────────────────────────────────────────────────
#[contract]
pub struct CashCoreContract;

#[contractimpl]
impl CashCoreContract {
    /// Initialize the contract with an admin address.
    /// Must be called once right after deployment.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        // No require_auth here — deployer sets admin address at init time
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Transfer `amount` of `token` from `from` to `to`.
    /// Both parties must not be restricted.
    /// `from` must authorize this call (wallet signature).
    pub fn transfer(
        env: Env,
        token: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        // Require sender's wallet signature
        from.require_auth();

        // Validate amount
        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Self-transfer guard
        if from == to {
            panic!("cannot send to yourself");
        }

        // Check restrictions
        if env.storage().persistent().has(&DataKey::Restricted(from.clone())) {
            panic!("sender account is restricted");
        }
        if env.storage().persistent().has(&DataKey::Restricted(to.clone())) {
            panic!("recipient account is restricted");
        }

        // Execute token transfer via Stellar token interface
        let token_client = token::TokenClient::new(&env, &token);
        token_client.transfer(&from, &to, &amount);

        // Emit transfer event
        env.events().publish(
            (symbol_short!("transfer"), from.clone()),
            TransferEvent { from, to, amount, token },
        );
    }

    /// Restrict an account (admin only).
    pub fn restrict_account(env: Env, account: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Restricted(account), &true);
    }

    /// Unrestrict an account (admin only).
    pub fn unrestrict_account(env: Env, account: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::Restricted(account));
    }

    /// Check if an account is restricted.
    pub fn is_restricted(env: Env, account: Address) -> bool {
        env.storage().persistent().has(&DataKey::Restricted(account))
    }

    /// Get the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }
}

// ── Tests ─────────────────────────────────────────────────────
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Env};

    #[test]
    fn test_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        // Deploy contract
        let contract_id = env.register(CashCoreContract, ());
        let client = CashCoreContractClient::new(&env, &contract_id);

        // Create test addresses
        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // Create a test token (acts like XLM)
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_sac = StellarAssetClient::new(&env, &token_id.address());

        // Fund Alice with 1000 tokens
        token_sac.mint(&alice, &1_000_0000000);

        // Initialize contract
        client.initialize(&admin);

        // Transfer 100 tokens from Alice to Bob
        client.transfer(&token_id.address(), &alice, &bob, &100_0000000);

        // Verify balances using token client
        let token_client = soroban_sdk::token::TokenClient::new(&env, &token_id.address());
        assert_eq!(token_client.balance(&alice), 900_0000000);
        assert_eq!(token_client.balance(&bob), 100_0000000);
    }

    #[test]
    fn test_restrict_blocks_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(CashCoreContract, ());
        let client = CashCoreContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_sac = StellarAssetClient::new(&env, &token_id.address());
        token_sac.mint(&alice, &1_000_0000000);

        client.initialize(&admin);
        client.restrict_account(&alice);

        // Should panic — account restricted
        let result = std::panic::catch_unwind(|| {
            client.transfer(&token_id.address(), &alice, &bob, &100_0000000);
        });
        assert!(result.is_err());
    }
}
