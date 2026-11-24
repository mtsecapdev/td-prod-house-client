import { useCallback, useEffect, useState } from 'react';
import { auth, AUTH_EVENT } from '../services/api';
import { AuthContext } from './auth';

/**
 * Who is signed in. user: undefined while checking, null when signed out, else
 * { id, username, display_name, role, must_change_password }. Any request that finds the session gone signs the
 * app out (AUTH_EVENT), so an expired session lands on the sign-in page instead of failing quietly.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  const refresh = useCallback(() => auth.me().then((d) => setUser(d.user)).catch(() => setUser(null)), []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onAuth = (e) => {
      if (e.detail === 'signed-out') setUser(null);
      if (e.detail === 'must-change-password') setUser((u) => (u ? { ...u, must_change_password: true } : u));
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const d = await auth.login(username, password);
    setUser(d.user);
    return d.user;
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout().catch(() => {});
    setUser(null);
  }, []);

  const changePassword = useCallback(async (current, next) => {
    const d = await auth.changePassword(current, next);
    setUser(d.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, changePassword, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
