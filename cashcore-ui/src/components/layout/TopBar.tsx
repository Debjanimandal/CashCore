'use client';

import { useCashCoreStore } from '@/store';
import styles from './TopBar.module.css';
import Badge from '@/components/ui/Badge';

interface TopBarProps {
  title?: string;
  showGreeting?: boolean;
  showNotification?: boolean;
  backHref?: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name?: string) {
  const colors = ['#00D4C8', '#7C5CFC', '#F59E0B', '#EF4444', '#22C55E', '#3B82F6'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return colors[idx];
}

export default function TopBar({ title, showGreeting = false, showNotification = true }: TopBarProps) {
  const user = useCashCoreStore((s) => s.user);

  return (
    <header className={styles.bar}>
      {showGreeting && user ? (
        <div className={styles.greetSection}>
          <div className={styles.avatarWrap}>
            <div
              className={styles.avatar}
              style={{ background: getAvatarColor(user.displayName) }}
              aria-label={`Avatar for ${user.displayName}`}
            >
              {getInitials(user.displayName)}
            </div>
          </div>
          <div>
            <p className={styles.greeting}>{getGreeting()},</p>
            <h1 className={styles.userName}>{user.displayName}</h1>
          </div>
        </div>
      ) : (
        <h1 className={styles.title}>{title}</h1>
      )}

      <div className={styles.right}>
        <Badge variant="testnet" dot>Testnet</Badge>
        {showNotification && (
          <button className={styles.notifBtn} aria-label="Notifications" id="topbar-notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
