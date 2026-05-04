'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './BottomNav.module.css';
import { useCashCoreStore } from '@/store';

const tabs = [
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <button
            key={tab.id}
            className={[styles.tab, isActive ? styles.active : ''].join(' ')}
            onClick={() => navigate(tab.href)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            id={`nav-${tab.id}`}
          >
            <span className={styles.icon}>{tab.icon(isActive)}</span>
            <span className={styles.label}>{tab.label}</span>
            {isActive && <span className={styles.indicator} />}
          </button>
        );
      })}
    </nav>
  );
}
