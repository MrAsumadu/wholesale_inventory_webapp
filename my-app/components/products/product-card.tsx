"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import type { InventoryItem, CartItemData } from "@/lib/types";

interface ProductCardProps {
  item: InventoryItem;
  orderMode: boolean;
  cartData?: CartItemData;
  onAddToCart?: () => void;
  onOpenDetail?: () => void;
}

export function ProductCard({
  item,
  orderMode,
  cartData,
  onAddToCart,
  onOpenDetail,
}: ProductCardProps) {
  const outOfStock = item.quantity === 0;
  const inCart = !!cartData;
  const discountedSubtotal = cartData
    ? cartData.quantity * cartData.unitPrice * (1 - cartData.discount / 100)
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail?.();
        }
      }}
      className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
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
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
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

        {/* Order mode: add button (quick-add without opening modal) */}
        {orderMode && !inCart && !outOfStock && (
          <Button
            size="sm"
            className="w-full mt-2 bg-primary hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}

        {/* Order mode: compact cart summary */}
        {orderMode && inCart && cartData && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground tabular-nums">
              {cartData.quantity} x £{(cartData.unitPrice * (1 - cartData.discount / 100)).toFixed(2)}
            </span>
            <span className="font-semibold tabular-nums">
              £{discountedSubtotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
