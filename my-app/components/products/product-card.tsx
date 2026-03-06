"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import type { InventoryItem, Category } from "@/lib/types";

interface CartItemData {
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface ProductCardProps {
  item: InventoryItem;
  category?: Category;
  orderMode: boolean;
  cartData?: CartItemData;
  onAddToCart?: () => void;
  onUpdateQuantity?: (delta: number) => void;
  onUpdatePrice?: (price: string) => void;
  onUpdateDiscount?: (discount: string) => void;
  onRemove?: () => void;
}

export function ProductCard({
  item,
  category,
  orderMode,
  cartData,
  onAddToCart,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onRemove,
}: ProductCardProps) {
  const outOfStock = item.quantity === 0;
  const inCart = !!cartData;
  const discountedSubtotal = cartData
    ? cartData.quantity * cartData.unitPrice * (1 - cartData.discount / 100)
    : 0;

  return (
    <div
      className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 ${
        inCart
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border hover:border-border/80 hover:shadow-md"
      } ${outOfStock && !orderMode ? "opacity-50" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={item.image || "/placeholder-item.svg"}
          alt={item.name}
          fill
          unoptimized
          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
            outOfStock ? "grayscale" : ""
          }`}
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="text-sm font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted">
              Out of Stock
            </span>
          </div>
        )}
        {orderMode && inCart && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <ShoppingCart className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        )}
        {orderMode && inCart && cartData && cartData.discount > 0 && (
          <div className="absolute top-2 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-r-md shadow-sm">
            -{cartData.discount}% off
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-lg font-semibold tabular-nums mt-0.5">£{item.price.toFixed(2)}</p>

        {/* Order mode: stock info */}
        {orderMode && (
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {item.quantity} in stock
          </p>
        )}

        {/* Order mode: add button */}
        {orderMode && !inCart && !outOfStock && (
          <Button
            size="sm"
            className="w-full mt-2 bg-primary hover:bg-primary/90"
            onClick={onAddToCart}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}

        {/* Order mode: cart controls */}
        {orderMode && inCart && cartData && (
          <div className="mt-2 space-y-2">
            {/* Quantity stepper */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 compact-touch"
                onClick={() => {
                  if (cartData.quantity <= 1) {
                    onRemove?.();
                  } else {
                    onUpdateQuantity?.(-1);
                  }
                }}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="flex-1 text-center text-sm tabular-nums font-medium">
                {cartData.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 compact-touch"
                onClick={() => onUpdateQuantity?.(1)}
                disabled={cartData.quantity >= item.quantity}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {/* Price + Discount inputs */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cartData.unitPrice}
                  onChange={(e) => onUpdatePrice?.(e.target.value)}
                  className="h-7 pl-5 text-xs tabular-nums"
                />
              </div>
              <div className="relative w-16">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={cartData.discount}
                  onChange={(e) => onUpdateDiscount?.(e.target.value)}
                  className="h-7 pr-5 text-xs tabular-nums"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>

            {/* Amazon-style discount display */}
            {cartData.discount > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-600 text-white text-[11px] font-bold leading-none">
                    -{cartData.discount}%
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    £{(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">Was:</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums line-through">
                    £{cartData.unitPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-0.5 border-t border-border/50">
                  <span className="text-muted-foreground">
                    {cartData.quantity} × £{(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
                  </span>
                  <span className="font-semibold tabular-nums">£{discountedSubtotal.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">£{discountedSubtotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
