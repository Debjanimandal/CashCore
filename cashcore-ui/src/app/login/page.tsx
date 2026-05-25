'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useCashCoreStore } from '@/store';
import Input from '@/components/ui/Input';
import styles from './login.module.css';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken, addToast } = useCashCoreStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (authError) throw new Error(authError.message);
      if (!authData.session || !authData.user) throw new Error('Login failed. Please try again.');

      const user = authData.user;
      const session = authData.session;
      const meta = user.user_metadata || {};

      if (role === 'admin') {
        if (meta.role !== 'admin') throw new Error('This account does not have admin privileges.');
        setTempToken(session.access_token);
        setOtpStep(true);
        setLoading(false);
        return;
      }

      document.cookie = `cc_session=${session.access_token}; path=/; max-age=86400; SameSite=Lax`;
      setToken(session.access_token);
      setUser({
        id: user.id,
        email: user.email ?? '',
        displayName: meta.display_name ?? user.email ?? 'User',
        role: meta.role ?? 'user',
        status: 'active',
        walletAddress: meta.wallet_address ?? undefined,
        createdAt: user.created_at,
      });
      addToast('Signed in successfully', 'success');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (otp.length !== 6) throw new Error('Enter a 6-digit OTP code');
      const { data: { user } } = await supabase.auth.getUser(tempToken);
      if (!user) throw new Error('Session expired. Please log in again.');
      const meta = user.user_metadata || {};
      document.cookie = `cc_session=${tempToken}; path=/; max-age=86400; SameSite=Lax`;
      setToken(tempToken);
      setUser({
        id: user.id,
        email: user.email ?? '',
        displayName: meta.display_name ?? user.email ?? 'Admin',
        role: 'admin',
        status: 'active',
        walletAddress: meta.wallet_address ?? undefined,
        createdAt: user.created_at,
      });
      addToast('Admin access granted', 'success');
      router.push('/admin/dashboard');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left branding panel (desktop only) */}
      <div className={styles.leftPanel}>
        <div className={styles.brandLogo}>
          <div className={styles.brandIconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12h6M12 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className={styles.brandName}>CashCore</span>
        </div>

        <h2 className={styles.brandHeadline}>
          Your digital wallet<br />on the <span>Stellar</span> network
        </h2>

        <p className={styles.brandDesc}>
          Send, receive, and manage XLM on the Stellar testnet. Fast, secure, and built for the next generation of payments.
        </p>

        <div className={styles.brandFeatures}>
          {['Instant cross-border transfers', 'Freighter wallet integration', 'Real-time transaction history', 'Secure Supabase authentication'].map((f) => (
            <div key={f} className={styles.featureItem}>
              <span className={styles.featureDot} />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          {/* Mobile branding */}
          <div className={styles.mobileBrand}>
            <div className={styles.mobileLogo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12h6M12 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={styles.mobileLogoText}>CashCore</span>
          </div>

          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>
              {otpStep ? 'Two-factor auth' : 'Sign in to your account'}
            </h1>
            <p className={styles.formSubtitle}>
              {otpStep
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Welcome back! Enter your credentials to continue.'}
            </p>
          </div>

          {/* Role Tabs */}
          {!otpStep && (
            <div className={styles.roleTabs} role="tablist">
              <button
                role="tab"
                aria-selected={role === 'user'}
                className={[styles.roleTab, role === 'user' ? styles.roleTabActive : ''].join(' ')}
                onClick={() => { setRole('user'); setError(''); }}
                id="tab-user"
              >
                User
              </button>
              <button
                role="tab"
                aria-selected={role === 'admin'}
                className={[styles.roleTab, role === 'admin' ? styles.roleTabActiveAdmin : ''].join(' ')}
                onClick={() => { setRole('admin'); setError(''); }}
                id="tab-admin"
              >
                Admin
              </button>
            </div>
          )}

          {/* Form */}
          {!otpStep ? (
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                autoComplete="email"
                id="login-email"
                leftIcon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                autoComplete="current-password"
                id="login-password"
                leftIcon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
                {...register('password')}
              />

              {error && <p className={styles.errorMsg} role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={`${styles.submitBtn} ${role === 'admin' ? styles.adminBtn : ''}`}
                id="login-submit"
              >
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.7s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Signing in…
                  </>
                ) : `Sign in as ${role === 'admin' ? 'Admin' : 'User'}`}
              </button>

              <div className={styles.links}>
                <a href="#" className={styles.link}>Forgot password?</a>
                {role === 'user' && (
                  <a href="/register" className={styles.link}>Create account</a>
                )}
              </div>
            </form>
          ) : (
            <div className={styles.otpSection}>
              <div className={styles.otpIcon}>🔐</div>
              <h2 className={styles.otpTitle}>Admin Verification</h2>
              <p className={styles.otpDesc}>Enter your 6-digit authenticator code to continue as admin.</p>
              <Input
                label="OTP Code"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                id="login-otp"
              />
              {error && <p className={styles.errorMsg} role="alert">{error}</p>}
              <button
                disabled={loading}
                className={`${styles.submitBtn} ${styles.adminBtn}`}
                onClick={onOtpSubmit}
                id="otp-submit"
              >
                {loading ? 'Verifying…' : 'Verify & Enter Dashboard'}
              </button>
              <button className={styles.backLink} onClick={() => setOtpStep(false)}>← Back to login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
