"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { placeOrder } from "@/lib/actions/orders";
import type { InventoryItem, Category } from "@/lib/types";

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

interface NewOrderFlowProps {
  open: boolean;
  onClose: () => void;
  shopName: string;
  shopId: string;
  items: InventoryItem[];
  categories: Category[];
}

export function NewOrderFlow({
  open,
  onClose,
  shopName,
  shopId,
  items,
  categories,
}: NewOrderFlowProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, items]);

  const addToCart = (itemId: string) => {
    const existing = cart.find((c) => c.itemId === itemId);
    if (existing) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setCart([
      ...cart,
      {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        unitPrice: item.price,
        maxStock: item.quantity,
      },
    ]);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart.map((c) =>
        c.itemId === itemId
          ? { ...c, quantity: Math.max(1, c.quantity + delta) }
          : c
      )
    );
  };

  const updatePrice = (itemId: string, price: string) => {
    const num = parseFloat(price);
    if (isNaN(num) || num < 0) return;
    setCart(
      cart.map((c) =>
        c.itemId === itemId ? { ...c, unitPrice: num } : c
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.itemId !== itemId));
  };

  const total = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const hasOverStock = cart.some((c) => c.quantity > c.maxStock);
  const hasInvalidPrice = cart.some((c) => c.unitPrice < 0);

  const handleConfirm = () => {
    setError(null);

    if (cart.length === 0) { setError("Add at least one item to the order."); return; }
    if (hasOverStock) { setError("One or more items exceed available stock. Reduce quantities before confirming."); return; }
    if (hasInvalidPrice) { setError("Unit price cannot be negative."); return; }

    const lineItems = cart.map((c) => ({
      item_id: c.itemId,
      item_name: c.itemName,
      quantity: c.quantity,
      unit_price: c.unitPrice,
    }));

    startTransition(async () => {
      const result = await placeOrder(shopId, lineItems);
      if (result.error) {
        setError(
          result.error.message ?? "Failed to place order. Stock may be insufficient."
        );
      } else {
        setConfirmed(true);
        router.refresh();
      }
    });
  };

  const handleClose = () => {
    setCart([]);
    setSearch("");
    setConfirmed(false);
    setError(null);
    onClose();
  };

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? "";

  const isInCart = (itemId: string) => cart.some((c) => c.itemId === itemId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {confirmed ? "Order Confirmed" : `New Order — ${shopName}`}
          </DialogTitle>
        </DialogHeader>

        {confirmed ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-2">Order placed successfully</h3>
            <p className="text-muted-foreground text-sm mb-1">
              {itemCount} items totaling ${total.toFixed(2)}
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Order for {shopName}
            </p>
            <Button onClick={handleClose} className="mt-6 bg-primary hover:bg-primary/90">
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Item selection */}
            <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const inCart = isInCart(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          inCart
                            ? "border-primary/30 bg-primary/[0.03]"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {getCategoryName(item.category_id)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ·
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.quantity} in stock
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ·
                            </span>
                            <span className="text-xs font-medium tabular-nums">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant={inCart ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 ml-3 shrink-0"
                          disabled={inCart}
                          onClick={() => addToCart(item.id)}
                        >
                          {inCart ? "Added" : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart / Order builder */}
              {cart.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Order Items ({cart.length})
                      </span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 -mx-1 px-1">
                      {cart.map((cartItem) => {
                        const overStock = cartItem.quantity > cartItem.maxStock;
                        return (
                          <div
                            key={cartItem.itemId}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {cartItem.itemName}
                              </p>
                              {overStock && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  <span className="text-[11px] text-amber-600">
                                    Exceeds available stock ({cartItem.maxStock})
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Quantity control */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(cartItem.itemId, -1)
                                }
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm tabular-nums font-medium">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(cartItem.itemId, 1)
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Price input */}
                            <div className="w-20">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cartItem.unitPrice}
                                  onChange={(e) =>
                                    updatePrice(cartItem.itemId, e.target.value)
                                  }
                                  className="h-7 pl-5 text-xs tabular-nums"
                                />
                              </div>
                            </div>

                            {/* Subtotal */}
                            <span className="text-sm font-medium tabular-nums w-16 text-right">
                              $
                              {(cartItem.quantity * cartItem.unitPrice).toFixed(
                                2
                              )}
                            </span>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeFromCart(cartItem.itemId)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="flex-row items-center justify-between sm:justify-between border-t border-border pt-4 mt-2">
              <div>
                {cart.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="text-lg font-semibold tabular-nums">
                      ${total.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={cart.length === 0 || hasOverStock || hasInvalidPrice || isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Confirm Order"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
