'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './QrScannerModal.module.css';

interface Props {
  onClose: () => void;
}

function isValidStellar(addr: string) {
  return addr.startsWith('G') && addr.length === 56 && /^[A-Z2-7]+$/.test(addr);
}

/** Extracts a Stellar address from either a raw address or a cashcore deep-link URL */
function extractAddress(raw: string): string | null {
  raw = raw.trim();
  // Deep link: http(s)://.../send?to=GADDR
  try {
    const url = new URL(raw);
    const toParam = url.searchParams.get('to');
    if (toParam && isValidStellar(toParam)) return toParam;
  } catch {
    // not a URL — fall through
  }
  // Raw Stellar address
  if (isValidStellar(raw)) return raw;
  return null;
}

export default function QrScannerModal({ onClose }: Props) {
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const containerId = 'cashcore-qr-scanner';
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'scanning' | 'success' | 'error'>('scanning');

  useEffect(() => {
    let html5QrCode: any;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            const address = extractAddress(decodedText);
            if (address) {
              setStatus('success');
              html5QrCode.stop().catch(() => {});
              setTimeout(() => {
                router.push(`/send?to=${address}`);
                onClose();
              }, 600);
            } else {
              setError('QR code is not a valid CashCore or Stellar address.');
              setStatus('error');
              html5QrCode.stop().catch(() => {});
            }
          },
          () => {} // ignore per-frame errors
        );
      } catch (e: any) {
        setError(e?.message || 'Camera access denied. Please allow camera permissions.');
        setStatus('error');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="QR Scanner">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.scanIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="5" rx="1" />
                <rect x="16" y="3" width="5" height="5" rx="1" />
                <rect x="3" y="16" width="5" height="5" rx="1" />
                <path d="M16 16h2v2h-2zM18 18h2v2h-2zM16 20h2" />
                <path d="M12 3v2M12 7v2M3 12h2M7 12h2M12 12h2M16 12h2M20 12h2M12 17v2M12 21v2" />
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>Scan to Pay</h2>
              <p className={styles.subtitle}>Point camera at a CashCore QR code</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close scanner" id="qr-scanner-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scanner viewport */}
        <div className={styles.viewportWrap}>
          <div id={containerId} className={styles.viewport} />

          {/* Corner frame overlays */}
          <div className={styles.frameCornerTL} />
          <div className={styles.frameCornerTR} />
          <div className={styles.frameCornerBL} />
          <div className={styles.frameCornerBR} />

          {/* Scan line animation */}
          {status === 'scanning' && <div className={styles.scanLine} />}

          {/* Success overlay */}
          {status === 'success' && (
            <div className={styles.successOverlay}>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successText}>Address found!</p>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className={styles.errorOverlay}>
              <div className={styles.errorIcon}>✕</div>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryBtn} onClick={() => { setStatus('scanning'); setError(''); window.location.reload(); }}>
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Hint */}
        {status === 'scanning' && (
          <p className={styles.hint}>
            Align the QR code within the frame.<br />
            Works with CashCore wallet QR codes.
          </p>
        )}
      </div>
    </div>
  );
}
