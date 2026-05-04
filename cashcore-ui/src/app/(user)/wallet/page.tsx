'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useCashCoreStore } from '@/store';
import styles from './wallet.module.css';

export default function WalletPage() {
  const wallet = useCashCoreStore((s) => s.wallet);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayAddress = wallet.address || '0xFRGT...Not connected';

  const copyAddress = async () => {
    if (!wallet.address) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.page}>
      <TopBar title="My Wallet" />

      <main className={styles.main}>
        {/* Connection Status */}
        <div className={styles.statusRow}>
          <div className={styles.statusLeft}>
            <span className={styles.statusDot} style={{ background: wallet.connected ? 'var(--color-success)' : 'var(--color-danger)' }} />
            <span className={styles.statusText}>
              {wallet.connected ? 'Friegter Wallet Connected' : 'No Wallet Connected'}
            </span>
          </div>
          <Badge variant="testnet" dot>Testnet</Badge>
        </div>

        {/* QR Code Card */}
        <Card glass glow className={styles.qrCard}>
          <p className={styles.qrLabel}>Your Wallet QR Code</p>
          <div
            className={styles.qrWrap}
            onClick={() => setQrExpanded(true)}
            role="button"
            tabIndex={0}
            aria-label="Tap to expand QR code"
            id="wallet-qr"
          >
            <QRCodeSVG
              value={wallet.address || 'friegter://no-wallet'}
              size={180}
              bgColor="transparent"
              fgColor="#F1F5F9"
              level="M"
            />
            <div className={styles.qrHint}>Tap to expand</div>
          </div>
        </Card>

        {/* Address Chip */}
        <Card className={styles.addressCard}>
          <p className={styles.addressLabel}>Wallet Address</p>
          <div className={styles.addressRow}>
            <span className={styles.addressValue}>{displayAddress}</span>
            <button
              className={[styles.copyBtn, copied ? styles.copyBtnDone : ''].join(' ')}
              onClick={copyAddress}
              id="copy-address"
              aria-label="Copy wallet address"
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </Card>

        {/* Balance */}
        <Card glow className={styles.balanceCard}>
          <div className={styles.balRow}>
            <div>
              <p className={styles.balLabel}>Testnet Balance</p>
              <p className={styles.balAmount}>{wallet.balance} <span>tFRGT</span></p>
              <p className={styles.balUsd}>≈ $0.00 (Testnet — no real value)</p>
            </div>
            <div className={styles.networkBadge}>
              <span className={styles.networkDot} />
              <span>Friegter Testnet</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className={styles.actionRow}>
          <Button variant="primary" size="lg" fullWidth leftIcon={<span>↑</span>}>
            Send
          </Button>
          <Button variant="ghost" size="lg" fullWidth leftIcon={<span>↓</span>}>
            Receive
          </Button>
        </div>

        {!wallet.connected && (
          <a href="/connect-wallet" className={styles.connectBtn}>
            <Button variant="primary" size="lg" fullWidth>
              Connect Friegter Wallet
            </Button>
          </a>
        )}
      </main>

      {/* QR Fullscreen Overlay */}
      {qrExpanded && (
        <div className={styles.qrOverlay} onClick={() => setQrExpanded(false)} role="dialog" aria-modal="true">
          <div className={styles.qrFull}>
            <p className={styles.qrFullLabel}>Scan to pay or identify</p>
            <QRCodeSVG
              value={wallet.address || 'friegter://no-wallet'}
              size={260}
              bgColor="white"
              fgColor="#0A0E1A"
              level="M"
              includeMargin
            />
            <p className={styles.qrFullAddress}>{displayAddress}</p>
            <p className={styles.qrTap}>Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
