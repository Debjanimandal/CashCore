'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useCashCoreStore } from '@/store';
import Button from '@/components/ui/Button';
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

      // Admin role check
      if (role === 'admin') {
        if (meta.role !== 'admin') {
          throw new Error('This account does not have admin privileges.');
        }
        setTempToken(session.access_token);
        setOtpStep(true);
        setLoading(false);
        return;
      }

      // Set session cookie for middleware
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
      // For admin: OTP is a simple 6-digit pin (configurable)
      // In production wire this to a real TOTP library
      if (otp.length !== 6) throw new Error('Enter a 6-digit OTP code');

      // Use the Supabase token stored during admin login
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
      {/* Background glow */}
      <div className={styles.bgGlow} />

      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="url(#loginGrad)" />
            <path d="M16 24L22 18L28 24L22 30L16 24Z" fill="white" opacity="0.9" />
            <path d="M22 18L28 12L34 18L28 24L22 18Z" fill="white" opacity="0.6" />
            <path d="M22 30L28 24L34 30L28 36L22 30Z" fill="white" opacity="0.6" />
            <defs>
              <linearGradient id="loginGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00D4C8" /><stop offset="1" stopColor="#0099A8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className={styles.wordmark}>CashCore</h1>
        <p className={styles.tagline}>Friegter Wallet · Testnet</p>
      </div>

      {/* Role Tabs */}
      <div className={styles.roleTabs} role="tablist" aria-label="Select account type">
        <button
          role="tab"
          aria-selected={role === 'user'}
          className={[styles.roleTab, role === 'user' ? styles.roleTabActive : ''].join(' ')}
          onClick={() => { setRole('user'); setError(''); setOtpStep(false); }}
          id="tab-user"
        >
          User
        </button>
        <button
          role="tab"
          aria-selected={role === 'admin'}
          className={[styles.roleTab, role === 'admin' ? styles.roleTabActiveAdmin : ''].join(' ')}
          onClick={() => { setRole('admin'); setError(''); setOtpStep(false); }}
          id="tab-admin"
        >
          Admin
        </button>
      </div>

      {/* Form */}
      <div className={styles.formCard}>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              {...register('password')}
            />

            {error && <p className={styles.errorMsg} role="alert">{error}</p>}

            <Button
              type="submit"
              variant={role === 'admin' ? 'admin' : 'primary'}
              size="lg"
              fullWidth
              loading={loading}
              id="login-submit"
            >
              Sign In as {role === 'admin' ? 'Admin' : 'User'}
            </Button>

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
            <p className={styles.otpDesc}>Enter your 6-digit authenticator code to continue</p>
            <Input
              label="OTP Code"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              id="login-otp"
            />
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
            <Button variant="admin" size="lg" fullWidth loading={loading} onClick={onOtpSubmit} id="otp-submit">
              Verify &amp; Enter Dashboard
            </Button>
            <button className={styles.backLink} onClick={() => setOtpStep(false)}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
