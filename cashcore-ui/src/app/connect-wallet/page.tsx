'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCashCoreStore } from '@/store';
import { walletApi } from '@/lib/api';
import styles from './connect.module.css';

// Contract deployed on Stellar Testnet
const CONTRACT_ID = 'CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4';
const TESTNET_NETWORK = 'TESTNET';

export default function ConnectWalletPage() {
  const router = useRouter();
  const { token, setWallet, user, setUser, addToast } = useCashCoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Check if Freighter is installed on mount
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const { isConnected } = await import('@stellar/freighter-api');
        const result = await isConnected();
        setFreighterInstalled(result.isConnected || false);
      } catch {
        setFreighterInstalled(false);
      }
    };
    checkFreighter();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      const { isConnected, requestAccess, getNetwork, getAddress } = await import('@stellar/freighter-api');

      // 1. Check Freighter is installed
      const connected = await isConnected();
      if (!connected.isConnected) {
        throw new Error('Freighter wallet not found. Please install it first.');
      }

      // 2. Request user permission
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(accessResult.error);
      }

      // 3. Verify user is on testnet
      const networkResult = await getNetwork();
      if (networkResult.error) throw new Error(networkResult.error);
      if (!networkResult.network?.includes('TESTNET') && !networkResult.networkPassphrase?.includes('Test')) {
        setError('');
        throw new Error('Please switch Freighter to Testnet.\nOpen Freighter → Settings → Network → Test SDF Network.');
      }

      // 4. Get the user's Stellar public key
      const addressResult = await getAddress();
      if (addressResult.error) throw new Error(addressResult.error);
      const stellarAddress = addressResult.address;
      if (!stellarAddress) throw new Error('Could not get wallet address from Freighter.');

      // 5. Fetch testnet XLM balance from Stellar Horizon
      let balance = '0';
      try {
        const horizonRes = await fetch(
          `https://horizon-testnet.stellar.org/accounts/${stellarAddress}`
        );
        if (horizonRes.ok) {
          const account = await horizonRes.json();
          const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');
          balance = xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0';
        }
      } catch {
        balance = '0'; // balance fetch is non-critical
      }

      // 6. Register wallet with backend
      if (token) {
        try {
          await walletApi.connect({
            address: stellarAddress,
            signature: 'freighter-auth',
            public_key: stellarAddress,
          }, token);
        } catch {
          // Non-fatal — continue even if backend registration fails
        }
      }

      // 7. Update app state
      setWallet({
        address: stellarAddress,
        connected: true,
        balance,
        network: 'Stellar Testnet',
      });
      if (user) {
        setUser({ ...user, walletAddress: stellarAddress });
      }

      addToast(`Freighter connected! Address: ${stellarAddress.slice(0, 8)}...`, 'success');
      router.push('/dashboard');

    } catch (e: any) {
      const msg = e.message || 'Could not connect wallet.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.content}>
        {/* Icon */}
        <div className={styles.walletIcon}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="url(#wGrad)" />
            <rect x="12" y="20" width="40" height="26" rx="4" stroke="white" strokeWidth="2.5" />
            <path d="M12 28h40" stroke="white" strokeWidth="2.5" />
            <circle cx="44" cy="36" r="3" fill="white" />
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Connect Freighter Wallet</h1>
        <p className={styles.desc}>
          Connect your Freighter Wallet to access your testnet XLM balance, send transfers, and generate your QR code.
        </p>

        <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

        {/* Freighter not installed warning */}
        {freighterInstalled === false && (
          <div className={styles.installBanner}>
            <span>⚠️</span>
            <div>
              <strong>Freighter not detected</strong>
              <p>
                Install the{' '}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.installLink}
                >
                  Freighter browser extension
                </a>
                {' '}then refresh this page.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className={styles.error} style={{ whiteSpace: 'pre-line' }}>{error}</p>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onClick={handleConnect}
          id="connect-wallet-btn"
          disabled={freighterInstalled === false}
        >
          {loading ? 'Connecting to Freighter…' : 'Connect Freighter Wallet'}
        </Button>

        {/* Contract info */}
        <div className={styles.contractInfo}>
          <span className={styles.contractLabel}>Smart Contract</span>
          <span className={styles.contractId}>
            {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-6)}
          </span>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
          >
            View on Explorer ↗
          </a>
        </div>

        <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>
          Skip for now
        </button>

        {/* FAQ */}
        <div className={styles.faq}>
          <button className={styles.faqToggle} onClick={() => setExpanded((v) => !v)} id="faq-toggle">
            What is Freighter Wallet?
            <span>{expanded ? '↑' : '↓'}</span>
          </button>
          {expanded && (
            <div className={styles.faqContent}>
              <p>
                Freighter is the official Stellar blockchain browser extension wallet — like MetaMask but for Stellar.
                CashCore uses it to connect to your Stellar Testnet account for sending and receiving XLM.
                No real money is involved — all activity is on Stellar Testnet only.
              </p>
              <p style={{ marginTop: '8px' }}>
                Don&apos;t have Freighter?{' '}
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className={styles.installLink}>
                  Install it free at freighter.app
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
