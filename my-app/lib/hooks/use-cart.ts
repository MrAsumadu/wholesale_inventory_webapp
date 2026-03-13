"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { InventoryItem, Shop, Order, CartItem } from "@/lib/types";

const STORAGE_KEY = "wholesale-cart";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SavedCart {
  shopId: string;
  items: CartItem[];
  timestamp: number;
}

export function useCart(
  inventoryItems: InventoryItem[],
  shops: Shop[],
  editOrder: Order | null | undefined,
  editOrderId: string | null,
  shopId: string | null,
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restoredShopId, setRestoredShopId] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // --- Initialization (runs once) ---
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // If editing an existing order, populate from line items
    if (editOrder?.line_items && editOrder.line_items.length > 0) {
      setCart(
        editOrder.line_items.map((li) => {
          const catalogItem = inventoryItems.find((i) => i.id === li.item_id);
          const catalogPrice = catalogItem?.price ?? li.unit_price;
          const discount =
            li.unit_price < catalogPrice
              ? Math.round((1 - li.unit_price / catalogPrice) * 100)
              : 0;
          return {
            itemId: li.item_id,
            quantity: li.quantity,
            unitPrice: catalogPrice,
            discount,
          };
        }),
      );
      return;
    }

    // Otherwise try to restore from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: SavedCart = JSON.parse(raw);

      // Discard if too old
      if (Date.now() - saved.timestamp > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Discard if shop no longer exists
      if (!shops.some((s) => s.id === saved.shopId)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Filter out items that no longer exist in inventory
      const validItems = saved.items.filter((ci) =>
        inventoryItems.some((i) => i.id === ci.itemId),
      );

      if (validItems.length > 0) {
        setCart(validItems);
        setRestoredShopId(saved.shopId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Persist to localStorage on changes ---
  useEffect(() => {
    // Don't persist when editing an existing order
    if (editOrderId) return;

    if (cart.length > 0 && shopId) {
      const data: SavedCart = {
        shopId,
        items: cart,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else if (cart.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [cart, shopId, editOrderId]);

  // --- Cart operations ---
  const getCartItem = useCallback(
    (itemId: string) => cart.find((c) => c.itemId === itemId),
    [cart],
  );

  const addToCart = useCallback(
    (item: InventoryItem) => {
      setCart((prev) => {
        if (prev.find((c) => c.itemId === item.id)) return prev;
        return [
          ...prev,
          { itemId: item.id, quantity: 1, unitPrice: item.price, discount: 0 },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (itemId: string, delta: number) => {
      const item = inventoryItems.find((i) => i.id === itemId);
      setCart((prev) =>
        prev.map((c) =>
          c.itemId === itemId
            ? {
                ...c,
                quantity: Math.max(
                  1,
                  Math.min(c.quantity + delta, item?.quantity ?? Infinity),
                ),
              }
            : c,
        ),
      );
    },
    [inventoryItems],
  );

  const setQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const item = inventoryItems.find((i) => i.id === itemId);
      const clamped = Math.max(1, Math.min(quantity, item?.quantity ?? Infinity));
      setCart((prev) =>
        prev.map((c) => (c.itemId === itemId ? { ...c, quantity: clamped } : c)),
      );
    },
    [inventoryItems],
  );

  const updatePrice = useCallback(
    (itemId: string, price: string) => {
      const num = parseFloat(price);
      if (isNaN(num) || num < 0) return;
      const item = inventoryItems.find((i) => i.id === itemId);
      const catalogPrice = item?.price ?? num;
      const discount =
        num < catalogPrice && catalogPrice > 0
          ? +((1 - num / catalogPrice) * 100).toFixed(2)
          : 0;
      const newUnitPrice = num >= catalogPrice ? num : catalogPrice;
      setCart((prev) =>
        prev.map((c) =>
          c.itemId === itemId
            ? { ...c, unitPrice: newUnitPrice, discount }
            : c,
        ),
      );
    },
    [inventoryItems],
  );

  const updateDiscount = useCallback(
    (itemId: string, discount: string) => {
      const num = parseFloat(discount);
      if (isNaN(num) || num < 0 || num > 100) return;
      setCart((prev) =>
        prev.map((c) => (c.itemId === itemId ? { ...c, discount: num } : c)),
      );
    },
    [],
  );

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (sum, c) => sum + c.quantity * c.unitPrice * (1 - c.discount / 100),
        0,
      ),
    [cart],
  );

  return {
    cart,
    addToCart,
    updateQuantity,
    setQuantity,
    updatePrice,
    updateDiscount,
    removeFromCart,
    clearCart,
    getCartItem,
    cartTotal,
    restoredShopId,
  };
}
