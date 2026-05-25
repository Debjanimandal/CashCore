'use client';

import { useEffect, useState } from 'react';
import { useCashCoreStore } from '@/store';
import TopBar from '@/components/layout/TopBar';
import QrScannerModal from '@/components/ui/QrScannerModal';
import styles from './dashboard.module.css';

const HORIZON = 'https://horizon-testnet.stellar.org';

interface RecentTx {
  hash: string;
  counterparty: string;
  amount: string;
  token: string;
  direction: 'in' | 'out';
  dateStr: string;
  type: string;
}

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
    fetch(`${HORIZON}/accounts/${address}/payments?limit=10&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const records = data._embedded?.records ?? [];
        const parsed: RecentTx[] = records
          .filter((p: any) => p.type === 'payment' || p.type === 'create_account')
          .map((p: any) => {
            const isIn = p.type === 'create_account' ? p.account === address : p.to === address;
            const amount = p.type === 'create_account' ? p.starting_balance : p.amount;
            const from = p.type === 'create_account' ? p.funder : p.from;
            const to = p.type === 'create_account' ? p.account : p.to;
            const asset = p.asset_type === 'native' ? 'XLM' : (p.asset_code ?? 'TOKEN');
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
            <div className={styles.balanceLeft}>
              <p className={styles.balanceLabel}>Total Balance</p>
              <div className={styles.balanceAmount}>
                {wallet.connected ? wallet.balance : '—'}
                <span className={styles.balanceToken}>XLM</span>
              </div>
              <p className={styles.balanceUsd}>
                ≈ ${wallet.connected ? (parseFloat(wallet.balance) * 0.112).toFixed(2) : '0.00'} USD · Testnet value
              </p>
              {!wallet.connected && (
                <a href="/connect-wallet" className={styles.connectPrompt}>
                  Connect Freighter Wallet →
                </a>
              )}
            </div>
            <span className={styles.balancePill}>Total XLM Balance</span>
          </div>

          {/* Quick Actions */}
          <section aria-label="Quick actions">
            <h3 className={styles.sectionTitle}>Quick Actions</h3>
            <div className={styles.quickRow}>
              <a href="/send" className={`${styles.quickBtn} ${styles.quickBtnPrimary}`}>
                <span className={styles.quickBtnIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </span>
                Send
              </a>
              <a href="/wallet" className={styles.quickBtn}>
                <span className={styles.quickBtnIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                Receive
              </a>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => setScannerOpen(true)}
              >
                <span className={styles.quickBtnIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h1v1" /><path d="M19 14h.01" /><path d="M14 19h.01" /><path d="M19 19h.01" />
                  </svg>
                </span>
                Scan QR
              </button>
              <a href="/activity" className={styles.quickBtn}>
                <span className={styles.quickBtnIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
                  </svg>
                </span>
                History
              </a>
            </div>
          </section>

          {/* Recent Transactions */}
          <section>
            <h3 className={styles.sectionTitle}>Recent Transactions</h3>
            <div className={styles.txCard}>
              <div className={styles.txTableHead}>
                <span>Date</span>
                <span>Description</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
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

              {recentTxs.map((tx) => (
                <a
                  key={tx.hash}
                  href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txRow}
                >
                  <div className={styles.txDate}>{tx.dateStr}</div>

                  <div className={styles.txEntity}>
                    <div className={styles.txIconCircle} style={{
                      background: tx.type === 'create_account' ? '#7C3AED' : (tx.direction === 'in' ? '#059669' : '#2563EB'),
                    }}>
                      {tx.type === 'create_account' ? 'S' : (tx.direction === 'in' ? '↓' : '↑')}
                    </div>
                    <div className={styles.txDescWrap}>
                      <span className={styles.txTitle}>
                        {tx.type === 'create_account' ? 'Stellar Network' : `Transfer ${tx.direction === 'in' ? 'from' : 'to'} ${truncate(tx.counterparty)}`}
                      </span>
                      <span className={styles.txSub}>{tx.counterparty}</span>
                    </div>
                  </div>

                  <div className={styles.txStatusWrap}>
                    <span className={`${styles.statusPill} ${styles.statusSuccess}`}>Completed</span>
                  </div>

                  <div className={styles.txRight}>
                    <span className={`${styles.txAmount} ${tx.direction === 'in' ? styles.amountIn : styles.amountOut}`}>
                      {tx.amount} XLM
                    </span>
                    <span className={styles.txUsd}>
                      ≈ {tx.direction === 'in' ? '+' : '-'}${(Math.abs(parseFloat(tx.amount)) * 0.112).toFixed(2)} USD
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>

      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
