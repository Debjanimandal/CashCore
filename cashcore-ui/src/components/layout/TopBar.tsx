'use client';

import { useCashCoreStore } from '@/store';
import styles from './TopBar.module.css';
import Badge from '@/components/ui/Badge';
import { useEffect, useState } from 'react';

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
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name?: string) {
  const colors = ['#00B2A9', '#7C5CFC', '#D97706', '#DC2626', '#16A34A', '#2563EB'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return colors[idx];
}

export default function TopBar({ title, showGreeting = false, showNotification = true }: TopBarProps) {
  const user = useCashCoreStore((s) => s.user);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 769);
    const handleResize = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className={styles.bar}>
      {showGreeting && user ? (
        <div className={styles.greetSection}>
          <h1 className={styles.greetingText}>
            {getGreeting()}, {user.displayName?.split(' ')[0]}!
          </h1>
        </div>
      ) : (
        <h1 className={styles.title}>{title}</h1>
      )}

      <div className={styles.right}>
        {isMobile && <Badge variant="testnet" dot>Testnet</Badge>}
        
        {showNotification && (
          <button className={styles.notifBtn} aria-label="Notifications" id="topbar-notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className={styles.notifBadge} />
          </button>
        )}

        {/* Show avatar on right on desktop per mockup */}
        {!isMobile && user && (
          <div
            className={styles.avatar}
            style={
              user.displayName?.includes('Alex') 
                ? {} // Use the background image from CSS for Alex to match mockup perfectly
                : { background: getAvatarColor(user.displayName) }
            }
            aria-label={`Avatar for ${user.displayName}`}
          >
            {!user.displayName?.includes('Alex') && getInitials(user.displayName)}
          </div>
        )}
      </div>
    </header>
  );
}
