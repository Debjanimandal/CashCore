<div align="center">

<img src="https://img.shields.io/badge/Stellar-Testnet-00D4C8?style=for-the-badge&logo=stellar&logoColor=white" />
<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/Rust-Axum-orange?style=for-the-badge&logo=rust&logoColor=white" />
<img src="https://img.shields.io/badge/Soroban-Smart%20Contract-blueviolet?style=for-the-badge" />
<img src="https://img.shields.io/badge/IPFS-Pinata-E4405F?style=for-the-badge&logo=pinata&logoColor=white" />

<br/><br/>

# CashCore — Friegter Wallet

### A full-stack digital payment app built on Stellar Testnet

*Wallet-to-wallet XLM transfers · Real Freighter signing · Soroban smart contract · IPFS audit logs*

</div>

---

## Overview

**CashCore** is a production-grade fintech demo app built inside **Friegter Wallet**. It enables secure, testnet-only digital payments using the **Stellar blockchain**, with a real Soroban smart contract governing transfers, a **Rust + Axum** backend API, and a polished **Next.js** frontend.

> ⚠️ **Testnet Only** — All transactions use Stellar Testnet XLM. No real money is ever involved.

---

## Features

| Feature | Description |
|---|---|
| 🔐 **User & Admin Auth** | Separate JWT-authenticated login flows with role-based access |
| 🌐 **Freighter Wallet** | Real browser wallet integration — connect, sign, and send |
| 💸 **On-chain Transfers** | Real XLM payments submitted to Stellar Testnet via Horizon |
| 📜 **Smart Contract** | Soroban Rust contract with admin restriction and transfer events |
| 📊 **Transaction History** | Live history fetched from Stellar Horizon API, grouped by date |
| 🗂️ **IPFS Audit Logs** | Transaction records pinned to IPFS via Pinata |
| 🛡️ **Admin Dashboard** | View users, restrict accounts, monitor platform activity |
| 📱 **Mobile-First UI** | Dark, glassmorphism design system — looks great on any device |

---

## Tech Stack

### Frontend
- **Next.js 16** (Turbopack, App Router)
- **TypeScript** · **Zustand** (state) · **React Hook Form + Zod** (validation)
- **@stellar/freighter-api** (wallet connection & transaction signing)
- **@stellar/stellar-sdk** (transaction building & Horizon API)
- **Vanilla CSS** design system with CSS variables

### Backend
- **Rust** + **Axum** (async API server on port 8080)
- **JWT authentication** · **bcrypt** password hashing
- **In-memory store** (production-ready interface for future PostgreSQL)
- **Pinata IPFS** (off-chain audit log pinning)

### Smart Contract
- **Stellar Soroban** (Rust/Wasm, deployed on Stellar Testnet)
- Contract: `CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4`
- Admin: Freighter Wallet `GDA2HEX7INDEPKI43OHLXRKHH4FMCS4RBEAAEKFHS2OIRUQYFT3IBCRC`

---

## Project Structure

```
CashCore/
├── cashcore-ui/          # Next.js 16 frontend
│   ├── src/app/          # App Router pages
│   │   ├── login/        # User & Admin login with OTP
│   │   ├── register/     # Two-step account creation
│   │   ├── connect-wallet/  # Real Freighter connection
│   │   ├── (user)/       # Protected user routes
│   │   │   ├── dashboard/   # Balance, quick actions, QR
│   │   │   ├── send/        # Multi-step real XLM transfer
│   │   │   ├── activity/    # Live Stellar Horizon history
│   │   │   ├── wallet/      # Wallet info & management
│   │   │   └── profile/     # Account settings
│   │   └── admin/        # Admin dashboard & user management
│   ├── src/components/   # Reusable UI component library
│   ├── src/store/        # Zustand global state
│   └── src/lib/api.ts    # Backend API client
│
├── cashcore-api/         # Rust Axum backend
│   ├── src/auth.rs       # Register, login, JWT, OTP
│   ├── src/transactions.rs  # Transfer initiation & history
│   ├── src/wallet.rs     # Wallet connect/disconnect
│   ├── src/admin.rs      # Admin user management
│   ├── src/ipfs.rs       # Pinata IPFS integration
│   └── src/state.rs      # App state & in-memory store
│
├── cashcore-contract/    # Soroban smart contract (Rust)
│   └── src/lib.rs        # Transfer logic, admin control
│
└── scripts/              # Deployment & utility scripts
    ├── deploy-contract.js     # Deploy to Stellar Testnet
    ├── initialize-contract.js # Set admin address
    └── kill-ports.js          # Dev environment cleanup
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- [Freighter Wallet](https://freighter.app) browser extension (Chrome/Firefox)
- A Stellar Testnet account (funded via [Friendbot](https://friendbot.stellar.org))

### Installation

```bash
# Clone the repository
git clone https://github.com/Debjanimandal/CashCore.git
cd CashCore

# Install dependencies
npm install
cd cashcore-ui && npm install && cd ..
```

### Environment Setup

**`cashcore-api/.env`**
```env
JWT_SECRET=your-secret-key-here
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
CONTRACT_ID=CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4
RUST_LOG=cashcore_api=debug
```

**`cashcore-ui/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Run the Application

```bash
# Start both frontend and backend with one command
npm run dev
```

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8080

---

## Smart Contract

The CashCore Soroban contract is deployed on Stellar Testnet.

| Field | Value |
|---|---|
| Contract ID | `CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4` |
| Network | Stellar Testnet |
| Language | Rust (Soroban SDK v22) |
| Explorer | [View on stellar.expert](https://stellar.expert/explorer/testnet/contract/CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4) |

**Contract Functions:**
- `initialize(admin)` — Set contract admin (called once at deploy)
- `transfer(token, from, to, amount)` — XLM wallet-to-wallet payment
- `restrict_account(account)` — Admin: block an address
- `unrestrict_account(account)` — Admin: unblock an address
- `is_restricted(account)` — Check restriction status

### Redeploy the Contract

```bash
# Build WASM
cd cashcore-contract
cargo build --target wasm32-unknown-unknown --release

# Deploy and initialize with your wallet as admin
cd ..
node scripts/deploy-contract.js
node scripts/initialize-contract.js
```

---

## Usage

### As a User
1. Register at `/register` (two-step flow with password strength validation)
2. Log in at `/login`
3. Connect your Freighter Wallet (switch to **Testnet** in Freighter first)
4. Fund your wallet at [Friendbot](https://friendbot.stellar.org)
5. Send XLM to any Stellar address from the **Send** page
6. View your real on-chain history in **Activity**

### As an Admin
1. Log in at `/login` → select **Admin** tab
2. Enter credentials → approve 6-digit OTP
3. Access **Admin Dashboard** to view users and restrict/unrestrict accounts

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Login (returns JWT) |
| `POST` | `/api/auth/verify-otp` | Verify admin OTP |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/wallet/connect` | Register wallet address |
| `GET` | `/api/wallet/balance` | Get wallet balance |
| `POST` | `/api/tx/initiate` | Initiate a transfer |
| `GET` | `/api/tx/history` | Get transaction history |
| `GET` | `/api/admin/users` | List all users (admin) |
| `PATCH` | `/api/admin/users/:id/status` | Restrict/unrestrict user |
| `GET` | `/api/admin/stats` | Platform statistics |

---

## Security

- Passwords hashed with **bcrypt**
- Sessions secured with **JWT** (HS256, configurable expiry)
- Admin routes protected by **OTP verification** (TOTP-ready)
- Smart contract enforces **testnet-only** execution (rejects mainnet calls)
- CORS configured for credential-based requests

---

## Roadmap

- [ ] PostgreSQL persistence (replace in-memory store)
- [ ] Real TOTP (Google Authenticator) for admin OTP
- [ ] QR code scanner for recipient address input
- [ ] Push notifications for received payments
- [ ] Multi-asset support (custom Stellar tokens)
- [ ] Mainnet deployment option

---

## License

MIT © 2026 [Debjani Mandal](https://github.com/Debjanimandal)

---

<div align="center">

Built with ❤️ using **Rust · Next.js · Stellar Soroban**

</div>
