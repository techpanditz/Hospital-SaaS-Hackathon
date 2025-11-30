import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  // ✅ SAFE restore token
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });

  // ✅ SAFE restore user (NO CRASH EVER)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');

      if (!storedUser || storedUser === "undefined") return null;

      return JSON.parse(storedUser);
    } catch (err) {
      console.error("Invalid user in storage, clearing:", err);
      localStorage.removeItem('user');
      return null;
    }
  });

  // ✅ Safe re-hydration on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && !token) setToken(savedToken);

      if (savedUser && savedUser !== "undefined" && !user) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("Auth rehydrate failed:", err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  }, []); // run once only

  // ✅ LOGIN
  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // ✅ LOGOUT
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
