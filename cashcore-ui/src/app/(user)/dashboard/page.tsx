'use client';

import { useEffect, useState } from 'react';
import { useCashCoreStore } from '@/store';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import QrScannerModal from '@/components/ui/QrScannerModal';
import styles from './dashboard.module.css';

const HORIZON = 'https://horizon-testnet.stellar.org';

const QUICK_ACTIONS = [
  { id: 'send',    label: 'Send',    href: '/send',     icon: '↑', color: 'var(--accent-primary)',   action: null },
  { id: 'receive', label: 'Receive', href: '/wallet',   icon: '↓', color: 'var(--color-success)',    action: null },
  { id: 'scan',    label: 'Scan QR', href: null,        icon: '⊞', color: 'var(--color-warning)',    action: 'scan' },
  { id: 'history', label: 'History', href: '/activity', icon: '⊙', color: 'var(--accent-secondary)', action: null },
];

interface RecentTx {
  hash: string;
  counterparty: string;  // the other address (not mine)
  amount: string;
  token: string;
  direction: 'in' | 'out';
  timeAgo: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function DashboardPage() {
  const wallet = useCashCoreStore((s) => s.wallet);
  const user   = useCashCoreStore((s) => s.user);
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
            return {
              hash: p.transaction_hash,
              counterparty: isIn ? from : to,
              amount: `${isIn ? '+' : '-'}${parseFloat(amount).toFixed(4)}`,
              token: asset,
              direction: isIn ? 'in' : 'out',
              timeAgo: formatTimeAgo(p.created_at),
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
          <Card glass glow className={styles.balanceCard}>
            <div className={styles.balanceTop}>
              <p className={styles.balanceLabel}>XLM Balance</p>
              <Badge variant="testnet" dot>Testnet</Badge>
            </div>
            <div className={styles.balanceAmount}>
              {wallet.connected ? wallet.balance : '—'}
              <span className={styles.balanceToken}>XLM</span>
            </div>
            <p className={styles.balanceUsd}>≈ $0.00 · Testnet value</p>

            {!wallet.connected && (
              <a href="/connect-wallet" className={styles.connectPrompt}>
                Connect Freighter Wallet →
              </a>
            )}
          </Card>

          {/* Quick Actions */}
          <section aria-label="Quick actions">
            <div className={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) =>
                action.action === 'scan' ? (
                  <button
                    key={action.id}
                    className={styles.quickAction}
                    id={`action-${action.id}`}
                    onClick={() => setScannerOpen(true)}
                    type="button"
                  >
                    <div className={styles.quickIcon} style={{ background: `${action.color}18`, color: action.color }}>
                      <span>{action.icon}</span>
                    </div>
                    <span className={styles.quickLabel}>{action.label}</span>
                  </button>
                ) : (
                  <a key={action.id} href={action.href!} className={styles.quickAction} id={`action-${action.id}`}>
                    <div className={styles.quickIcon} style={{ background: `${action.color}18`, color: action.color }}>
                      <span>{action.icon}</span>
                    </div>
                    <span className={styles.quickLabel}>{action.label}</span>
                  </a>
                )
              )}
            </div>
          </section>

          {/* Recent Transactions */}
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent</h2>
              <a href="/activity" className={styles.seeAll}>View all</a>
            </div>

            <div className={styles.txList}>
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

              {recentTxs.map((tx) => (
                <a
                  key={tx.hash}
                  href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txRow}
                  id={`dash-tx-${tx.hash.slice(0, 8)}`}
                >
                  <div className={[styles.txIcon, tx.direction === 'in' ? styles.txIn : styles.txOut].join(' ')}>
                    {tx.direction === 'in' ? '↓' : '↑'}
                  </div>
                  <div className={styles.txInfo}>
                    <p className={styles.txAddress}>{truncate(tx.counterparty)}</p>
                    <p className={styles.txTime}>{tx.timeAgo}</p>
                  </div>
                  <div className={styles.txRight}>
                    <p className={[styles.txAmount, tx.direction === 'in' ? styles.amountIn : styles.amountOut].join(' ')}>
                      {tx.amount} <span className={styles.txToken}>{tx.token}</span>
                    </p>
                    <Badge variant="success">confirmed</Badge>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* QR Scanner Modal — sibling to page div, both inside fragment */}
      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
