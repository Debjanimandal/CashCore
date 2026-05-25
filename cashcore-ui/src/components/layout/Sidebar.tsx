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
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Wallet',
    href: '/wallet',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'send',
    label: 'Send',
    href: '/send',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" fill={active ? 'currentColor' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, wallet } = useCashCoreStore();

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Generate a consistent color from user name
  const avatarColors = [
    'linear-gradient(135deg,#00D4C8,#0099A8)',
    'linear-gradient(135deg,#7C5CFC,#5B3FD4)',
    'linear-gradient(135deg,#F59E0B,#D97706)',
    'linear-gradient(135deg,#22C55E,#16A34A)',
  ];
  const colorIndex = (user?.name?.charCodeAt(0) ?? 0) % avatarColors.length;

  return (
    <aside className={styles.sidebar} aria-label="Sidebar navigation">
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" strokeLinecap="round" />
          </svg>
        </div>
        <span className={styles.logoText}>Cash<span>Core</span></span>
      </div>

      {/* Main nav */}
      <span className={styles.navGroupLabel}>Menu</span>

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

      {/* Network badge */}
      <div className={styles.networkBadge}>
        <span className={styles.networkDot} />
        Stellar Testnet
      </div>

      {/* User info */}
      {user && (
        <div className={styles.userSection}>
          <div
            className={styles.userAvatar}
            style={{ background: avatarColors[colorIndex] }}
          >
            {initials}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name || 'User'}</div>
            <div className={styles.userRole}>
              {wallet?.connected ? `${wallet.balance} XLM` : 'Wallet not connected'}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
