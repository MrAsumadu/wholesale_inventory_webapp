"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { InventoryItem, Shop, Order, CartItem } from "@/lib/types";
import {
  STORAGE_KEY,
  backCalculateDiscount,
  buildSaveData,
  cartTotal as computeCartTotal,
  isValidDiscount,
  isValidPrice,
  restoreCart,
  updateQuantity as applyQuantityChange,
} from "@/lib/products-logic";

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
          const { unitPrice, discount } = backCalculateDiscount(
            li.unit_price,
            catalogItem?.price,
          );
          return {
            itemId: li.item_id,
            quantity: li.quantity,
            unitPrice,
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

      const restored = restoreCart(raw, shops, inventoryItems);
      if (restored) {
        setCart(restored.items);
        setRestoredShopId(restored.shopId);
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
      localStorage.setItem(STORAGE_KEY, buildSaveData(shopId, cart));
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
        applyQuantityChange(prev, itemId, delta, item?.quantity ?? Infinity),
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
      if (!isValidPrice(price)) return;
      const num = parseFloat(price);
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
      if (!isValidDiscount(discount)) return;
      const num = parseFloat(discount);
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

  const cartTotal = useMemo(() => computeCartTotal(cart), [cart]);

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
