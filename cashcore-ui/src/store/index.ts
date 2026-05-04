import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'admin' | null;

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  fee: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  block?: number;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'restricted' | 'banned';
  walletAddress?: string;
  profileCid?: string;
  createdAt: string;
}

interface WalletState {
  address: string | null;
  connected: boolean;
  balance: string;
  network: string;
}

interface CashCoreStore {
  // Auth
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;

  // Wallet
  wallet: WalletState;

  // UI
  sendSheetOpen: boolean;
  activeTab: 'home' | 'wallet' | 'activity' | 'profile';
  theme: 'dark' | 'light';
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>;

  // Transactions cache
  transactions: Transaction[];
  txLoading: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setWallet: (wallet: Partial<WalletState>) => void;
  disconnectWallet: () => void;
  logout: () => void;
  setSendSheetOpen: (open: boolean) => void;
  setActiveTab: (tab: CashCoreStore['activeTab']) => void;
  toggleTheme: () => void;
  addToast: (message: string, type?: CashCoreStore['toasts'][0]['type']) => void;
  removeToast: (id: string) => void;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setTxLoading: (loading: boolean) => void;
}

export const useCashCoreStore = create<CashCoreStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      wallet: {
        address: null,
        connected: false,
        balance: '0',
        network: 'friegter-testnet-v1',
      },
      sendSheetOpen: false,
      activeTab: 'home',
      theme: 'dark',
      toasts: [],
      transactions: [],
      txLoading: false,

      // Actions
      setUser: (user) => set({ user, role: user?.role ?? null, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setWallet: (wallet) => set((s) => ({ wallet: { ...s.wallet, ...wallet } })),
      disconnectWallet: () =>
        set((s) => ({
          wallet: { ...s.wallet, address: null, connected: false, balance: '0' },
          user: s.user ? { ...s.user, walletAddress: undefined } : null,
        })),
      logout: () => {
        // Clear the session cookie the middleware reads
        if (typeof document !== 'undefined') {
          document.cookie = 'cc_session=; path=/; max-age=0';
        }
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          wallet: { address: null, connected: false, balance: '0', network: 'friegter-testnet-v1' },
          transactions: [],
        });
      },
      setSendSheetOpen: (open) => set({ sendSheetOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
      addToast: (message, type = 'info') => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => get().removeToast(id), 3500);
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (tx) =>
        set((s) => ({ transactions: [tx, ...s.transactions] })),
      setTxLoading: (txLoading) => set({ txLoading }),
    }),
    {
      name: 'cashcore-store',
      partialize: (s) => ({ user: s.user, token: s.token, role: s.role, wallet: s.wallet, theme: s.theme }),
    }
  )
);
