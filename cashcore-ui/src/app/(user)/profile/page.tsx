'use client';

import { useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useCashCoreStore } from '@/store';
import styles from './profile.module.css';

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}
function getAvatarColor(name?: string) {
  const colors = ['#00D4C8', '#7C5CFC', '#F59E0B', '#EF4444', '#22C55E'];
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, wallet, logout, toggleTheme, theme } = useCashCoreStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { label: 'Email', value: user?.email || '—', icon: '✉' },
        { label: 'Role', value: <Badge variant={user?.role === 'admin' ? 'admin' : 'info'}>{user?.role || 'user'}</Badge>, icon: '👤' },
        { label: 'Status', value: <Badge variant={user?.status === 'active' ? 'success' : 'danger'} dot>{user?.status || 'active'}</Badge>, icon: '●' },
      ],
    },
    {
      title: 'Wallet',
      items: [
        { label: 'Address', value: wallet.address ? `${wallet.address.slice(0, 18)}...` : 'Not connected', icon: '◈', mono: true },
        { label: 'Network', value: 'Friegter Testnet', icon: '⬡' },
        { label: 'Balance', value: `${wallet.balance} tFRGT`, icon: '◎', mono: true },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Theme',
          value: (
            <button className={styles.themeToggle} onClick={toggleTheme} id="profile-theme-toggle">
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
          ),
          icon: '◑',
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <TopBar title="Profile" />

      <main className={styles.main}>
        {/* Avatar */}
        <div className={styles.avatarSection}>
          <div
            className={styles.avatar}
            style={{ background: getAvatarColor(user?.displayName) }}
            aria-label="User avatar"
          >
            {getInitials(user?.displayName)}
          </div>
          <div>
            <h1 className={styles.name}>{user?.displayName || 'Guest'}</h1>
            <p className={styles.email}>{user?.email || 'Not signed in'}</p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title} className={styles.section}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <Card className={styles.sectionCard}>
              {section.items.map((item, i) => (
                <div key={item.label} className={[styles.row, i < section.items.length - 1 ? styles.rowBorder : ''].join(' ')}>
                  <div className={styles.rowLeft}>
                    <span className={styles.rowIcon}>{item.icon}</span>
                    <span className={styles.rowLabel}>{item.label}</span>
                  </div>
                  <span className={[(item as any).mono ? styles.mono : '', styles.rowValue].join(' ')}>
                    {item.value}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        ))}

        {/* App Info */}
        <Card className={styles.infoCard}>
          <p className={styles.appName}>CashCore v1.0.0</p>
          <p className={styles.appDesc}>Powered by Friegter Wallet · Testnet environment · No real funds</p>
          <Badge variant="testnet" dot>Testnet</Badge>
        </Card>

        {/* Logout */}
        <div style={{ display: 'flex' }}>
          <Button variant="danger" size="lg" onClick={handleLogout} id="profile-logout">
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
