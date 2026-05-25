'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import QrScannerModal from '@/components/ui/QrScannerModal';
import { useCashCoreStore } from '@/store';
import styles from './send.module.css';

type Step = 1 | 2 | 3 | 4;

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FEE = '100'; // stroops (0.00001 XLM base fee)
const FEE_DISPLAY = '0.00001';

function isValidStellar(addr: string) {
  return addr.startsWith('G') && addr.length === 56 && /^[A-Z2-7]+$/.test(addr);
}

export default function SendPage() {
  return (
    <Suspense fallback={null}>
      <SendPageInner />
    </Suspense>
  );
}

function SendPageInner() {
  const { wallet, addToast, addTransaction } = useCashCoreStore();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [fromQr, setFromQr] = useState(false);

  // Pre-fill recipient from QR deep-link: /send?to=GADDR...
  useEffect(() => {
    const addr = searchParams.get('to');
    if (addr && isValidStellar(addr)) {
      setTo(addr);
      setFromQr(true);
      setStep(2); // jump straight to amount step
    }
  }, [searchParams]);

  const reset = () => { setStep(1); setTo(''); setAmount(''); setError(''); setTxHash(''); };

  const canStep2 = isValidStellar(to);
  const canStep3 = !!amount && parseFloat(amount) > 0;

  const handleSend = async () => {
    setLoading(true);
    setError('');

    try {
      const { signTransaction } = await import('@stellar/freighter-api');
      const stellar = await import('@stellar/stellar-sdk');
      const {
        TransactionBuilder, Networks, Operation, Asset, Memo,
        Keypair
      } = stellar;

      const fromAddress = wallet.address;
      if (!fromAddress) throw new Error('Wallet not connected. Please connect Freighter first.');

      // 1. Load sender account from Horizon
      const server = new stellar.Horizon.Server(HORIZON_URL);
      const senderAccount = await server.loadAccount(fromAddress);

      // 2. Build the payment transaction
      const xlmAmount = parseFloat(amount).toFixed(7);
      const tx = new TransactionBuilder(senderAccount, {
        fee: FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: to,
            asset: Asset.native(), // XLM
            amount: xlmAmount,
          })
        )
        .addMemo(Memo.text('CashCore testnet'))
        .setTimeout(180)
        .build();

      // 3. Sign with Freighter
      const signResult = await signTransaction(tx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      if (signResult.error) {
        throw new Error(signResult.error);
      }

      // 4. Submit to Stellar Testnet Horizon
      const signedTx = stellar.TransactionBuilder.fromXDR(
        signResult.signedTxXdr,
        Networks.TESTNET
      );

      const submitResult = await server.submitTransaction(signedTx as any);
      const hash = submitResult.hash;

      // 5. Update app state
      addTransaction({
        hash,
        from: fromAddress,
        to,
        amount: `-${amount}`,
        token: 'XLM',
        fee: FEE_DISPLAY,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        block: undefined,
      });

      setTxHash(hash);
      addToast('Transaction confirmed on Stellar Testnet! ✓', 'success');
      setStep(4);

    } catch (e: any) {
      const raw = e?.response?.data?.extras?.result_codes || e?.message || 'Transaction failed';
      const msg = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);

      // Friendly error messages
      if (msg.includes('op_underfunded') || msg.includes('UNDERFUNDED')) {
        setError('Insufficient XLM balance. Fund your wallet at https://friendbot.stellar.org');
      } else if (msg.includes('op_no_destination') || msg.includes('NO_DESTINATION')) {
        setError('Recipient account does not exist on Stellar Testnet. They need to be funded first.');
      } else if (msg.includes('User declined') || msg.includes('rejected')) {
        setError('Transaction cancelled in Freighter.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.page}>
        <TopBar title="Send XLM" />

        <main className={styles.main}>
          {/* Step Indicator */}
          <div className={styles.steps}>
            {[1, 2, 3].map((s) => (
              <div key={s} className={styles.stepWrap}>
                <div className={[styles.stepDot, step >= s ? styles.stepDotActive : '', step > s ? styles.stepDotDone : ''].join(' ')}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={[styles.stepLine, step > s ? styles.stepLineDone : ''].join(' ')} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Recipient */}
          {step === 1 && (
            <Card className={styles.stepCard}>
              <h2 className={styles.stepTitle}>Enter Recipient</h2>
              <p className={styles.stepDesc}>Paste the Stellar wallet address or scan a QR code.</p>

              {/* Scan QR button */}
              <button
                type="button"
                className={styles.scanQrBtn}
                onClick={() => setScannerOpen(true)}
                id="send-scan-qr"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="5" height="5" rx="1" />
                  <rect x="16" y="3" width="5" height="5" rx="1" />
                  <rect x="3" y="16" width="5" height="5" rx="1" />
                  <path d="M16 16h2v2h-2zM18 18h2v2h-2zM16 20h2" />
                  <path d="M12 3v2M12 7v2M3 12h2M7 12h2M12 12h2M16 12h2M20 12h2M12 17v2" />
                </svg>
                Scan QR Code
              </button>

              <div className={styles.orDivider}><span>or enter manually</span></div>

              <Input
                label="Stellar Wallet Address"
                placeholder="GABCDE...XYZ"
                value={to}
                onChange={(e) => setTo(e.target.value.trim().toUpperCase())}
                id="send-recipient"
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }
              />
              {to.length > 0 && !isValidStellar(to) && (
                <p className={styles.error}>
                  {to.startsWith('G')
                    ? `Address must be 56 characters (${to.length}/56)`
                    : 'Address must start with G'}
                </p>
              )}
              <div style={{ display: 'flex' }}>
                <Button variant="primary" size="lg" disabled={!canStep2} onClick={() => setStep(2)} id="send-step2">
                  Continue →
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2 — Amount */}
          {step === 2 && (
            <Card className={styles.stepCard}>
              <h2 className={styles.stepTitle}>Enter Amount</h2>
              <p className={styles.stepDesc}>
                Sending to: <span className={styles.monoText}>{to.slice(0, 12)}...{to.slice(-6)}</span>
                {fromQr && <span className={styles.qrBadge}>📷 via QR scan</span>}
              </p>
              <div className={styles.amountWrap}>
                <input
                  className={styles.amountInput}
                  type="number"
                  placeholder="0"
                  value={amount}
                  min="0"
                  step="0.01"
                  onChange={(e) => setAmount(e.target.value)}
                  id="send-amount"
                />
                <span className={styles.amountToken}>XLM</span>
              </div>
              <div className={styles.feeRow}>
                <span className={styles.feeLabel}>Network fee</span>
                <span className={styles.feeValue}>~ {FEE_DISPLAY} XLM</span>
              </div>
              <div className={styles.balRow}>
                <span className={styles.feeLabel}>Available</span>
                <span className={styles.feeValue}>{wallet.balance} XLM</span>
              </div>
              <div className={styles.actionRow}>
                <Button variant="secondary" size="lg" onClick={() => setStep(1)} id="send-back2">Back</Button>
                <Button variant="primary" size="lg" disabled={!canStep3} onClick={() => setStep(3)} id="send-step3">Review →</Button>
              </div>
            </Card>
          )}

          {/* Step 3 — Confirm */}
          {step === 3 && (
            <Card className={styles.stepCard}>
              <h2 className={styles.stepTitle}>Confirm Transfer</h2>
              <div className={styles.confirmCard}>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>From</span>
                  <span className={styles.confirmMono}>{wallet.address?.slice(0, 12)}...{wallet.address?.slice(-6)}</span>
                </div>
                <div className={styles.confirmArrow}>↓</div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>To</span>
                  <span className={styles.confirmMono}>{to.slice(0, 12)}...{to.slice(-6)}</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Amount</span>
                  <span className={styles.confirmAmount}>{amount} XLM</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Fee</span>
                  <span className={styles.confirmLabel}>{FEE_DISPLAY} XLM</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Total</span>
                  <span className={styles.confirmTotal}>{(parseFloat(amount) + parseFloat(FEE_DISPLAY)).toFixed(5)} XLM</span>
                </div>
                <Badge variant="testnet" dot>Stellar Testnet · No real value</Badge>
              </div>

              {/* Freighter signing note */}
              <p className={styles.signingNote}>
                🔐 Freighter will ask you to approve this transaction
              </p>

              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actionRow}>
                <Button variant="secondary" size="lg" onClick={() => setStep(2)} id="send-back3">Back</Button>
                <Button variant="primary" size="lg" loading={loading} onClick={handleSend} id="send-confirm">
                  {loading ? 'Waiting for Freighter…' : 'Confirm & Send'}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 4 — Success */}
          {step === 4 && (
            <Card className={styles.stepCard}>
              <div className={styles.success}>
                <div className={styles.successIcon}>✓</div>
                <h2 className={styles.successTitle}>Transaction Confirmed!</h2>
                <p className={styles.successDesc}>Your XLM transfer has been confirmed on Stellar Testnet.</p>
                <div className={styles.hashRow}>
                  <span className={styles.hashLabel}>TX Hash</span>
                  <span className={styles.hashValue}>{txHash}</span>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ width: '100%' }}
                >
                  <Button variant="ghost" size="lg" id="send-explorer">
                    View on Explorer ↗
                  </Button>
                </a>
                <Badge variant="success" dot>Confirmed on Stellar Testnet</Badge>
                <Button variant="ghost" size="lg" onClick={reset} id="send-again">
                  Send Another
                </Button>
                <a href="/activity">
                  <Button variant="secondary" size="lg" id="send-view-history">
                    View History
                  </Button>
                </a>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* QR Scanner opened from Send page */}
      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
    </>
  );
}
