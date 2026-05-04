/**
 * CashCore — Stellar Soroban Contract Deployment Script
 * Deploys the CashCore contract to Stellar Testnet using the JS SDK.
 *
 * Steps:
 * 1. Generate a new deployer keypair
 * 2. Fund via Friendbot (testnet faucet)
 * 3. Upload + instantiate the contract WASM
 * 4. Initialize with admin address
 * 5. Print the deployed contract ID
 */

const stellar = require('@stellar/stellar-sdk');
const { Keypair, TransactionBuilder, BASE_FEE, Networks, Operation, Address } = stellar;
const { Server, assembleTransaction, Api } = stellar.rpc;
const fs = require('fs');
const path = require('path');

const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const FRIENDBOT = 'https://friendbot.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fundAccount(publicKey) {
  console.log(`\n[2/5] Funding account via Friendbot: ${publicKey}`);
  const res = await fetch(`${FRIENDBOT}?addr=${publicKey}`);
  if (!res.ok) {
    const text = await res.text();
    // Already funded is OK
    if (text.includes('already')) {
      console.log('      Account already funded.');
      return;
    }
    throw new Error(`Friendbot failed: ${text}`);
  }
  console.log('      Funded successfully! 10,000 XLM on testnet.');
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  CashCore Smart Contract — Stellar Testnet Deploy');
  console.log('═══════════════════════════════════════════════\n');

  // ── Step 1: Load or generate deployer keypair ─────────────
  const keyFile = path.join(__dirname, 'deployer-keypair.json');
  let deployer;
  if (fs.existsSync(keyFile)) {
    const saved = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    deployer = Keypair.fromSecret(saved.secret);
    console.log(`[1/5] Loaded existing deployer keypair.`);
  } else {
    deployer = Keypair.random();
    fs.writeFileSync(keyFile, JSON.stringify({
      publicKey: deployer.publicKey(),
      secret: deployer.secret(),
    }, null, 2));
    console.log(`[1/5] Generated new deployer keypair.`);
  }
  console.log(`      Public Key : ${deployer.publicKey()}`);
  console.log(`      Secret Key : ${deployer.secret()}\n`);
  console.log('      ⚠️  Save deployer-keypair.json — this is your admin wallet!');

  // ── Step 2: Fund via Friendbot ────────────────────────────
  await fundAccount(deployer.publicKey());
  await sleep(3000); // wait for ledger confirmation

  // ── Step 3: Build WASM path ───────────────────────────────
  const wasmPath = path.join(
    __dirname, '..', 'cashcore-contract', 'target',
    'wasm32-unknown-unknown', 'release', 'cashcore_contract.wasm'
  );

  if (!fs.existsSync(wasmPath)) {
    console.log('\n[3/5] ❌ WASM file not found at:');
    console.log(`      ${wasmPath}`);
    console.log('\n      Build it first with:');
    console.log('      cd cashcore-contract');
    console.log('      cargo build --target wasm32-unknown-unknown --release');
    console.log('\n      Then re-run this script.');
    process.exit(1);
  }

  const wasmBytes = fs.readFileSync(wasmPath);
  console.log(`\n[3/5] Loaded WASM: ${wasmBytes.length} bytes`);

  // ── Step 4: Upload WASM + Deploy ─────────────────────────
  const server = new Server(TESTNET_RPC);
  const account = await server.getAccount(deployer.publicKey());

  console.log('\n[4/5] Uploading contract WASM to Stellar Testnet...');

  // Upload WASM
  const uploadTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(300)
    .build();

  const simUpload = await server.simulateTransaction(uploadTx);
  if (Api.isSimulationError(simUpload)) {
    throw new Error(`Upload simulation failed: ${simUpload.error}`);
  }

  const preparedUpload = assembleTransaction(uploadTx, simUpload).build();
  preparedUpload.sign(deployer);
  const uploadResult = await server.sendTransaction(preparedUpload);
  console.log(`      Upload TX: ${uploadResult.hash}`);

  // Wait for upload confirmation
  let uploadConfirm;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    uploadConfirm = await server.getTransaction(uploadResult.hash);
    if (uploadConfirm.status !== 'NOT_FOUND') break;
  }
  if (uploadConfirm.status !== 'SUCCESS') {
    throw new Error(`Upload TX failed: ${JSON.stringify(uploadConfirm)}`);
  }

  // Get WASM hash from result
  const wasmHashResult = uploadConfirm.returnValue;
  const wasmHash = wasmHashResult.bytes();
  console.log(`      WASM Hash: ${Buffer.from(wasmHash).toString('hex')}`);

  // Create contract instance
  console.log('\n      Creating contract instance...');
  const freshAccount = await server.getAccount(deployer.publicKey());
  const createTx = new TransactionBuilder(freshAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.createCustomContract({
      address: new Address(deployer.publicKey()),
      wasmHash,
    }))
    .setTimeout(300)
    .build();

  const simCreate = await server.simulateTransaction(createTx);
  if (Api.isSimulationError(simCreate)) {
    throw new Error(`Create simulation failed: ${simCreate.error}`);
  }

  const preparedCreate = assembleTransaction(createTx, simCreate).build();
  preparedCreate.sign(deployer);
  const createResult = await server.sendTransaction(preparedCreate);
  console.log(`      Create TX: ${createResult.hash}`);

  // Wait for create confirmation
  let createConfirm;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    createConfirm = await server.getTransaction(createResult.hash);
    if (createConfirm.status !== 'NOT_FOUND') break;
  }
  if (createConfirm.status !== 'SUCCESS') {
    throw new Error(`Create TX failed: ${JSON.stringify(createConfirm)}`);
  }

  // Extract contract ID from result
  const contractIdBytes = createConfirm.returnValue.address().contractId();
  const contractId = Address.contract(contractIdBytes).toString();
  console.log(`\n✅ Contract deployed at: ${contractId}`);

  // ── Step 5: Update .env ──────────────────────────────────
  console.log('\n[5/5] Updating cashcore-api/.env with contract ID...');
  const envPath = path.join(__dirname, '..', 'cashcore-api', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /^CONTRACT_ID=.*/m,
    `CONTRACT_ID=${contractId}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log(`      ✅ CONTRACT_ID updated in cashcore-api/.env`);

  // Also save deployment info
  const deployInfo = {
    contractId,
    adminPublicKey: deployer.publicKey(),
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`,
  };
  fs.writeFileSync(
    path.join(__dirname, 'deployment-info.json'),
    JSON.stringify(deployInfo, null, 2)
  );

  console.log('\n═══════════════════════════════════════════════');
  console.log('  🚀 DEPLOYMENT COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Contract ID  : ${contractId}`);
  console.log(`  Admin Wallet : ${deployer.publicKey()}`);
  console.log(`  Explorer     : ${deployInfo.explorerUrl}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
