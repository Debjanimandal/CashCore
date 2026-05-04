'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import styles from './transactions.module.css';

type TxStatus = 'confirmed' | 'pending' | 'failed';
type Filter = 'all' | 'pending' | 'failed' | 'flagged';

interface AdminTx {
  hash: string;
  from: string;
  to: string;
  fromUser: string;
  toUser: string;
  amount: string;
  status: TxStatus;
  timestamp: string;
  block?: number;
  flagged?: boolean;
}

const MOCK_TXS: AdminTx[] = [
  { hash: '0xtxABC001', from: '0xFRGT...4a9f', to: '0xFRGT...9x3z', fromUser: 'Alex Vera', toUser: 'Mia Kim', amount: '250 tFRGT', status: 'confirmed', timestamp: '2 min ago', block: 1042400 },
  { hash: '0xtxABC002', from: '0xFRGT...abc1', to: '0xFRGT...4a9f', fromUser: 'Ryan Cho', toUser: 'Alex Vera', amount: '1,000 tFRGT', status: 'confirmed', timestamp: '10 min ago', block: 1042350 },
  { hash: '0xtxABC003', from: '0xFRGT...def2', to: '0xFRGT...xyz9', fromUser: 'Sam Lee', toUser: 'Ji Park', amount: '50 tFRGT', status: 'pending', timestamp: '15 min ago' },
  { hash: '0xtxABC004', from: '0xFRGT...xyz9', to: '0xFRGT...zzz1', fromUser: 'Ji Park', toUser: 'Unknown', amount: '5,000 tFRGT', status: 'failed', timestamp: '30 min ago', flagged: true },
  { hash: '0xtxABC005', from: '0xFRGT...9x3z', to: '0xFRGT...abc1', fromUser: 'Mia Kim', toUser: 'Ryan Cho', amount: '100 tFRGT', status: 'confirmed', timestamp: '1 hr ago', block: 1042300 },
];

const statusVariant = (s: TxStatus) => s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : 'danger';

export default function AdminTransactionsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedTx, setSelectedTx] = useState<AdminTx | null>(null);

  const filtered = MOCK_TXS.filter((tx) => {
    if (filter === 'pending') return tx.status === 'pending';
    if (filter === 'failed') return tx.status === 'failed';
    if (filter === 'flagged') return tx.flagged;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Transaction Monitor</h1>
        <p className={styles.subtitle}>All testnet transactions across all users</p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(['all', 'pending', 'failed', 'flagged'] as Filter[]).map((f) => (
          <button
            key={f}
            className={[styles.filterChip, filter === f ? styles.filterActive : ''].join(' ')}
            onClick={() => setFilter(f)}
            id={`txfilter-${f}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'flagged' && <span className={styles.flagBadge}>!</span>}
          </button>
        ))}
      </div>

      {/* TX Table */}
      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span>User</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Time</span>
        </div>
        {filtered.map((tx) => (
          <div
            key={tx.hash}
            className={[styles.tableRow, tx.flagged ? styles.tableRowFlagged : ''].join(' ')}
            onClick={() => setSelectedTx(tx)}
            role="button"
            tabIndex={0}
            id={`tx-${tx.hash}`}
          >
            <div className={styles.txUser}>
              <p className={styles.txFromUser}>{tx.fromUser}</p>
              <p className={styles.txArrow}>→ {tx.toUser}</p>
            </div>
            <span className={styles.txAmount}>{tx.amount}</span>
            <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
            <span className={styles.txTime}>{tx.timestamp}</span>
            {tx.flagged && <span className={styles.flagIcon}>🚩</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>No transactions match this filter</div>
        )}
      </Card>

      {/* TX Detail */}
      <BottomSheet open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Detail">
        {selectedTx && (
          <div className={styles.detail}>
            <div className={styles.detailRow}><span>Hash</span><span className={styles.mono}>{selectedTx.hash}</span></div>
            <div className={styles.detailRow}><span>From</span><span className={styles.mono}>{selectedTx.from}</span></div>
            <div className={styles.detailRow}><span>From User</span><span>{selectedTx.fromUser}</span></div>
            <div className={styles.detailRow}><span>To</span><span className={styles.mono}>{selectedTx.to}</span></div>
            <div className={styles.detailRow}><span>To User</span><span>{selectedTx.toUser}</span></div>
            <div className={styles.detailRow}><span>Amount</span><span className={styles.amount}>{selectedTx.amount}</span></div>
            <div className={styles.detailRow}><span>Status</span><Badge variant={statusVariant(selectedTx.status)} dot>{selectedTx.status}</Badge></div>
            {selectedTx.block && <div className={styles.detailRow}><span>Block</span><span className={styles.mono}>#{selectedTx.block}</span></div>}
            <div className={styles.detailRow}><span>Time</span><span>{selectedTx.timestamp}</span></div>
            {!selectedTx.flagged && (
              <Button variant="danger" fullWidth id={`flag-${selectedTx.hash}`}>
                🚩 Flag as Suspicious
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
