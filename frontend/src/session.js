export const ADMIN_MODE_KEY = 'adminMode';
export const AUTH_USER_KEY = 'authUser';
export const AUTH_TOKEN_KEY = 'authToken';

export function readStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function hasAuthToken() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));
  } catch {
    return false;
  }
}

export function persistSession(user, token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(ADMIN_MODE_KEY, '1');
  }
  if (user) {
    try {
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(ADMIN_MODE_KEY);
}
