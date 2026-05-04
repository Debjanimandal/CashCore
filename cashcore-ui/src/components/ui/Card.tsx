'use client';

import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  glass?: boolean;
  glow?: boolean;
  adminGlow?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export default function Card({
  children,
  glass = false,
  glow = false,
  adminGlow = false,
  padding = 'md',
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        glass ? styles.glass : '',
        glow ? styles.glow : '',
        adminGlow ? styles.adminGlow : '',
        styles[`pad-${padding}`],
        onClick ? styles.clickable : '',
        className,
      ].join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
