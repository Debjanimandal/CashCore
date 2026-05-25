'use client';

import { useState, useEffect, useCallback } from 'react';
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

function getFreighterDeepLink(): string {
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin + '/connect-wallet'
      : 'https://cash-core-git-main-debjanimandal556-gmailcoms-projects.vercel.app/connect-wallet';
  return `freighter://open?url=${encodeURIComponent(appUrl)}`;
}

export default function ConnectWalletPage() {
  const router = useRouter();
  const { token, setWallet, user, setUser, addToast } = useCashCoreStore();
  const [loading, setLoading] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);
  const [freighterAvailableOnMobile, setFreighterAvailableOnMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // ── Core connect logic (shared by both desktop and mobile auto-connect) ──
  const doConnect = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setAutoConnecting(true);
    setError('');

    try {
      const { isConnected, requestAccess, getNetwork, getAddress } = await import('@stellar/freighter-api');

      const connected = await isConnected();
      if (!connected.isConnected) {
        if (!silent) throw new Error('Freighter wallet not found. Please install the extension first.');
        return false;
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
      return true;
    } catch (e: any) {
      const msg = e.message || 'Could not connect wallet.';
      if (!silent) { setError(msg); addToast(msg, 'error'); }
      return false;
    } finally {
      setLoading(false);
      setAutoConnecting(false);
    }
  }, [token, user, setWallet, setUser, addToast, router]);

  // ── Desktop: check if extension is installed ──
  useEffect(() => {
    if (mobile) return;
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

  // ── Mobile: check if Freighter is available (user is inside Freighter browser) ──
  const checkMobileFreighter = useCallback(async () => {
    try {
      const { isConnected } = await import('@stellar/freighter-api');
      const result = await isConnected();
      if (result.isConnected) {
        setFreighterAvailableOnMobile(true);
        // Auto-connect silently
        await doConnect(true);
      }
    } catch { /* not in Freighter browser */ }
  }, [doConnect]);

  useEffect(() => {
    if (!mobile) return;

    // Check immediately on load (user may already be in Freighter's browser)
    checkMobileFreighter();

    // Re-check when user comes back to this tab (e.g., after switching from Freighter app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkMobileFreighter();
      }
    };

    // Also poll every 2s for 30s after deep link attempt in case app takes time
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [mobile, checkMobileFreighter]);

  // ── Start polling after deep link is attempted ──
  useEffect(() => {
    if (!deepLinkAttempted || !mobile) return;

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { isConnected } = await import('@stellar/freighter-api');
        const result = await isConnected();
        if (result.isConnected) {
          clearInterval(interval);
          setFreighterAvailableOnMobile(true);
          await doConnect(true);
        }
      } catch { /* keep polling */ }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [deepLinkAttempted, mobile, doConnect]);

  const handleMobileOpen = () => {
    setDeepLinkAttempted(true);
    window.location.href = getFreighterDeepLink();
  };

  // ── AUTO-CONNECTING STATE (mobile, detected Freighter) ──────────────────
  if (mobile && (autoConnecting || freighterAvailableOnMobile)) {
    return (
      <div className={styles.page}>
        <div className={styles.bgGlow} />
        <div className={styles.content}>
          <div className={styles.autoConnectWrap}>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Connecting Wallet…</h1>
            <p className={styles.desc}>Freighter detected! Connecting your Stellar wallet automatically.</p>
            <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>
          </div>
        </div>
      </div>
    );
  }

  // ── MOBILE UI ─────────────────────────────────────────────────────────────
  if (mobile) {
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
              <defs>
                <linearGradient id="wGradM" x1="0" y1="0" x2="64" y2="64">
                  <stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className={styles.title}>Connect on Mobile</h1>
          <p className={styles.desc}>
            Open CashCore inside the <strong>Freighter mobile app</strong> — your wallet connects automatically.
          </p>

          <Badge variant="testnet" dot>Stellar Testnet · No Real Funds</Badge>

          <div className={styles.mobileSteps}>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>1</span>
              <span>Tap <strong>&quot;Open in Freighter App&quot;</strong> below</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>2</span>
              <span>CashCore loads inside Freighter&apos;s built-in browser</span>
            </div>
            <div className={styles.mobileStep}>
              <span className={styles.mobileStepNum}>3</span>
              <span>Your wallet connects <strong>automatically</strong> — no extra steps!</span>
            </div>
          </div>

          <button
            className={styles.deepLinkBtn}
            onClick={handleMobileOpen}
            id="mobile-open-freighter"
            disabled={deepLinkAttempted}
          >
            {deepLinkAttempted ? (
              <>
                <span className={styles.spinnerSmall} />
                Waiting for Freighter…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in Freighter App
              </>
            )}
          </button>

          {deepLinkAttempted && (
            <div className={styles.installBanner}>
              <span>📱</span>
              <div>
                <strong>App didn&apos;t open? Download Freighter first:</strong>
                <div className={styles.appStoreRow}>
                  <a
                    href="https://play.google.com/store/apps/details?id=org.stellar.freighterwallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.storeBtn}
                    id="download-android"
                  >
                    🤖 Play Store
                  </a>
                  <a
                    href="https://apps.apple.com/app/freighter/id1641666701"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.storeBtn}
                    id="download-ios"
                  >
                    🍎 App Store
                  </a>
                </div>
              </div>
            </div>
          )}

          {!deepLinkAttempted && (
            <div className={styles.faq}>
              <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
                Don&apos;t have the Freighter app?
                <span>{expanded ? '↑' : '↓'}</span>
              </button>
              {expanded && (
                <div className={styles.faqContent}>
                  <p>Download the free Freighter mobile wallet:</p>
                  <div className={styles.appStoreRow}>
                    <a
                      href="https://play.google.com/store/apps/details?id=org.stellar.freighterwallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.storeBtn}
                    >
                      🤖 Play Store (Android)
                    </a>
                    <a
                      href="https://apps.apple.com/app/freighter/id1641666701"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.storeBtn}
                    >
                      🍎 App Store (iOS)
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
            <defs>
              <linearGradient id="wGradD" x1="0" y1="0" x2="64" y2="64">
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
          onClick={() => doConnect(false)}
          id="connect-wallet-btn"
          disabled={freighterInstalled === false}
        >
          {loading ? 'Connecting to Freighter…' : 'Connect Freighter Wallet'}
        </Button>

        <div className={styles.contractInfo}>
          <span className={styles.contractLabel}>Smart Contract</span>
          <span className={styles.contractId}>{CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-6)}</span>
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

        <div className={styles.faq}>
          <button className={styles.faqToggle} onClick={() => setExpanded(v => !v)} id="faq-toggle">
            What is Freighter Wallet?
            <span>{expanded ? '↑' : '↓'}</span>
          </button>
          {expanded && (
            <div className={styles.faqContent}>
              <p>
                Freighter is the official Stellar blockchain browser extension wallet.
                CashCore uses it to connect to your Stellar Testnet account for sending and receiving XLM.
                No real money is involved.
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
