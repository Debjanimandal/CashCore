'use client';

import React from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'admin' | 'testnet';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'neutral', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].join(' ')}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
