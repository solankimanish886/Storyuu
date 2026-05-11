import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach stored access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('storyuu.access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error codes that mean the session is definitively over — no refresh can fix this.
const SESSION_TERMINAL_CODES = ['ACCOUNT_BLOCKED', 'TOKEN_INVALIDATED'];

function isTerminalSessionError(error: unknown): boolean {
  const code = (error as any)?.response?.data?.error;
  return SESSION_TERMINAL_CODES.includes(code);
}

function endSession() {
  localStorage.removeItem('storyuu.access_token');
  // Signal the login page to show a session-ended notice
  sessionStorage.setItem('storyuu.session_ended', '1');
  window.location.replace('/login');
}

// On 401, try to refresh once, then redirect to login
let isRefreshing = false;
type QueueEntry = { resolve: (t: string) => void; reject: (e: unknown) => void };
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((entry) => (error ? entry.reject(error) : entry.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // 403 INSUFFICIENT_ROLE — user is authenticated but lacks the required role.
    // Redirect to dashboard; session remains valid.
    if (
      error.response?.status === 403 &&
      error.response?.data?.error === 'INSUFFICIENT_ROLE'
    ) {
      sessionStorage.setItem('storyuu.admin_notice', "You don't have permission to access that page.");
      window.location.replace('/admin/dashboard');
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Terminal codes (blocked / token invalidated) — skip refresh, end session immediately.
    if (isTerminalSessionError(error)) {
      processQueue(error, null);
      isRefreshing = false;
      endSession();
      return Promise.reject(error);
    }

    if (original._retry || (original.url as string | undefined)?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
      localStorage.setItem('storyuu.access_token', data.accessToken);
      processQueue(null, data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('storyuu.access_token');
      window.location.replace('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
