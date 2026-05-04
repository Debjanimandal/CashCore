/**
 * CashCore — Redeploy + Initialize with user's Freighter wallet as admin
 */

const stellar = require('@stellar/stellar-sdk');
const { Keypair, TransactionBuilder, BASE_FEE, Networks, Operation, Address, contract } = stellar;
const { Server, assembleTransaction, Api } = stellar.rpc;
const fs = require('fs');
const path = require('path');

const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const FRIENDBOT = 'https://friendbot.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

// ── YOUR Freighter wallet address ─────────────────────────────
const YOUR_ADMIN = 'GDA2HEX7INDEPKI43OHLXRKHH4FMCS4RBEAAEKFHS2OIRUQYFT3IBCRC';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTx(server, hash, label) {
  console.log(`      Waiting for ${label} TX: ${hash}`);
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const result = await server.getTransaction(hash);
    if (result.status === 'SUCCESS') {
      console.log(`      ✅ ${label} confirmed!`);
      return result;
    }
    if (result.status === 'FAILED') {
      throw new Error(`${label} TX failed: ${JSON.stringify(result)}`);
    }
    process.stdout.write('.');
  }
  throw new Error(`${label} TX timed out`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CashCore — Redeploy & Initialize (Your Wallet as Admin)');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Load deployer keypair ─────────────────────────────────
  const keyFile = path.join(__dirname, 'deployer-keypair.json');
  const saved = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  const deployer = Keypair.fromSecret(saved.secret);
  console.log(`[1/4] Deployer  : ${deployer.publicKey()}`);
  console.log(`[1/4] Your Admin: ${YOUR_ADMIN}\n`);

  // ── Load WASM ─────────────────────────────────────────────
  const wasmPath = path.join(__dirname, '..', 'cashcore-contract', 'target',
    'wasm32-unknown-unknown', 'release', 'cashcore_contract.wasm');

  if (!fs.existsSync(wasmPath)) {
    throw new Error('WASM not found — run: cargo build --target wasm32-unknown-unknown --release in cashcore-contract/');
  }
  const wasmBytes = fs.readFileSync(wasmPath);
  console.log(`[2/4] WASM loaded: ${wasmBytes.length} bytes\n`);

  const server = new Server(TESTNET_RPC);
  let account = await server.getAccount(deployer.publicKey());

  // ── Upload WASM ───────────────────────────────────────────
  console.log('[3/4] Uploading new WASM...');
  const uploadTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(300).build();

  const simUpload = await server.simulateTransaction(uploadTx);
  if (Api.isSimulationError(simUpload)) throw new Error(`Upload sim failed: ${simUpload.error}`);

  const preparedUpload = assembleTransaction(uploadTx, simUpload).build();
  preparedUpload.sign(deployer);
  const uploadResult = await server.sendTransaction(preparedUpload);
  const uploadConfirm = await waitForTx(server, uploadResult.hash, 'Upload');
  const wasmHash = uploadConfirm.returnValue.bytes();
  console.log(`      WASM Hash: ${Buffer.from(wasmHash).toString('hex')}\n`);

  // ── Create contract instance ──────────────────────────────
  console.log('      Creating contract instance...');
  account = await server.getAccount(deployer.publicKey());
  const createTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createCustomContract({
      address: new Address(deployer.publicKey()),
      wasmHash,
    }))
    .setTimeout(300).build();

  const simCreate = await server.simulateTransaction(createTx);
  if (Api.isSimulationError(simCreate)) throw new Error(`Create sim failed: ${simCreate.error}`);

  const preparedCreate = assembleTransaction(createTx, simCreate).build();
  preparedCreate.sign(deployer);
  const createResult = await server.sendTransaction(preparedCreate);
  const createConfirm = await waitForTx(server, createResult.hash, 'Create');

  const contractIdBytes = createConfirm.returnValue.address().contractId();
  const contractId = Address.contract(contractIdBytes).toString();
  console.log(`\n      ✅ Contract: ${contractId}\n`);

  // ── Initialize with YOUR Freighter wallet as admin ────────
  console.log(`[4/4] Initializing contract with your wallet as admin...`);
  console.log(`      Admin → ${YOUR_ADMIN}`);

  account = await server.getAccount(deployer.publicKey());

  const adminScVal = new Address(YOUR_ADMIN).toScVal();

  const initTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: 'initialize',
        args: [adminScVal],
      })
    )
    .setTimeout(300).build();

  const simInit = await server.simulateTransaction(initTx);
  if (Api.isSimulationError(simInit)) throw new Error(`Init sim failed: ${simInit.error}`);

  const preparedInit = assembleTransaction(initTx, simInit).build();
  preparedInit.sign(deployer);
  const initResult = await server.sendTransaction(preparedInit);
  await waitForTx(server, initResult.hash, 'Initialize');

  // ── Save & update .env ────────────────────────────────────
  const envPath = path.join(__dirname, '..', 'cashcore-api', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/^CONTRACT_ID=.*/m, `CONTRACT_ID=${contractId}`);
  fs.writeFileSync(envPath, envContent);

  const deployInfo = {
    contractId,
    adminPublicKey: YOUR_ADMIN,
    deployerPublicKey: deployer.publicKey(),
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`,
  };
  fs.writeFileSync(path.join(__dirname, 'deployment-info.json'), JSON.stringify(deployInfo, null, 2));

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 DONE — Contract deployed & initialized!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Contract ID   : ${contractId}`);
  console.log(`  Admin (YOU)   : ${YOUR_ADMIN}`);
  console.log(`  Explorer      : ${deployInfo.explorerUrl}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
