import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { CartItem } from '../types/cart.types';
import { enrollmentService } from '../services/api/enrollment.service';
import { useAuth } from './AuthContext';

const CART_STORAGE_KEY = 'cart';

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  totalPrice: number;
  isInCart: (courseId: number) => boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (courseId: number) => void;
  removeManyFromCart: (courseIds: number[]) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const parseCart = (raw: string | null): CartItem[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item?.price === 'number' && item.price > 0)
      : [];
  } catch {
    return [];
  }
};

const loadCart = (): CartItem[] => {
  try {
    const storedCart = parseCart(localStorage.getItem(CART_STORAGE_KEY));
    const legacyCartRaw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (legacyCartRaw !== null) {
      const migratedCart = [...storedCart];
      const storedCourseIds = new Set(storedCart.map((item) => item.id));
      parseCart(legacyCartRaw).forEach((item) => {
        if (storedCourseIds.has(item.id)) return;
        storedCourseIds.add(item.id);
        migratedCart.push(item);
      });

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(migratedCart));
      sessionStorage.removeItem(CART_STORAGE_KEY);
      return migratedCart;
    }
    return storedCart;
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const reconciledAuthenticationRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    const syncCartAcrossTabs = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== CART_STORAGE_KEY) return;
      setItems(parseCart(event.newValue));
    };

    window.addEventListener('storage', syncCartAcrossTabs);
    return () => window.removeEventListener('storage', syncCartAcrossTabs);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      reconciledAuthenticationRef.current = false;
      return;
    }
    if (reconciledAuthenticationRef.current || items.length === 0) return;

    reconciledAuthenticationRef.current = true;
    const controller = new AbortController();
    const courseIds = items.map((item) => item.id);

    enrollmentService.checkEnrolledBatch(courseIds, controller.signal)
      .then((enrolledCourseIds) => {
        if (controller.signal.aborted || enrolledCourseIds.length === 0) return;
        const enrolledIds = new Set(enrolledCourseIds);
        setItems((current) => current.filter((item) => !enrolledIds.has(item.id)));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [isAuthenticated]);

  const isInCart = useCallback(
    (courseId: number) => items.some((item) => item.id === courseId),
    [items]
  );

  const addToCart = useCallback((item: CartItem) => {
    setItems((prev) => {

      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((courseId: number) => {
    setItems((prev) => prev.filter((item) => item.id !== courseId));
  }, []);

  const removeManyFromCart = useCallback((courseIds: number[]) => {
    const removedIds = new Set(courseIds);
    setItems((prev) => prev.filter((item) => !removedIds.has(item.id)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const cartCount = items.length;
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        totalPrice,
        isInCart,
        addToCart,
        removeFromCart,
        removeManyFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
};
