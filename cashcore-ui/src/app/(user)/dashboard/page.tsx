'use client';

import { useEffect, useState } from 'react';
import { useCashCoreStore } from '@/store';
import TopBar from '@/components/layout/TopBar';
import QrScannerModal from '@/components/ui/QrScannerModal';
import styles from './dashboard.module.css';

const HORIZON = 'https://horizon-testnet.stellar.org';

const QUICK_ACTIONS = [
  { id: 'send',    label: 'Send',    href: '/send',     icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ), action: null },
  { id: 'receive', label: 'Receive', href: '/wallet',   icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ), action: null },
  { id: 'scan',    label: 'Scan QR', href: null,        icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M10 10v4" />
      <path d="M14 10h4" />
    </svg>
  ), action: 'scan' },
  { id: 'history', label: 'History', href: '/activity', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  ), action: null },
];

interface RecentTx {
  hash: string;
  counterparty: string;
  amount: string;
  token: string;
  direction: 'in' | 'out';
  dateStr: string;
  timeAgo: string;
  type: string;
}

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getTxDisplayInfo(tx: RecentTx) {
  // Add some visual variety based on type for the mockup feel
  if (tx.type === 'create_account') {
    return {
      title: 'Stellar Network',
      subtitle: 'Account Initialization',
      iconClass: styles.txIconBg2,
      iconChar: 'S',
      status: 'Completed',
    };
  }
  return {
    title: `Transfer to ${truncate(tx.counterparty)}`,
    subtitle: tx.counterparty,
    iconClass: styles.txIconBg3,
    iconChar: '⇄',
    status: 'Completed', // Real testnet txs we fetch are always completed
  };
}

export default function DashboardPage() {
  const wallet = useCashCoreStore((s) => s.wallet);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    const address = wallet.address;
    if (!address) return;

    setTxLoading(true);
    fetch(`${HORIZON}/accounts/${address}/payments?limit=5&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const records = data._embedded?.records ?? [];
        const parsed: RecentTx[] = records
          .filter((p: any) => p.type === 'payment' || p.type === 'create_account')
          .map((p: any) => {
            const isIn = p.type === 'create_account'
              ? p.account === address
              : p.to === address;
            const amount = p.type === 'create_account' ? p.starting_balance : p.amount;
            const from   = p.type === 'create_account' ? p.funder : p.from;
            const to     = p.type === 'create_account' ? p.account : p.to;
            const asset  = p.asset_type === 'native' ? 'XLM' : (p.asset_code ?? 'TOKEN');
            
            const date = new Date(p.created_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
              hash: p.transaction_hash,
              counterparty: isIn ? from : to,
              amount: `${isIn ? '+' : '-'}${parseFloat(amount).toFixed(4)}`,
              token: asset,
              direction: isIn ? 'in' : 'out',
              dateStr,
              type: p.type,
            } as RecentTx;
          });
        setRecentTxs(parsed);
      })
      .catch(() => setRecentTxs([]))
      .finally(() => setTxLoading(false));
  }, [wallet.address]);

  return (
    <>
      <div className={styles.page}>
        <TopBar showGreeting />

        <main className={styles.main}>
          {/* Balance Card */}
          <div className={styles.balanceCard}>
            <div className={styles.balanceTop}>
              <div className={styles.balanceAmount}>
                {wallet.connected ? wallet.balance : '—'}
                <span className={styles.balanceToken}>XLM</span>
              </div>
              <span className={styles.balancePill}>Total XLM Balance</span>
            </div>
            
            <p className={styles.balanceUsd}>
              ~${wallet.connected ? (parseFloat(wallet.balance) * 0.112).toFixed(2) : '0.00'} USD
            </p>

            {!wallet.connected && (
              <a href="/connect-wallet" className={styles.connectPrompt}>
                Connect Freighter Wallet →
              </a>
            )}
          </div>

          {/* Quick Actions */}
          <section aria-label="Quick actions">
            <h3 className={styles.quickHeader}>Quick Action</h3>
            <div className={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) =>
                action.action === 'scan' ? (
                  <button
                    key={action.id}
                    className={styles.quickAction}
                    onClick={() => setScannerOpen(true)}
                    type="button"
                  >
                    <span className={styles.quickIcon}>{action.icon}</span>
                    <span className={styles.quickLabel}>{action.label}</span>
                  </button>
                ) : (
                  <a key={action.id} href={action.href!} className={styles.quickAction}>
                    <span className={styles.quickIcon}>{action.icon}</span>
                    <span className={styles.quickLabel}>{action.label}</span>
                  </a>
                )
              )}
            </div>
          </section>

          {/* Recent Transactions */}
          <section>
            <h3 className={styles.quickHeader}>Recent Transactions</h3>

            <div className={styles.txList}>
              <div className={styles.txTableHeader}>
                <span>Date</span>
                <span>Description</span>
                <span>Status</span>
                <span>Amount</span>
              </div>

              {!wallet.address && (
                <div className={styles.txEmpty}>
                  <span>Connect your wallet to see transactions</span>
                </div>
              )}

              {wallet.address && txLoading && (
                <div className={styles.txEmpty}>
                  <div className={styles.txSpinner} />
                  <span>Loading transactions…</span>
                </div>
              )}

              {wallet.address && !txLoading && recentTxs.length === 0 && (
                <div className={styles.txEmpty}>
                  <span>No transactions yet on Stellar Testnet</span>
                </div>
              )}

              {recentTxs.map((tx) => {
                const info = getTxDisplayInfo(tx);
                return (
                  <a
                    key={tx.hash}
                    href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.txRow}
                  >
                    <div className={styles.txDate}>{tx.dateStr}</div>
                    
                    <div className={styles.txEntity}>
                      <div className={[styles.txIcon, info.iconClass].join(' ')}>
                        {info.iconChar}
                      </div>
                      <div className={styles.txDescWrap}>
                        <span className={styles.txAddress}>{info.title}</span>
                        <span className={styles.txSub}>{info.subtitle}</span>
                      </div>
                    </div>

                    <div className={styles.txStatusWrap}>
                      <span className={[styles.statusPill, styles.statusSuccess].join(' ')}>
                        {info.status}
                      </span>
                    </div>

                    <div className={styles.txRight}>
                      <span className={[styles.txAmount, tx.direction === 'in' ? styles.amountIn : styles.amountOut].join(' ')}>
                        {tx.amount} XLM
                      </span>
                      <span className={styles.txAmountUsd}>
                        {tx.direction === 'in' ? '+' : '-'}{(Math.abs(parseFloat(tx.amount)) * 0.112).toFixed(2)} USD
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
