"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Minus, Trash2 } from "lucide-react";
import type { InventoryItem, Category, CartItemData } from "@/lib/types";

interface ProductDetailModalProps {
  item: InventoryItem | null;
  category?: Category;
  orderMode: boolean;
  cartData?: CartItemData;
  onClose: () => void;
  onAddToCart?: () => void;
  onUpdateQuantity?: (delta: number) => void;
  onSetQuantity?: (quantity: number) => void;
  onUpdatePrice?: (price: string) => void;
  onUpdateDiscount?: (discount: string) => void;
  onRemove?: () => void;
}

export function ProductDetailModal({
  item,
  category,
  orderMode,
  cartData,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  onSetQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onRemove,
}: ProductDetailModalProps) {
  if (!item) return null;

  const outOfStock = item.quantity === 0;
  const inCart = !!cartData;
  const discountedSubtotal = cartData
    ? cartData.quantity * cartData.unitPrice * (1 - cartData.discount / 100)
    : 0;

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 max-w-none translate-x-0 translate-y-0 top-0 left-0 rounded-none h-[100dvh] p-0 gap-0 border-none sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-[600px] sm:max-h-[85vh] sm:h-auto sm:rounded-lg sm:border sm:border-border"
      >
        {/* Visually hidden title + description for accessibility */}
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Details and order controls for {item.name}
        </DialogDescription>

        <div className="flex flex-col h-full sm:max-h-[85vh] overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="font-display text-lg truncate pr-4">{item.name}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
              Close
            </Button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-muted">
              <Image
                src={item.image || "/placeholder-item.svg"}
                alt={item.name}
                fill
                sizes="(min-width: 640px) 600px, 100vw"
                className={`object-cover ${outOfStock ? "grayscale" : ""}`}
              />
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <span className="text-sm font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="p-4 space-y-3">
              <h3 className="text-xl font-display">{item.name}</h3>

              <div className="flex items-center gap-2 flex-wrap">
                {category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {category.name}
                  </span>
                )}
                <span className={`text-xs ${outOfStock ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {outOfStock ? "Out of Stock" : `${item.quantity} in stock`}
                </span>
              </div>

              <p className="text-2xl font-semibold tabular-nums">£{item.price.toFixed(2)}</p>

              {/* Order mode controls */}
              {orderMode && (
                <div className="pt-2 space-y-4">
                  {!inCart && !outOfStock && (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={onAddToCart}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Order
                    </Button>
                  )}

                  {!inCart && outOfStock && (
                    <Button className="w-full" disabled>
                      Out of Stock
                    </Button>
                  )}

                  {inCart && cartData && (
                    <div className="space-y-4">
                      {/* Quantity stepper */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                          Quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              if (cartData.quantity <= 1) {
                                onRemove?.();
                              } else {
                                onUpdateQuantity?.(-1);
                              }
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            key={`modal-qty-${cartData.quantity}`}
                            type="number"
                            min="1"
                            max={item.quantity}
                            defaultValue={cartData.quantity}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= item.quantity) {
                                onSetQuantity?.(val);
                              } else {
                                e.target.value = String(cartData.quantity);
                              }
                            }}
                            className="h-9 w-20 text-center text-sm tabular-nums font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => onUpdateQuantity?.(1)}
                            disabled={cartData.quantity >= item.quantity}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Price + Discount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                            Unit Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              £
                            </span>
                            <Input
                              key={`modal-price-${cartData.unitPrice}-${cartData.discount}`}
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={+(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
                              onBlur={(e) => {
                                const num = parseFloat(e.target.value);
                                if (isNaN(num) || num < 0) {
                                  e.target.value = (cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2);
                                  return;
                                }
                                onUpdatePrice?.(e.target.value);
                              }}
                              className="h-9 pl-7 text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                            Discount
                          </label>
                          <div className="relative">
                            <Input
                              key={`modal-disc-${cartData.discount}`}
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              defaultValue={cartData.discount}
                              onBlur={(e) => {
                                const num = parseFloat(e.target.value);
                                if (isNaN(num) || num < 0 || num > 100) {
                                  e.target.value = String(cartData.discount);
                                  return;
                                }
                                onUpdateDiscount?.(e.target.value);
                              }}
                              className="h-9 pr-7 text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subtotal display */}
                      {cartData.discount > 0 ? (
                        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold leading-none">
                              -{cartData.discount}%
                            </span>
                            <span className="text-lg font-semibold tabular-nums">
                              £{(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Was:</span>
                            <span className="text-xs text-muted-foreground tabular-nums line-through">
                              £{cartData.unitPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-1.5 border-t border-border/50">
                            <span className="text-muted-foreground">
                              {cartData.quantity} x £{(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
                            </span>
                            <span className="font-semibold tabular-nums">
                              £{discountedSubtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm rounded-lg bg-muted/50 p-3">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold tabular-nums">
                            £{discountedSubtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Remove button */}
                      <Button
                        variant="outline"
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => {
                          onRemove?.();
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove from Order
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
