import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';
  storeId?: string | null;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount and validate session
  useEffect(() => {
    const validateSession = async () => {
      // First, restore from localStorage immediately (for instant UI)
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Restore user immediately for better UX
          setUser(parsedUser);
          if (storedToken) setToken(storedToken);
          if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
      
      let authRejected = false;

      // Then validate session from cookies (primary method)
      try {
        // Use relative URL for API (same domain as storefront)
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include', // Send cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Store user in localStorage for UI persistence (not sensitive)
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          setLoading(false);
          return;
        } else if (response.status === 401) {
          authRejected = true;
          // 401 is normal for anonymous storefront visitors (no cookie on this host).
          if (storedRefreshToken) {
            console.log('Session expired, attempting refresh...');
          }
          try {
            if (!storedRefreshToken) {
              throw new Error('No refresh token');
            }
            const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData?.accessToken) {
                setToken(refreshData.accessToken);
                if (refreshData.refreshToken) {
                  setRefreshToken(refreshData.refreshToken);
                  localStorage.setItem(REFRESH_TOKEN_KEY, refreshData.refreshToken);
                }
                localStorage.setItem(TOKEN_KEY, refreshData.accessToken);
              }
              // Try /auth/me again after refresh
              const meResponse = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (meResponse.ok) {
                const userData = await meResponse.json();
                setUser(userData);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                authRejected = false;
                setLoading(false);
                return;
              }
            }
          } catch (refreshError) {
            if (storedRefreshToken) {
              console.error('Token refresh failed:', refreshError);
            }
          }
        }
      } catch (error) {
        // Network error, try localStorage token validation
        console.log('Cookie validation failed, trying localStorage token validation...', error);
      }
      
      // Fallback: Validate localStorage token if available
      if (storedToken && storedUser) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || '/api';
          const validateResponse = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`,
            },
            credentials: 'include',
          });
          
          if (validateResponse.ok) {
            const userData = await validateResponse.json();
            setUser(userData);
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            authRejected = false;
            setLoading(false);
            return;
          }
          authRejected = true;
        } catch (error) {
          console.error('Error validating stored token:', error);
          // Network error - keep user logged in with cached data
        }
      }

      if (authRejected) {
        clearAuth();
      }
      
      setLoading(false);
    };

    validateSession();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
    setRefreshToken(null);
  };

  const login = async (email: string, password: string) => {
    try {
      // Use relative URL for API (same domain as storefront)
      const API_URL = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // NEW: Send cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      setUser(data.user);
      
      // Always store user in localStorage for persistence (not sensitive)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      // LEGACY: Only store tokens in localStorage if feature flag enabled and tokens provided
      // After migration, remove this entirely
      const legacyTokenStorage = import.meta.env.VITE_LEGACY_TOKEN_STORAGE === 'true';
      if (legacyTokenStorage && data.accessToken) {
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      } else if (data.accessToken) {
        // New clients: tokens in cookies, but keep in state for backward compat
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        // Optionally store tokens in localStorage for fallback (if provided)
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      // NEW: Tokens in cookies, but we still store user in localStorage for persistence
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
  };

  const refreshAccessToken = async () => {
    const legacyTokenStorage = import.meta.env.VITE_LEGACY_TOKEN_STORAGE === 'true';
    const tokenFromStorage =
      typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    const tokenToUse = refreshToken || tokenFromStorage;

    if (!tokenToUse && !legacyTokenStorage) {
      // Cookie-only refresh (httpOnly cookie set at login on this host / shared domain).
    } else if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const refreshPayload = tokenToUse ? JSON.stringify({ refreshToken: tokenToUse }) : undefined;
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: refreshPayload ? { 'Content-Type': 'application/json' } : {},
        credentials: 'include',
        ...(refreshPayload ? { body: refreshPayload } : {}),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (legacyTokenStorage && data.accessToken) {
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      } else if (data.accessToken) {
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuth();
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Super Admin has all permissions
    if (user.role === 'SUPER_ADMIN') return true;
    
    // Admin has all permissions except 'users'
    if (user.role === 'ADMIN' && permission !== 'users') return true;
    
    // Check specific permission
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        login,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user,
        hasPermission,
        hasRole,
        loading,
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
