'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCashCoreStore } from '@/store';
import { walletApi } from '@/lib/api';
import styles from './connect.module.css';

const CONTRACT_ID = 'CBRWTAYYKPTOCGPEGVYUICYNEJF27FEHTW3OFOERBQXVAWDHIWWIVUT4';

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export default function ConnectWalletPage() {
  const router = useRouter();
  const { token, setWallet, user, setUser, addToast } = useCashCoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  // mobile states: 'idle' | 'waiting' | 'timedout' | 'inFreighter'
  const [mobileState, setMobileState] = useState<'idle' | 'waiting' | 'timedout' | 'inFreighter'>('idle');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : 'https://cash-core-git-main-debjanimandal556-gmailcoms-projects.vercel.app/connect-wallet';

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // ── Core connect logic ────────────────────────────────────────────────────
  const doConnect = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { isConnected, requestAccess, getNetwork, getAddress } = await import('@stellar/freighter-api');

      const connected = await isConnected();
      if (!connected.isConnected) {
        throw new Error('Freighter not detected. Make sure you opened this page from inside the Freighter app browser.');
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

      addToast(`Wallet connected! ${stellarAddress.slice(0, 8)}...`, 'success');
      router.push('/dashboard');
    } catch (e: any) {
      const msg = e.message || 'Could not connect wallet.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user, setWallet, setUser, addToast, router]);

  // ── Desktop: check extension ──────────────────────────────────────────────
  useEffect(() => {
    if (mobile) return;
    const check = async () => {
      try {
        const { isConnected } = await import('@stellar/freighter-api');
        const r = await isConnected();
        setFreighterInstalled(r.isConnected || false);
      } catch { setFreighterInstalled(false); }
    };
    check();
  }, [mobile]);

  // ── Mobile: check if already inside Freighter browser on load ────────────
  useEffect(() => {
    if (!mobile) return;
    const checkNow = async () => {
      try {
        const { isConnected } = await import('@stellar/freighter-api');
        const r = await isConnected();
        if (r.isConnected) setMobileState('inFreighter');
      } catch { /* not in Freighter */ }
    };
    checkNow();
  }, [mobile]);

  // ── Stop all polling ──────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  // ── Start polling after user taps deep link ───────────────────────────────
  const startPolling = useCallback(() => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { isConnected } = await import('@stellar/freighter-api');
        const r = await isConnected();
        if (r.isConnected) {
          stopPolling();
          setMobileState('inFreighter');
        }
      } catch { /* keep polling */ }
    }, 2000);

    // After 20 seconds, give up and reset to idle so user can try again
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setMobileState('timedout');
    }, 20000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Handle "Open in Freighter App" tap ───────────────────────────────────
  const handleMobileOpen = () => {
    setMobileState('waiting');
    setError('');
    // Deep link — open CashCore inside Freighter's browser
    const deepLink = `freighter://open?url=${encodeURIComponent(appUrl)}`;
    window.location.href = deepLink;
    // Start polling in case user navigates back
    startPolling();
  };

  const handleReset = () => {
    stopPolling();
    setMobileState('idle');
    setError('');
  };

  // ── INSIDE FREIGHTER BROWSER — show connect button ───────────────────────
  if (mobile && mobileState === 'inFreighter') {
    return (
      <div className={styles.page}>
        <div className={styles.bgGlow} />
        <div className={styles.content}>
          <div className={styles.walletIcon}>
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="16" fill="url(#wGradM)" />
              <rect x="12" y="20" width="40" height="26" rx="4" stroke="white" strokeWidth="2.5" />
              <path d="M12 28h40" stroke="white" strokeWidth="2.5" />
              <circle cx="44" cy="36" r="3" fill="white" />
              <defs><linearGradient id="wGradM" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" /></linearGradient></defs>
            </svg>
          </div>
          <div className={styles.freighterDetectedBadge}>✅ Freighter Detected</div>
          <h1 className={styles.title}>Wallet Ready to Connect</h1>
          <p className={styles.desc}>Your Freighter wallet is available. Tap below to connect it to CashCore.</p>
          <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>
          {error && <p className={styles.error} style={{ whiteSpace: 'pre-line' }}>{error}</p>}
          <Button variant="primary" size="lg" fullWidth loading={loading} onClick={doConnect} id="mobile-connect-btn">
            {loading ? 'Connecting…' : 'Connect My Wallet'}
          </Button>
          <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>Skip for now</button>
        </div>
      </div>
    );
  }

  // ── MOBILE IDLE / TIMED OUT ───────────────────────────────────────────────
  if (mobile) {
    return (
      <div className={styles.page}>
        <div className={styles.bgGlow} />
        <div className={styles.content}>

          <div className={styles.walletIcon}>
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="16" fill="url(#wGradM2)" />
              <rect x="12" y="20" width="40" height="26" rx="4" stroke="white" strokeWidth="2.5" />
              <path d="M12 28h40" stroke="white" strokeWidth="2.5" />
              <circle cx="44" cy="36" r="3" fill="white" />
              <defs><linearGradient id="wGradM2" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" /></linearGradient></defs>
            </svg>
          </div>

          <h1 className={styles.title}>Connect on Mobile</h1>
          <p className={styles.desc}>
            Open CashCore <strong>from inside the Freighter app browser</strong> to connect your Stellar wallet.
          </p>

          <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

          {/* Timed out warning */}
          {mobileState === 'timedout' && (
            <div className={styles.timedOutBanner}>
              <span>⚠️</span>
              <div>
                <strong>Freighter not detected</strong>
                <p>Make sure you open this page <strong>from inside</strong> the Freighter app — tap the browser icon inside the Freighter app and navigate to this URL.</p>
              </div>
            </div>
          )}

          <div className={styles.mobileSteps}>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>1</span>
              <span>Open the <strong>Freighter app</strong> on your phone</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>2</span>
              <span>Tap the <strong>browser/dApps icon</strong> inside Freighter</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>3</span>
              <span>Navigate to this URL and connect your wallet</span>
            </div>
          </div>

          {/* URL to copy */}
          <div className={styles.urlBox}>
            <p className={styles.urlLabel}>Copy this URL and paste it in Freighter&apos;s browser:</p>
            <div className={styles.urlRow}>
              <code className={styles.urlCode}>{appUrl}</code>
              <button
                className={styles.copyBtn}
                id="copy-url-btn"
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  addToast('URL copied!', 'success');
                }}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Deep link attempt */}
          {mobileState === 'idle' && (
            <button className={styles.deepLinkBtn} onClick={handleMobileOpen} id="mobile-open-freighter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Try Opening Freighter App
            </button>
          )}

          {mobileState === 'waiting' && (
            <div className={styles.waitingRow}>
              <span className={styles.spinnerSmall} />
              <span className={styles.waitingText}>Waiting for Freighter browser… (20s)</span>
              <button className={styles.cancelBtn} onClick={handleReset}>Cancel</button>
            </div>
          )}

          {mobileState === 'timedout' && (
            <button className={styles.deepLinkBtn} onClick={handleMobileOpen} id="retry-freighter">
              Try Again
            </button>
          )}

          {/* Download links */}
          <div className={styles.faq}>
            <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
              Don&apos;t have the Freighter app?
              <span>{expanded ? '↑' : '↓'}</span>
            </button>
            {expanded && (
              <div className={styles.faqContent}>
                <p>Download the free Freighter mobile wallet:</p>
                <div className={styles.appStoreRow}>
                  <a href="https://play.google.com/store/apps/details?id=org.stellar.freighterwallet" target="_blank" rel="noopener noreferrer" className={styles.storeBtn}>
                    🤖 Play Store (Android)
                  </a>
                  <a href="https://apps.apple.com/app/freighter/id1641666701" target="_blank" rel="noopener noreferrer" className={styles.storeBtn}>
                    🍎 App Store (iOS)
                  </a>
                </div>
              </div>
            )}
          </div>

          <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>Skip for now</button>
        </div>
      </div>
    );
  }

  // ── DESKTOP UI ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.content}>
        <div className={styles.walletIcon}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="url(#wGradD)" />
            <rect x="12" y="20" width="40" height="26" rx="4" stroke="white" strokeWidth="2.5" />
            <path d="M12 28h40" stroke="white" strokeWidth="2.5" />
            <circle cx="44" cy="36" r="3" fill="white" />
            <defs><linearGradient id="wGradD" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" /></linearGradient></defs>
          </svg>
        </div>

        <h1 className={styles.title}>Connect Freighter Wallet</h1>
        <p className={styles.desc}>Connect your Freighter browser extension to access your testnet XLM balance, send transfers, and generate your QR code.</p>

        <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

        {freighterInstalled === false && (
          <div className={styles.installBanner}>
            <span>⚠️</span>
            <div>
              <strong>Freighter not detected</strong>
              <p>Install the{' '}<a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className={styles.installLink}>Freighter browser extension</a>{' '}then refresh this page.</p>
            </div>
          </div>
        )}

        {error && <p className={styles.error} style={{ whiteSpace: 'pre-line' }}>{error}</p>}

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={doConnect} id="connect-wallet-btn" disabled={freighterInstalled === false}>
          {loading ? 'Connecting to Freighter…' : 'Connect Freighter Wallet'}
        </Button>

        <div className={styles.contractInfo}>
          <span className={styles.contractLabel}>Smart Contract</span>
          <span className={styles.contractId}>{CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-6)}</span>
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer" className={styles.contractLink}>View on Explorer ↗</a>
        </div>

        <button className={styles.skipBtn} onClick={() => router.push('/dashboard')}>Skip for now</button>

        <div className={styles.faq}>
          <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
            What is Freighter Wallet? <span>{expanded ? '↑' : '↓'}</span>
          </button>
          {expanded && (
            <div className={styles.faqContent}>
              <p>Freighter is the official Stellar blockchain browser extension wallet. CashCore uses it to connect to your Stellar Testnet account. No real money is involved.</p>
              <p style={{ marginTop: '8px' }}>Don&apos;t have Freighter?{' '}<a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className={styles.installLink}>Install it free at freighter.app</a></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
