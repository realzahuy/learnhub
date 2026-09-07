import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
import {
  setAuthenticatedUser,
  subscribeAuthSession,
} from '../services/api/tokenStore';

interface AuthContextType {
  user: AuthenticatedUser | null;
  userId: number | null;
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
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const currentUserIdRef = useRef<number | null>(null);

  const syncRoles = useCallback(() => {
    setRoles(getRolesFromToken(authService.getAccessToken()));
  }, []);

  useEffect(() => subscribeAuthSession((session) => {
    if (currentUserIdRef.current !== session.userId) {
      queryClient.clear();
      currentUserIdRef.current = session.userId;
    }
    setUser(session.user);
    setUserId(session.userId);
    setRoles(getRolesFromToken(session.token));
  }), []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        await authService.refreshTokens();
      } catch (error) {
        if (cancelled || isAccountLockedError(error)) return;

        if (isRefreshSessionRejected(error)) {
          authService.clearAuth();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleAccountLocked = (event: Event) => {
      const { message } = (event as CustomEvent<AccountLockedEventDetail>).detail;
      authService.clearAuth();
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
      return nextRoles;
    } catch (error) {
      authService.clearAuth();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {} finally {
      authService.clearAuth();
    }
  };

  const updateUser = useCallback((updatedUser: AuthenticatedUser) => {
    if (updatedUser.id !== undefined && updatedUser.id !== currentUserIdRef.current) return;
    setAuthenticatedUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
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
