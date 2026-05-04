'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import BottomSheet from '@/components/ui/BottomSheet';
import { useCashCoreStore } from '@/store';
import styles from './activity.module.css';

const HORIZON = 'https://horizon-testnet.stellar.org';

type FilterType = 'all' | 'sent' | 'received';

interface Tx {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  fee: string;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: string;
  rawDate: Date;
  direction: 'in' | 'out';
  group: string;
  ledger?: number;
  memo?: string;
}

function getGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (txDay.getTime() === today.getTime()) return 'TODAY';
  if (txDay.getTime() === yesterday.getTime()) return 'YESTERDAY';
  return txDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseHorizonPayments(payments: any[], myAddress: string): Tx[] {
  return payments
    .filter((p: any) => p.type === 'payment' || p.type === 'create_account')
    .map((p: any) => {
      const isReceived = p.type === 'create_account'
        ? p.account === myAddress
        : p.to === myAddress;

      const amount = p.type === 'create_account'
        ? p.starting_balance
        : p.amount;

      const from = p.type === 'create_account' ? p.funder : p.from;
      const to = p.type === 'create_account' ? p.account : p.to;
      const asset = p.asset_type === 'native' ? 'XLM' : (p.asset_code || 'UNKNOWN');
      const rawDate = new Date(p.created_at);

      return {
        hash: p.transaction_hash,
        from,
        to,
        amount: isReceived ? `+${parseFloat(amount).toFixed(4)}` : `-${parseFloat(amount).toFixed(4)}`,
        token: asset,
        fee: '0.00001',
        status: 'confirmed' as const,
        timestamp: timeAgo(rawDate),
        rawDate,
        direction: isReceived ? 'in' : 'out',
        group: getGroup(rawDate),
        ledger: p.paging_token,
        memo: p.transaction?.memo,
      };
    })
    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
];

export default function ActivityPage() {
  const { wallet } = useCashCoreStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchTxs = useCallback(async (pagingToken?: string) => {
    const address = wallet.address;
    if (!address) {
      setError('No wallet connected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = new URL(`${HORIZON}/accounts/${address}/payments`);
      url.searchParams.set('limit', '50');
      url.searchParams.set('order', 'desc');
      if (pagingToken) url.searchParams.set('cursor', pagingToken);

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 404) {
          setError('Account not found on Stellar Testnet. Fund it at friendbot.stellar.org');
        } else {
          setError(`Horizon API error: ${res.status}`);
        }
        return;
      }

      const data = await res.json();
      const records = data._embedded?.records ?? [];
      const parsed = parseHorizonPayments(records, address);

      if (pagingToken) {
        setTxs(prev => [...prev, ...parsed]);
      } else {
        setTxs(parsed);
      }

      const lastRecord = records[records.length - 1];
      if (lastRecord && records.length === 50) {
        setCursor(lastRecord.paging_token);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (e: any) {
      setError('Could not load transactions. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    fetchTxs();
  }, [fetchTxs]);

  const filtered = txs.filter((tx) => {
    if (filter === 'received') return tx.direction === 'in';
    if (filter === 'sent') return tx.direction === 'out';
    return true;
  });

  const groups = filtered.reduce<Record<string, Tx[]>>((acc, tx) => {
    if (!acc[tx.group]) acc[tx.group] = [];
    acc[tx.group].push(tx);
    return acc;
  }, {});

  const statusVariant = (s: Tx['status']) =>
    s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : 'danger';

  return (
    <div className={styles.page}>
      <TopBar title="Activity" />

      <main className={styles.main}>
        {/* Filter Tabs */}
        <div className={styles.filters} role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={[styles.filterTab, filter === f.id ? styles.filterActive : ''].join(' ')}
              onClick={() => setFilter(f.id)}
              id={`filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
          <button
            className={styles.refreshBtn}
            onClick={() => fetchTxs()}
            title="Refresh"
            id="refresh-txs"
          >
            ↻
          </button>
        </div>

        {/* Loading */}
        {loading && txs.length === 0 && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading transactions from Stellar Testnet…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className={styles.errorBox}>
            <p>{error}</p>
            {error.includes('Fund') && (
              <a
                href={`https://friendbot.stellar.org/?addr=${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.friendbotLink}
              >
                Fund on Friendbot →
              </a>
            )}
          </div>
        )}

        {/* No wallet */}
        {!wallet.address && !loading && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◎</span>
            <p>Connect your Freighter wallet to see transactions</p>
          </div>
        )}

        {/* Transaction Groups */}
        {!loading && !error && filtered.length === 0 && wallet.address && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⊙</span>
            <p>No {filter !== 'all' ? filter : ''} transactions yet</p>
            <p style={{ fontSize: '12px', opacity: 0.5, marginTop: 4 }}>
              {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
            </p>
          </div>
        )}

        {Object.entries(groups).map(([group, groupTxs]) => (
          <div key={group} className={styles.group}>
            <p className={styles.groupLabel}>{group}</p>
            <div className={styles.txList}>
              {groupTxs.map((tx) => (
                <div
                  key={tx.hash}
                  className={styles.txRow}
                  onClick={() => setSelectedTx(tx)}
                  role="button"
                  tabIndex={0}
                  id={`tx-${tx.hash.slice(0, 8)}`}
                >
                  <div className={[styles.txIcon, tx.direction === 'in' ? styles.txIn : styles.txOut].join(' ')}>
                    {tx.direction === 'in' ? '↓' : '↑'}
                  </div>
                  <div className={styles.txInfo}>
                    <p className={styles.txAddress}>
                      {tx.direction === 'in'
                        ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                        : `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
                    </p>
                    <p className={styles.txTime}>{tx.timestamp}</p>
                  </div>
                  <div className={styles.txRight}>
                    <p className={[styles.txAmount, tx.direction === 'in' ? styles.amountIn : styles.amountOut].join(' ')}>
                      {tx.amount} <span>{tx.token}</span>
                    </p>
                    <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Load More */}
        {hasMore && !loading && (
          <button className={styles.loadMore} onClick={() => cursor && fetchTxs(cursor)} id="load-more-txs">
            Load more transactions
          </button>
        )}

        {/* Loading more spinner */}
        {loading && txs.length > 0 && (
          <div className={styles.loadingMore}>
            <div className={styles.spinner} /> Loading…
          </div>
        )}
      </main>

      {/* TX Detail Sheet */}
      <BottomSheet open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Detail">
        {selectedTx && (
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Hash</span>
              <span className={styles.detailHash}>{selectedTx.hash.slice(0, 16)}...{selectedTx.hash.slice(-8)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>From</span>
              <span className={styles.detailMono}>{selectedTx.from.slice(0, 12)}...{selectedTx.from.slice(-6)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>To</span>
              <span className={styles.detailMono}>{selectedTx.to.slice(0, 12)}...{selectedTx.to.slice(-6)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Amount</span>
              <span className={[styles.detailAmount, selectedTx.direction === 'in' ? styles.amountIn : styles.amountOut].join(' ')}>
                {selectedTx.amount} {selectedTx.token}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Network Fee</span>
              <span className={styles.detailMono}>{selectedTx.fee} XLM</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <Badge variant={statusVariant(selectedTx.status)} dot>{selectedTx.status}</Badge>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}>{selectedTx.timestamp}</span>
            </div>
            {selectedTx.memo && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Memo</span>
                <span className={styles.detailValue}>{selectedTx.memo}</span>
              </div>
            )}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${selectedTx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.explorerLink}
            >
              View on Stellar Explorer ↗
            </a>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
