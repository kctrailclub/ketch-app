import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getMe,
  logout as logoutApi,
  refreshSession,
  setAccessToken,
} from '../api/client';
import { registerPushNotifications } from '../utils/pushNotifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      await refreshSession();
      const res = await getMe();
      setUser(res.data);
      registerPushNotifications();
    } catch {
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const signIn = async (accessToken) => {
    setAccessToken(accessToken);
    const res = await getMe();
    setUser(res.data);
    registerPushNotifications();
  };

  const signOut = () => {
    logoutApi().catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
