'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { useCashCoreStore } from '@/store';

const navItems = [
  {
    id: 'home',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Wallet',
    href: '/wallet',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
  },
  {
    id: 'send',
    label: 'Send',
    href: '/send',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, setToken, setUser, setWallet } = useCashCoreStore();

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setWallet({ address: null, connected: false, balance: '0', network: 'Stellar Testnet' });
    router.push('/');
  };

  return (
    <aside className={styles.sidebar} aria-label="Sidebar navigation">
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v4h-2Zm0 6h2v2h-2Z" opacity="0.3" />
            <path d="M14 7h-2c-2.76 0-5 2.24-5 5s2.24 5 5 5h2v-2h-2c-1.65 0-3-1.35-3-3s1.35-3 3-3h2V7Z" />
          </svg>
        </div>
        <span className={styles.logoText}>CashCore</span>
      </div>

      {/* Main nav */}
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <button
            key={item.id}
            className={[styles.navItem, isActive ? styles.active : ''].join(' ')}
            onClick={() => router.push(item.href)}
            id={`sidebar-${item.id}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.navIcon}>{item.icon(isActive)}</span>
            {item.label}
          </button>
        );
      })}

      <div className={styles.spacer} />

      {/* Bottom Actions */}
      <div className={styles.bottomActions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log Out
        </button>

        {/* Account Selector */}
        <div className={styles.accountCard}>
          <div className={styles.accountIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className={styles.accountInfo}>
            <span className={styles.accountTitle}>Account</span>
            <span className={styles.accountBalance}>
              {wallet.connected ? `~${wallet.balance} XLM` : 'Not connected'}
            </span>
          </div>
          <div className={styles.chevronIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
