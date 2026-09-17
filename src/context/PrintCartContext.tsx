import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ProdigiBundleSubItem } from '../services/prodigiService';

export interface CartItem {
  id: string; // Unique identifier for cart item: `${photoId}-${sku}`
  photoId: string;
  title: string;
  previewUrl: string;
  highResUrl?: string;
  driveFileId?: string;
  sku: string;
  formatName: string;
  price: number;
  copies: number;
  wholesaleCost?: number;
  creatorId?: string;
  creatorPayPalEmail?: string;
  creatorName?: string;
  sizing?: string;
  attributes?: Record<string, string>;
  isBundle?: boolean;
  bundleItems?: ProdigiBundleSubItem[];
  dimensions?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export type CartItemInput = Omit<CartItem, 'id'> & { id?: string };

interface PrintCartContextType {
  cart: CartItem[];
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (itemId: string) => void;
  updateCopies: (itemId: string, count: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalUniqueItems: number;
  subtotal: number;
  wholesaleTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
}

const PrintCartContext = createContext<PrintCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'just1play_print_cart_v1';

export const PrintCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[PrintCart] Could not load saved cart from localStorage', e);
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('[PrintCart] Failed to persist cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (input: CartItemInput) => {
    const itemCopies = Math.max(1, input.copies || 1);
    const resolvedId = input.id || `${input.photoId || 'photo'}-${input.sku}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((it) => it.id === resolvedId || (it.photoId === input.photoId && it.sku === input.sku));
      if (existingIdx > -1) {
        // Increment quantity of existing cart item
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          copies: updated[existingIdx].copies + itemCopies,
          // Update preview/drive file if more up-to-date
          previewUrl: input.previewUrl || updated[existingIdx].previewUrl,
          driveFileId: input.driveFileId || updated[existingIdx].driveFileId,
          price: input.price ?? updated[existingIdx].price,
          wholesaleCost: input.wholesaleCost ?? updated[existingIdx].wholesaleCost
        };
        return updated;
      } else {
        const newItem: CartItem = {
          ...input,
          id: resolvedId,
          copies: itemCopies
        };
        return [...prev, newItem];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== itemId));
  };

  const updateCopies = (itemId: string, count: number) => {
    if (count <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, copies: Math.max(1, count) } : it))
    );
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const totalCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.copies) || 1), 0);
  }, [cart]);

  const totalUniqueItems = cart.length;

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = Number(item.price) || 0;
      const copies = Number(item.copies) || 1;
      return acc + price * copies;
    }, 0);
  }, [cart]);

  const wholesaleTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const cost = Number(item.wholesaleCost) || (Number(item.price) * 0.35); // fallback ~35% wholesale
      const copies = Number(item.copies) || 1;
      return acc + cost * copies;
    }, 0);
  }, [cart]);

  return (
    <PrintCartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCopies,
        clearCart,
        totalCount,
        totalUniqueItems,
        subtotal,
        wholesaleTotal,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        isCheckoutOpen,
        setIsCheckoutOpen,
        openCheckout,
        closeCheckout
      }}
    >
      {children}
    </PrintCartContext.Provider>
  );
};

const defaultPrintCartContext: PrintCartContextType = {
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateCopies: () => {},
  clearCart: () => {},
  totalCount: 0,
  totalUniqueItems: 0,
  subtotal: 0,
  wholesaleTotal: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
  openCart: () => {},
  closeCart: () => {},
  isCheckoutOpen: false,
  setIsCheckoutOpen: () => {},
  openCheckout: () => {},
  closeCheckout: () => {}
};

export const usePrintCart = (): PrintCartContextType => {
  const context = useContext(PrintCartContext);
  if (!context) {
    return defaultPrintCartContext;
  }
  return context;
};
