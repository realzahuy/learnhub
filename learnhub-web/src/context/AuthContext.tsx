import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types/auth.types';
import { authService } from '../services/api/auth.service';
import { getRolesFromToken } from '../utils/jwt';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  syncRoles: () => void;
  login: (login: string, password: string) => Promise<string[]>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  const syncRoles = useCallback(() => {
    setRoles(getRolesFromToken(authService.getAccessToken()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        await authService.refreshTokens();
        const currentUser = await authService.getCurrentUser();
        if (cancelled) return;
        setUser(currentUser);
        syncRoles();
      } catch {
        if (cancelled) return;
        authService.clearAuth();
        setUser(null);
        setRoles([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [syncRoles]);

  const login = async (loginValue: string, password: string): Promise<string[]> => {
    try {
      const loginResponse = await authService.login({
        login: loginValue,
        password,
      });
      const nextRoles = getRolesFromToken(loginResponse.accessToken);
      setRoles(nextRoles);

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return nextRoles;
    } catch (error) {
      authService.clearAuth();
      setUser(null);
      setRoles([]);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    } finally {
      authService.clearAuth();
      setUser(null);
      setRoles([]);
    }
  };

  const updateUser = (updatedUser: User) => {
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
