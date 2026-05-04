'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import BottomSheet from '@/components/ui/BottomSheet';
import styles from './users.module.css';

type Status = 'active' | 'restricted' | 'banned';

interface User {
  id: string;
  name: string;
  email: string;
  wallet: string;
  status: Status;
  lastActive: string;
  txCount: number;
}

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Vera', email: 'alex@example.com', wallet: '0xFRGT...4a9f', status: 'active', lastActive: '2 min ago', txCount: 14 },
  { id: 'u2', name: 'Mia Kim', email: 'mia@example.com', wallet: '0xFRGT...9x3z', status: 'active', lastActive: '10 min ago', txCount: 7 },
  { id: 'u3', name: 'Ryan Cho', email: 'ryan@example.com', wallet: '0xFRGT...abc1', status: 'restricted', lastActive: '2 days ago', txCount: 3 },
  { id: 'u4', name: 'Sam Lee', email: 'sam@example.com', wallet: '0xFRGT...def2', status: 'active', lastActive: '1 hr ago', txCount: 21 },
  { id: 'u5', name: 'Ji Park', email: 'ji@example.com', wallet: 'Not connected', status: 'active', lastActive: '3 hr ago', txCount: 0 },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}
function getAvatarColor(name: string) {
  const colors = ['#00D4C8', '#7C5CFC', '#F59E0B', '#EF4444', '#22C55E'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ user: User; action: string } | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = async (user: User, action: string) => {
    setConfirmAction({ user, action });
  };

  const executeAction = async () => {
    setActionLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setActionLoading(false);
    setConfirmAction(null);
    setSelectedUser(null);
  };

  const statusVariant = (s: Status) => s === 'active' ? 'success' : s === 'restricted' ? 'warning' : 'danger';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>{filtered.length} users</p>
      </div>

      {/* Filters */}
      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⊕</span>
          <input
            className={styles.search}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="admin-user-search"
          />
        </div>
        <div className={styles.statusFilters}>
          {(['all', 'active', 'restricted', 'banned'] as const).map((s) => (
            <button
              key={s}
              className={[styles.filterChip, statusFilter === s ? styles.filterChipActive : ''].join(' ')}
              onClick={() => setStatusFilter(s)}
              id={`admin-filter-${s}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User Cards */}
      <div className={styles.userList}>
        {filtered.map((user) => (
          <Card key={user.id} className={styles.userCard} onClick={() => setSelectedUser(user)}>
            <div className={styles.userRow}>
              <div className={styles.avatar} style={{ background: getAvatarColor(user.name) }}>
                {getInitials(user.name)}
              </div>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user.name}</p>
                <p className={styles.userEmail}>{user.email}</p>
                <p className={styles.userWallet}>{user.wallet}</p>
              </div>
              <div className={styles.userRight}>
                <Badge variant={statusVariant(user.status)} dot>{user.status}</Badge>
                <p className={styles.userTime}>{user.lastActive}</p>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <span>No users match your filter</span>
          </div>
        )}
      </div>

      {/* User Detail Sheet */}
      <BottomSheet open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Detail">
        {selectedUser && (
          <div className={styles.userDetail}>
            <div className={styles.detailAvatar} style={{ background: getAvatarColor(selectedUser.name) }}>
              {getInitials(selectedUser.name)}
            </div>
            <h2 className={styles.detailName}>{selectedUser.name}</h2>
            <p className={styles.detailEmail}>{selectedUser.email}</p>
            <Badge variant={statusVariant(selectedUser.status)} dot>{selectedUser.status}</Badge>

            <div className={styles.detailRows}>
              <div className={styles.detailRow}><span>Wallet</span><span className={styles.mono}>{selectedUser.wallet}</span></div>
              <div className={styles.detailRow}><span>Transactions</span><span>{selectedUser.txCount}</span></div>
              <div className={styles.detailRow}><span>Last Active</span><span>{selectedUser.lastActive}</span></div>
            </div>

            <div className={styles.detailActions}>
              {selectedUser.status === 'active' && (
                <Button variant="secondary" fullWidth onClick={() => handleAction(selectedUser, 'restrict')} id={`restrict-${selectedUser.id}`}>
                  Restrict Account
                </Button>
              )}
              {selectedUser.status !== 'active' && (
                <Button variant="primary" fullWidth onClick={() => handleAction(selectedUser, 'activate')} id={`activate-${selectedUser.id}`}>
                  Restore Access
                </Button>
              )}
              <Button variant="danger" fullWidth onClick={() => handleAction(selectedUser, 'ban')} id={`ban-${selectedUser.id}`}>
                Ban User
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Confirm Sheet */}
      <BottomSheet open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm Action">
        {confirmAction && (
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>
              You are about to <strong>{confirmAction.action}</strong> the account of{' '}
              <strong>{confirmAction.user.name}</strong>. This will be logged in the audit trail.
            </p>
            <Badge variant="warning" dot>Admin action — irreversible until changed</Badge>
            <div className={styles.detailActions}>
              <Button variant="secondary" fullWidth onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant="danger" fullWidth loading={actionLoading} onClick={executeAction} id="confirm-action">
                Confirm {confirmAction.action}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
