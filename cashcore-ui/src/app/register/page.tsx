'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useCashCoreStore } from '@/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import styles from './register.module.css';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken, addToast } = useCashCoreStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');
  const strength = getStrength(password);

  const handleNext = async () => {
    const valid = await trigger(['name', 'email']);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setApiError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.name,
            role: 'user',
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Registration failed. Please try again.');

      const user = authData.user;
      const session = authData.session;

      // session can be null if email confirmation is ON — remind user
      if (!session) {
        addToast('Check your email to confirm your account, then log in.', 'success');
        router.push('/login');
        return;
      }

      // Set session cookie for middleware
      document.cookie = `cc_session=${session.access_token}; path=/; max-age=86400; SameSite=Lax`;

      setToken(session.access_token);
      setUser({
        id: user.id,
        email: user.email ?? data.email,
        displayName: data.name,
        role: 'user',
        status: 'active',
        walletAddress: undefined,
        createdAt: user.created_at,
      });

      addToast('Account created! Welcome to CashCore.', 'success');
      router.push('/connect-wallet');
    } catch (e: any) {
      setApiError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="url(#rGrad)" />
              <path d="M20 10 L28 20 L20 30 L12 20 Z" fill="white" fillOpacity="0.9" />
              <circle cx="20" cy="20" r="4" fill="white" />
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#00D4C8" />
                  <stop offset="1" stopColor="#0099A8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className={styles.appName}>CashCore</h1>
            <p className={styles.appSub}>Friegter Wallet · Testnet</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className={styles.stepRow}>
          <div className={styles.stepItem}>
            <div className={[styles.stepDot, styles.stepDotActive].join(' ')}>1</div>
            <span className={[styles.stepLabel, step >= 1 ? styles.stepLabelActive : ''].join(' ')}>
              Your info
            </span>
          </div>
          <div className={[styles.stepLine, step === 2 ? styles.stepLineDone : ''].join(' ')} />
          <div className={styles.stepItem}>
            <div className={[styles.stepDot, step === 2 ? styles.stepDotActive : ''].join(' ')}>2</div>
            <span className={[styles.stepLabel, step === 2 ? styles.stepLabelActive : ''].join(' ')}>
              Password
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          {/* Step 1 */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Create your account</h2>
              <p className={styles.stepDesc}>Enter your name and email to get started.</p>

              <Input
                label="Full Name"
                placeholder="Alex Vera"
                id="register-name"
                error={errors.name?.message}
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
                {...register('name')}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                id="register-email"
                error={errors.email?.message}
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
                {...register('email')}
              />

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleNext}
                id="register-next"
              >
                Continue →
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Set your password</h2>
              <p className={styles.stepDesc}>Use at least 8 characters with a mix of letters and numbers.</p>

              <div className={styles.inputWrap}>
                <Input
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  id="register-password"
                  error={errors.password?.message}
                  leftIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                  rightElement={
                    <button type="button" onClick={() => setShowPass((v) => !v)} className={styles.eyeBtn} tabIndex={-1}>
                      {showPass ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                  {...register('password')}
                />
              </div>

              {/* Strength Bar */}
              {password.length > 0 && (
                <div className={styles.strengthWrap}>
                  <div className={styles.strengthBar}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={styles.strengthSegment}
                        style={{
                          background: i <= strength.score
                            ? strength.color
                            : 'var(--bg-elevated)',
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              <div className={styles.inputWrap}>
                <Input
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  id="register-confirm"
                  error={errors.confirm?.message}
                  leftIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  }
                  rightElement={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className={styles.eyeBtn} tabIndex={-1}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  }
                  {...register('confirm')}
                />
              </div>

              {/* Terms */}
              <p className={styles.terms}>
                By creating an account you agree to our{' '}
                <span className={styles.termsLink}>Terms of Service</span> and{' '}
                <span className={styles.termsLink}>Privacy Policy</span>.{' '}
                <Badge variant="testnet">Testnet · No real money</Badge>
              </p>

              {apiError && <p className={styles.error}>{apiError}</p>}

              <div className={styles.actionRow}>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setStep(1)}
                  id="register-back"
                >
                  ← Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  id="register-submit"
                >
                  Create Account
                </Button>
              </div>
            </div>
          )}
        </form>

        <p className={styles.loginLink}>
          Already have an account?{' '}
          <a href="/login" id="goto-login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Weak', color: 'var(--color-danger)' },
    { label: 'Fair', color: 'var(--color-warning)' },
    { label: 'Good', color: '#60A5FA' },
    { label: 'Strong', color: 'var(--color-success)' },
  ];
  return { score, ...(levels[score - 1] ?? levels[0]) };
}
