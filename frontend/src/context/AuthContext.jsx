import { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, { username, password });
    const { access_token, username: uname, role } = res.data;
    setUser({ username: uname, role, token: access_token });
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    if (user?.token) {
      try {
        await axios.post(`${API}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch (e) { /* ignore */ }
    }
    setUser(null);
  }, [user]);

  const hasRole = useCallback(
    (minRole) => {
      if (!user) return false;
      const hierarchy = { viewer: 0, analyst: 1, admin: 2 };
      return (hierarchy[user.role] || 0) >= (hierarchy[minRole] || 0);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        token: user?.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
