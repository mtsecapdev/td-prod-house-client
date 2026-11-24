import { createContext, useContext } from 'react';

// The signed-in user and account actions; provided by AuthContext.jsx.
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/** Initials for the account button ("Test Admin" → "TA"). */
export function initialsOf(user) {
  const name = (user?.display_name || user?.username || '?').trim();
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
