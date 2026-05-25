'use client';

import { useCashCoreStore } from '@/store';
import styles from './TopBar.module.css';

interface TopBarProps {
  title?: string;
  showGreeting?: boolean;
  showNotification?: boolean;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarBg(name?: string) {
  const colors = ['#2563EB', '#7C3AED', '#D97706', '#DC2626', '#059669', '#0891B2'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return colors[idx];
}

export default function TopBar({ title, showGreeting = false, showNotification = true }: TopBarProps) {
  const user = useCashCoreStore((s) => s.user);

  return (
    <header className={styles.bar}>
      {showGreeting && user ? (
        <div className={styles.greetSection}>
          <span className={styles.greetSub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1 className={styles.greetingText}>{getGreeting()}, {user.displayName?.split(' ')[0]}! 👋</h1>
        </div>
      ) : (
        <h1 className={styles.title}>{title}</h1>
      )}

      <div className={styles.right}>
        {showNotification && (
          <button className={styles.notifBtn} aria-label="Notifications" id="topbar-notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className={styles.notifBadge} />
          </button>
        )}
        {user && (
          <div
            className={styles.avatar}
            style={{ background: getAvatarBg(user.displayName) }}
            aria-label={`Avatar for ${user.displayName}`}
            title={user.displayName}
          >
            {getInitials(user.displayName)}
          </div>
        )}
      </div>
    </header>
  );
}
