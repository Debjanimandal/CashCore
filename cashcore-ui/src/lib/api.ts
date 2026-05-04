// Central API client — all calls go through the Rust backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers = {} } = opts;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: unknown }>('/api/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string; role: 'user' | 'admin' }) =>
    request<{ token: string; user: unknown; requires_otp?: boolean }>('/api/auth/login', { method: 'POST', body: data }),

  verifyOtp: (data: { otp_code: string }, token: string) =>
    request<{ token: string }>('/api/auth/verify-otp', { method: 'POST', body: data, token }),

  me: (token: string) =>
    request<{ user: unknown }>('/api/auth/me', { token }),
};

// --- Wallet ---
export const walletApi = {
  connect: (data: { address: string; signature: string; public_key: string }, token: string) =>
    request<{ profile_cid: string }>('/api/wallet/connect', { method: 'POST', body: data, token }),

  getBalance: (token: string) =>
    request<{ balance: string; address: string }>('/api/wallet/balance', { token }),

  disconnect: (token: string) =>
    request<{ success: boolean }>('/api/wallet/disconnect', { method: 'POST', token }),
};

// --- Transactions ---
export const txApi = {
  initiate: (data: { to: string; amount: string }, token: string) =>
    request<{ tx_hash: string; status: string }>('/api/tx/initiate', { method: 'POST', body: data, token }),

  getHistory: (token: string, params?: { page?: number; filter?: string }) => {
    const query = new URLSearchParams({ page: String(params?.page ?? 1), filter: params?.filter ?? 'all' });
    return request<{ transactions: unknown[]; total: number; page: number }>(`/api/tx/history?${query}`, { token });
  },

  getDetail: (hash: string, token: string) =>
    request<unknown>(`/api/tx/${hash}`, { token }),
};

// --- Admin ---
export const adminApi = {
  getUsers: (token: string, params?: { page?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams({
      page: String(params?.page ?? 1),
      status: params?.status ?? 'all',
      ...(params?.search ? { search: params.search } : {}),
    });
    return request<{ users: unknown[]; total: number }>(`/api/admin/users?${query}`, { token });
  },

  getUser: (id: string, token: string) =>
    request<unknown>(`/api/admin/users/${id}`, { token }),

  getUserTx: (id: string, token: string) =>
    request<{ transactions: unknown[] }>(`/api/admin/users/${id}/transactions`, { token }),

  updateUserStatus: (id: string, status: string, token: string) =>
    request<{ success: boolean }>(`/api/admin/users/${id}/status`, { method: 'PATCH', body: { status }, token }),

  getTransactions: (token: string, params?: { page?: number; filter?: string }) => {
    const query = new URLSearchParams({ page: String(params?.page ?? 1), filter: params?.filter ?? 'all' });
    return request<{ transactions: unknown[]; total: number }>(`/api/admin/transactions?${query}`, { token });
  },

  flagTransaction: (hash: string, token: string) =>
    request<{ success: boolean }>(`/api/admin/transactions/${hash}/flag`, { method: 'PATCH', token }),

  getStats: (token: string) =>
    request<{ total_users: number; active_wallets: number; transactions_today: number; volume_today: string }>('/api/admin/stats', { token }),
};
