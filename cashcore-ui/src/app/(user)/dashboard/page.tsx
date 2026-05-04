'use client';

import { useCashCoreStore } from '@/store';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from './dashboard.module.css';

const MOCK_TXS = [
  { hash: '0xtx001', from: '0xFRGT...9x3z', to: '0xFRGT...4a9f', amount: '+1,000', token: 'tFRGT', status: 'confirmed' as const, timestamp: '2 min ago', direction: 'in' },
  { hash: '0xtx002', from: '0xFRGT...4a9f', to: '0xFRGT...abc1', amount: '-250', token: 'tFRGT', status: 'confirmed' as const, timestamp: '1 hr ago', direction: 'out' },
  { hash: '0xtx003', from: '0xFRGT...4a9f', to: '0xFRGT...def2', amount: '-50', token: 'tFRGT', status: 'pending' as const, timestamp: '3 hr ago', direction: 'out' },
];

const QUICK_ACTIONS = [
  { id: 'send', label: 'Send', href: '/send', icon: '↑', color: 'var(--accent-primary)' },
  { id: 'receive', label: 'Receive', href: '/wallet', icon: '↓', color: 'var(--color-success)' },
  { id: 'scan', label: 'Scan QR', href: '/wallet', icon: '⊞', color: 'var(--color-warning)' },
  { id: 'history', label: 'History', href: '/activity', icon: '⊙', color: 'var(--accent-secondary)' },
];

export default function DashboardPage() {
  const wallet = useCashCoreStore((s) => s.wallet);
  const user = useCashCoreStore((s) => s.user);

  return (
    <div className={styles.page}>
      <TopBar showGreeting />

      <main className={styles.main}>
        {/* Balance Card */}
        <Card glass glow className={styles.balanceCard}>
          <div className={styles.balanceTop}>
            <p className={styles.balanceLabel}>tFRGT Balance</p>
            <Badge variant="testnet" dot>Testnet</Badge>
          </div>
          <div className={styles.balanceAmount}>
            {wallet.connected ? wallet.balance : '—'}
            <span className={styles.balanceToken}>tFRGT</span>
          </div>
          <p className={styles.balanceUsd}>≈ $0.00 · Testnet value</p>

          {!wallet.connected && (
            <a href="/connect-wallet" className={styles.connectPrompt}>
              Connect Friegter Wallet →
            </a>
          )}
        </Card>

        {/* Quick Actions */}
        <section aria-label="Quick actions">
          <div className={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <a key={action.id} href={action.href} className={styles.quickAction} id={`action-${action.id}`}>
                <div className={styles.quickIcon} style={{ background: `${action.color}18`, color: action.color }}>
                  <span>{action.icon}</span>
                </div>
                <span className={styles.quickLabel}>{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent</h2>
            <a href="/activity" className={styles.seeAll}>View all</a>
          </div>

          <div className={styles.txList}>
            {MOCK_TXS.map((tx) => (
              <div key={tx.hash} className={styles.txRow}>
                <div className={[styles.txIcon, tx.direction === 'in' ? styles.txIn : styles.txOut].join(' ')}>
                  {tx.direction === 'in' ? '↓' : '↑'}
                </div>
                <div className={styles.txInfo}>
                  <p className={styles.txAddress}>
                    {tx.direction === 'in' ? tx.from : tx.to}
                  </p>
                  <p className={styles.txTime}>{tx.timestamp}</p>
                </div>
                <div className={styles.txRight}>
                  <p className={[styles.txAmount, tx.direction === 'in' ? styles.amountIn : styles.amountOut].join(' ')}>
                    {tx.amount} <span className={styles.txToken}>{tx.token}</span>
                  </p>
                  <Badge variant={tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
