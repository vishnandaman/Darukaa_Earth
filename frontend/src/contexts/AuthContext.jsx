import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi
        .getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const tokenData = await authApi.login({ username, password });
      if (!tokenData || !tokenData.access_token) {
        throw new Error('Invalid login response: no token received');
      }
      localStorage.setItem('token', tokenData.access_token);
      const userData = await authApi.getCurrentUser();
      if (!userData) {
        throw new Error('Failed to fetch user data');
      }
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      // Remove token if login fails
      localStorage.removeItem('token');
      throw error;
    }
  };

  const register = async (email, username, password, fullName) => {
    await authApi.register({ email, username, password, full_name: fullName });
    // Auto-login after registration
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

