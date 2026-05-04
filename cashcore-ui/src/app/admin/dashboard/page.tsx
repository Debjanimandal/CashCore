'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import styles from './admindash.module.css';

const STATS = [
  { label: 'Total Users', value: '248', icon: '👥', trend: '+12 this week' },
  { label: 'Active Wallets', value: '194', icon: '◈', trend: '+8 today' },
  { label: 'Transactions Today', value: '1,203', icon: '↔', trend: '+340 vs yesterday' },
  { label: 'Volume Today', value: '48,200 tFRGT', icon: '◎', trend: 'Testnet only' },
];

const ACTIVITY = [
  { user: 'Alex Vera', wallet: '0xFRGT...4a9f', action: 'Sent 250 tFRGT', time: '2 min ago', type: 'send' },
  { user: 'Mia Kim', wallet: '0xFRGT...9x3z', action: 'Connected wallet', time: '5 min ago', type: 'connect' },
  { user: 'Ryan Cho', wallet: '0xFRGT...abc1', action: 'Received 1,000 tFRGT', time: '12 min ago', type: 'receive' },
  { user: 'Sam Lee', wallet: '0xFRGT...def2', action: 'Failed transaction', time: '20 min ago', type: 'error' },
  { user: 'Ji Park', wallet: '0xFRGT...xyz9', action: 'Registered account', time: '1 hr ago', type: 'register' },
];

const activityColor = (type: string) => {
  if (type === 'send') return 'var(--color-danger)';
  if (type === 'receive') return 'var(--color-success)';
  if (type === 'error') return 'var(--color-warning)';
  if (type === 'connect') return 'var(--accent-primary)';
  return 'var(--accent-secondary)';
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Monitor and manage the CashCore testnet</p>
        </div>
        <Badge variant="admin" dot>Superuser</Badge>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {STATS.map((stat) => (
          <Card adminGlow key={stat.label} className={styles.statCard}>
            <div className={styles.statTop}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <span className={styles.statTrend}>{stat.trend}</span>
            </div>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Network Activity</h2>
        <Card className={styles.activityCard}>
          {ACTIVITY.map((item, i) => (
            <div key={i} className={styles.activityRow}>
              <div className={styles.activityAvatar}>
                {getInitials(item.user)}
              </div>
              <div className={styles.activityInfo}>
                <p className={styles.activityUser}>{item.user}</p>
                <p className={styles.activityAction}>{item.action}</p>
                <p className={styles.activityWallet}>{item.wallet}</p>
              </div>
              <div className={styles.activityRight}>
                <div className={styles.activityDot} style={{ background: activityColor(item.type) }} />
                <span className={styles.activityTime}>{item.time}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Quick Links */}
      <div className={styles.quickLinks}>
        <a href="/admin/users" className={styles.quickLink} id="admin-goto-users">
          <span>Manage Users →</span>
        </a>
        <a href="/admin/transactions" className={styles.quickLink} id="admin-goto-tx">
          <span>Monitor Transactions →</span>
        </a>
      </div>
    </div>
  );
}
