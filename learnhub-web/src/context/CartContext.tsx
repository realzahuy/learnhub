import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CartItem } from '../types/cart.types';

const CART_STORAGE_KEY = 'cart';

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  totalPrice: number;
  isInCart: (courseId: number) => boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (courseId: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const loadCart = (): CartItem[] => {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Không thể lưu giỏ hàng:', error);
    }
  }, [items]);

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
