import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthenticatedUser } from '../types/auth.types';
import { authService } from '../services/api/auth.service';
import { getRolesFromToken } from '../utils/jwt';
import { useNavigate } from 'react-router-dom';
import {
  ACCOUNT_LOCKED_EVENT,
  AccountLockedEventDetail,
  isAccountLockedError,
  isRefreshSessionRejected,
} from '../services/authSessionEvents';
import { ROUTE_PATHS } from '../routes/paths';
import { queryClient } from '../query/queryClient';

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  syncRoles: () => void;
  login: (login: string, password: string) => Promise<string[]>;
  logout: () => Promise<void>;
  updateUser: (user: AuthenticatedUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  const syncRoles = useCallback(() => {
    setRoles(getRolesFromToken(authService.getAccessToken()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const refreshed = await authService.refreshTokens();
        if (cancelled) return;
        setUser(refreshed.user);
        syncRoles();
      } catch (error) {
        if (cancelled || isAccountLockedError(error)) return;

        if (isRefreshSessionRejected(error)) {
          authService.clearAuth();
          setUser(null);
          setRoles([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [syncRoles]);

  useEffect(() => {
    const handleAccountLocked = (event: Event) => {
      const { message } = (event as CustomEvent<AccountLockedEventDetail>).detail;
      authService.clearAuth();
      queryClient.clear();
      setUser(null);
      setRoles([]);
      setIsLoading(false);
      navigate(ROUTE_PATHS.login, {
        replace: true,
        state: { authError: message },
      });
    };

    window.addEventListener(ACCOUNT_LOCKED_EVENT, handleAccountLocked);
    return () => window.removeEventListener(ACCOUNT_LOCKED_EVENT, handleAccountLocked);
  }, [navigate]);

  const login = async (loginValue: string, password: string): Promise<string[]> => {
    try {
      const loginResponse = await authService.login({
        login: loginValue,
        password,
      });
      const nextRoles = getRolesFromToken(loginResponse.accessToken);
      queryClient.clear();
      setRoles(nextRoles);

      setUser(loginResponse.user);
      return nextRoles;
    } catch (error) {
      authService.clearAuth();
      queryClient.clear();
      setUser(null);
      setRoles([]);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {} finally {
      authService.clearAuth();
      queryClient.clear();
      setUser(null);
      setRoles([]);
    }
  };

  const updateUser = (updatedUser: AuthenticatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        roles,
        syncRoles,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};
