'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './splash.module.css';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.splash}>
      <div className={styles.content}>
        <div className={styles.logoWrap}>
          <svg className={styles.logoIcon} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="url(#splashGrad)" />
            <path d="M16 24L22 18L28 24L22 30L16 24Z" fill="white" opacity="0.9" />
            <path d="M22 18L28 12L34 18L28 24L22 18Z" fill="white" opacity="0.6" />
            <path d="M22 30L28 24L34 30L28 36L22 30Z" fill="white" opacity="0.6" />
            <defs>
              <linearGradient id="splashGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00D4C8" />
                <stop offset="1" stopColor="#0099A8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className={styles.wordmark}>CashCore</h1>
        <p className={styles.tagline}>Your Wallet. Your Testnet. Your Control.</p>
      </div>
      <div className={styles.footer}>
        <p className={styles.powered}>Powered by <span>Friegter Wallet</span></p>
        <div className={styles.testnetBadge}>
          <span className={styles.dot} />
          Testnet
        </div>
      </div>
    </div>
  );
}
