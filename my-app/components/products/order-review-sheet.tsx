"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileDown,
} from "lucide-react";
import { placeOrder, updatePendingOrder } from "@/lib/actions/orders";
import { generateOrderPdf } from "@/lib/generate-order-pdf";
import type { InventoryItem, Shop, CartItem } from "@/lib/types";

interface OrderReviewSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  items: InventoryItem[];
  shop: Shop;
  total: number;
  editOrderId?: string | null;
  onOrderPlaced: () => void;
}

export function OrderReviewSheet({
  open,
  onClose,
  cart,
  items,
  shop,
  total,
  editOrderId,
  onOrderPlaced,
}: OrderReviewSheetProps) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const getItemName = (id: string) => items.find((i) => i.id === id)?.name ?? "";

  const lineItems = cart.map((c) => ({
    item_id: c.itemId,
    item_name: getItemName(c.itemId),
    quantity: c.quantity,
    unit_price: c.unitPrice * (1 - c.discount / 100),
  }));

  const pdfLineItems = cart.map((c) => ({
    item_name: getItemName(c.itemId),
    quantity: c.quantity,
    unit_price: c.unitPrice * (1 - c.discount / 100),
  }));

  const shopInfo = { name: shop.name, location: shop.location, phone: shop.phone };

  const isEditing = !!editOrderId;

  const handlePlaceOrder = () => {
    setError(null);
    startTransition(async () => {
      if (isEditing) {
        const result = await updatePendingOrder(editOrderId!, lineItems);
        if (result.error) {
          setError(result.error.message ?? "Failed to update order.");
        } else {
          setOrderId(editOrderId);
          setConfirmed(true);
          router.refresh();
        }
      } else {
        const result = await placeOrder(shop.id, lineItems);
        if (result.error) {
          setError(result.error.message ?? "Failed to place order.");
        } else {
          const id = typeof result.data === "string" ? result.data : null;
          setOrderId(id);
          setConfirmed(true);
          router.refresh();
        }
      }
    });
  };

  const handleExportPdf = (isDraft: boolean) => {
    generateOrderPdf({
      lineItems: pdfLineItems,
      total,
      shop: shopInfo,
      orderId: isDraft ? null : orderId,
      orderDate: new Date().toISOString(),
    });
  };

  const handleDone = () => {
    setConfirmed(false);
    setOrderId(null);
    setError(null);
    onOrderPlaced();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-in-bottom">
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">
            {confirmed ? "Order Confirmed" : "Review Order"}
          </h2>
          <Button variant="ghost" size="icon" onClick={confirmed ? handleDone : onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {confirmed ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-2">
              {isEditing ? "Order updated" : "Order created"}
            </h3>
            <p className="text-muted-foreground text-sm mb-1">
              {cart.reduce((s, c) => s + c.quantity, 0)} items totaling £{total.toFixed(2)}
            </p>
            <p className="text-muted-foreground/70 text-xs">Order for {shop.name}</p>
            <p className="text-muted-foreground text-xs mt-2">
              This order is pending. Confirm it in the Orders page to deduct stock.
            </p>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => handleExportPdf(false)}>
                <FileDown className="w-4 h-4 mr-2" />
                Export Invoice
              </Button>
              <Button onClick={handleDone} className="bg-primary hover:bg-primary/90">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 mx-5 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium text-center">Qty</th>
                    <th className="py-2 font-medium text-right">Price</th>
                    <th className="py-2 font-medium text-right">Disc</th>
                    <th className="py-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((c) => {
                    const effectivePrice = c.unitPrice * (1 - c.discount / 100);
                    return (
                      <tr key={c.itemId} className="border-b border-border/50">
                        <td className="py-2">{getItemName(c.itemId)}</td>
                        <td className="py-2 text-center tabular-nums">{c.quantity}</td>
                        <td className="py-2 text-right tabular-nums">£{c.unitPrice.toFixed(2)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {c.discount > 0 ? `${c.discount}%` : "\u2014"}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          £{(c.quantity * effectivePrice).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end mt-3">
                <span className="text-base font-semibold tabular-nums">Total: £{total.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 mt-4 rounded-lg border border-blue-300/50 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This will create a pending order. Stock will be deducted when you confirm it in the Orders page.</span>
              </div>
            </div>

            <Separator />

            <div className="px-5 py-3 flex items-center justify-between">
              <Button variant="outline" onClick={() => handleExportPdf(true)}>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={handlePlaceOrder}
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating Order..."}
                  </>
                ) : (
                  isEditing ? "Update Order" : "Create Order"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
