/**
 * Initialize already-deployed CashCore contract with user's Freighter wallet as admin
 */
const stellar = require('@stellar/stellar-sdk');
const { Keypair, TransactionBuilder, BASE_FEE, Networks, Operation, Address } = stellar;
const { Server, assembleTransaction, Api } = stellar.rpc;
const fs = require('fs');
const path = require('path');

const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const CONTRACT_ID = 'CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4';
const YOUR_ADMIN  = 'GDA2HEX7INDEPKI43OHLXRKHH4FMCS4RBEAAEKFHS2OIRUQYFT3IBCRC';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTx(server, hash, label) {
  process.stdout.write(`      Waiting for ${label} TX: ${hash} `);
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const result = await server.getTransaction(hash);
    if (result.status === 'SUCCESS') { console.log('\n      ✅ Confirmed!'); return result; }
    if (result.status === 'FAILED')  { throw new Error(`TX failed: ${JSON.stringify(result)}`); }
    process.stdout.write('.');
  }
  throw new Error('TX timed out');
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  CashCore — Initialize Contract (set admin)');
  console.log('═══════════════════════════════════════════════\n');

  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployer-keypair.json'), 'utf8'));
  const deployer = Keypair.fromSecret(saved.secret);

  console.log(`  Contract : ${CONTRACT_ID}`);
  console.log(`  Admin    : ${YOUR_ADMIN}`);
  console.log(`  Deployer : ${deployer.publicKey()}\n`);

  const server = new Server(TESTNET_RPC);
  const account = await server.getAccount(deployer.publicKey());

  const adminScVal = new Address(YOUR_ADMIN).toScVal();

  const initTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: 'initialize',
        args: [adminScVal],
      })
    )
    .setTimeout(300)
    .build();

  console.log('  Simulating...');
  const sim = await server.simulateTransaction(initTx);
  if (Api.isSimulationError(sim)) throw new Error(`Simulation failed: ${sim.error}`);

  const prepared = assembleTransaction(initTx, sim).build();
  prepared.sign(deployer);

  console.log('  Sending initialize transaction...');
  const sendResult = await server.sendTransaction(prepared);
  await waitForTx(server, sendResult.hash, 'Initialize');

  // Update .env and deployment-info
  const envPath = path.join(__dirname, '..', 'cashcore-api', '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  env = env.replace(/^CONTRACT_ID=.*/m, `CONTRACT_ID=${CONTRACT_ID}`);
  fs.writeFileSync(envPath, env);

  const info = {
    contractId: CONTRACT_ID,
    adminPublicKey: YOUR_ADMIN,
    deployerPublicKey: deployer.publicKey(),
    network: 'testnet',
    initializedAt: new Date().toISOString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
  };
  fs.writeFileSync(path.join(__dirname, 'deployment-info.json'), JSON.stringify(info, null, 2));

  console.log('\n═══════════════════════════════════════════════');
  console.log('  🚀 CONTRACT INITIALIZED — YOU ARE THE ADMIN!');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Contract ID : ${CONTRACT_ID}`);
  console.log(`  Admin (YOU) : ${YOUR_ADMIN}`);
  console.log(`  Explorer    : ${info.explorerUrl}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => { console.error('\n❌ Failed:', err.message); process.exit(1); });
