'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCashCoreStore } from '@/store';
import { walletApi } from '@/lib/api';
import styles from './connect.module.css';

const CONTRACT_ID = 'CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4';

// Detect if running on a mobile/touch device
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

// Build the Freighter deep link to open your app inside the Freighter in-app browser
function getFreighterDeepLink(): string {
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://cash-core-git-main-debjanimandal556-gmailcoms-projects.vercel.app';
  // Freighter mobile opens a URL in its built-in dApp browser
  return `freighter://open?url=${encodeURIComponent(appUrl)}`;
}

export default function ConnectWalletPage() {
  const router = useRouter();
  const { token, setWallet, user, setUser, addToast } = useCashCoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // On desktop: check if Freighter extension is installed
  useEffect(() => {
    if (mobile) return; // skip extension check on mobile
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
  }, [mobile]);

  // Desktop: connect via Freighter extension
  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      const { isConnected, requestAccess, getNetwork, getAddress } = await import('@stellar/freighter-api');

      const connected = await isConnected();
      if (!connected.isConnected) {
        throw new Error('Freighter wallet not found. Please install the extension first.');
      }

      const accessResult = await requestAccess();
      if (accessResult.error) throw new Error(accessResult.error);

      const networkResult = await getNetwork();
      if (networkResult.error) throw new Error(networkResult.error);
      if (!networkResult.network?.includes('TESTNET') && !networkResult.networkPassphrase?.includes('Test')) {
        throw new Error('Please switch Freighter to Testnet.\nOpen Freighter → Settings → Network → Test SDF Network.');
      }

      const addressResult = await getAddress();
      if (addressResult.error) throw new Error(addressResult.error);
      const stellarAddress = addressResult.address;
      if (!stellarAddress) throw new Error('Could not get wallet address from Freighter.');

      let balance = '0';
      try {
        const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${stellarAddress}`);
        if (horizonRes.ok) {
          const account = await horizonRes.json();
          const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');
          balance = xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0';
        }
      } catch { balance = '0'; }

      if (token) {
        try {
          await walletApi.connect({ address: stellarAddress, signature: 'freighter-auth', public_key: stellarAddress }, token);
        } catch { /* non-fatal */ }
      }

      setWallet({ address: stellarAddress, connected: true, balance, network: 'Stellar Testnet' });
      if (user) setUser({ ...user, walletAddress: stellarAddress });

      addToast(`Freighter connected! ${stellarAddress.slice(0, 8)}...`, 'success');
      router.push('/dashboard');

    } catch (e: any) {
      const msg = e.message || 'Could not connect wallet.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mobile: open Freighter app via deep link
  const handleMobileOpen = () => {
    setDeepLinkAttempted(true);
    const deepLink = getFreighterDeepLink();
    window.location.href = deepLink;
  };

  // ─── MOBILE UI ────────────────────────────────────────────────────────────
  if (mobile) {
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

          <h1 className={styles.title}>Connect on Mobile</h1>
          <p className={styles.desc}>
            Open CashCore inside the <strong>Freighter mobile app</strong> to connect your Stellar wallet — no extension needed.
          </p>

          <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

          {/* Step guide */}
          <div className={styles.mobileSteps}>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>1</span>
              <span>Tap <strong>&quot;Open in Freighter App&quot;</strong> below</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>2</span>
              <span>The Freighter app will open with CashCore loaded inside its browser</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>3</span>
              <span>Tap <strong>&quot;Connect Wallet&quot;</strong> inside the app to approve</span>
            </div>
          </div>

          {/* Deep link button */}
          <button className={styles.deepLinkBtn} onClick={handleMobileOpen} id="mobile-open-freighter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in Freighter App
          </button>

          {/* If deep link was attempted, show fallback */}
          {deepLinkAttempted && (
            <div className={styles.installBanner}>
              <span>📱</span>
              <div>
                <strong>Don&apos;t have Freighter yet?</strong>
                <p>Download the free Freighter wallet app first:</p>
                <div className={styles.appStoreRow}>
                  <a
                    href="https://apps.apple.com/app/freighter-wallet/id1641666701"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.storeBtn}
                    id="download-ios"
                  >
                    🍎 App Store (iOS)
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=io.lobstr.freighter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.storeBtn}
                    id="download-android"
                  >
                    🤖 Play Store (Android)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Show download links upfront too */}
          {!deepLinkAttempted && (
            <div className={styles.faq}>
              <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
                Don&apos;t have Freighter app?
                <span>{expanded ? '↑' : '↓'}</span>
              </button>
              {expanded && (
                <div className={styles.faqContent}>
                  <p>Download the Freighter mobile wallet:</p>
                  <div className={styles.appStoreRow}>
                    <a href="https://apps.apple.com/app/freighter-wallet/id1641666701" target="_blank" rel="noopener noreferrer" className={styles.storeBtn}>
                      🍎 App Store (iOS)
                    </a>
                    <a href="https://play.google.com/store/apps/details?id=io.lobstr.freighter" target="_blank" rel="noopener noreferrer" className={styles.storeBtn}>
                      🤖 Play Store (Android)
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ─── DESKTOP UI ───────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.content}>
        <div className={styles.walletIcon}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="url(#wGrad2)" />
            <rect x="12" y="20" width="40" height="26" rx="4" stroke="white" strokeWidth="2.5" />
            <path d="M12 28h40" stroke="white" strokeWidth="2.5" />
            <circle cx="44" cy="36" r="3" fill="white" />
            <defs>
              <linearGradient id="wGrad2" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Connect Freighter Wallet</h1>
        <p className={styles.desc}>
          Connect your Freighter browser extension to access your testnet XLM balance, send transfers, and generate your QR code.
        </p>

        <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

        {freighterInstalled === false && (
          <div className={styles.installBanner}>
            <span>⚠️</span>
            <div>
              <strong>Freighter not detected</strong>
              <p>
                Install the{' '}
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className={styles.installLink}>
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

        <div className={styles.contractInfo}>
          <span className={styles.contractLabel}>Smart Contract</span>
          <span className={styles.contractId}>{CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-6)}</span>
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer" className={styles.contractLink}>
            View on Explorer ↗
          </a>
        </div>

        <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>
          Skip for now
        </button>

        <div className={styles.faq}>
          <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
            What is Freighter Wallet?
            <span>{expanded ? '↑' : '↓'}</span>
          </button>
          {expanded && (
            <div className={styles.faqContent}>
              <p>
                Freighter is the official Stellar blockchain browser extension wallet — like MetaMask but for Stellar.
                CashCore uses it to connect to your Stellar Testnet account.
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
