import { useState, useEffect, useCallback } from "react";
import { Id } from "../../convex/_generated/dataModel";

export interface CartItem {
  productId: Id<"products">;
  quantity: number;
}

const CART_KEY = "inner-district-cart";

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    const handler = () => setItems(readCart());
    window.addEventListener("cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addItem = useCallback((productId: Id<"products">, quantity = 1) => {
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      current[idx].quantity += quantity;
    } else {
      current.push({ productId, quantity });
    }
    writeCart(current);
  }, []);

  const removeItem = useCallback((productId: Id<"products">) => {
    const current = readCart().filter((i) => i.productId !== productId);
    writeCart(current);
  }, []);

  const updateQuantity = useCallback(
    (productId: Id<"products">, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }
      const current = readCart();
      const idx = current.findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        current[idx].quantity = quantity;
        writeCart(current);
      }
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    writeCart([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, totalItems };
}
