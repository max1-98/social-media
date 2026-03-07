import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { handleLogin as authLogin, handleLogout as authLogout, handleRefresh } from '../components/functions/auth_functions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('user'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('user');
      setIsAuthenticated(!!stored);
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async ({ username, password, setError, navigate }) => {
    await authLogin({
      username,
      password,
      setError,
      setIsAuthenticated,
      navigate,
    });
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, []);

  const logout = useCallback(async ({ setError }) => {
    const result = await authLogout({ setIsAuthenticated, setError });
    if (result) {
      setUser(null);
    }
    return result;
  }, []);

  const refresh = useCallback(async () => {
    return await handleRefresh();
  }, []);

  const value = { isAuthenticated, user, login, logout, refresh };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
