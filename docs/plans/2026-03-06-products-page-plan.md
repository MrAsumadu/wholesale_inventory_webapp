# Products Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/products` page that serves as both a customer-facing product catalog and an internal order-building interface.

**Architecture:** A single Next.js page at `/products` with a client component that switches between showcase mode (read-only catalog) and order mode (qty/price/discount controls + sticky cart bar). Reuses existing server actions and the `placeOrder` RPC. The shop detail page's "New Order" button changes from opening a dialog to navigating to `/products?shop=<id>&mode=order`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn UI, Lucide icons, existing Supabase backend.

---

### Task 1: Add "Products" to navigation

**Files:**
- Modify: `my-app/components/sidebar.tsx:9-14`
- Modify: `my-app/components/bottom-tabs.tsx:8-13`

**Step 1: Update sidebar navItems array**

In `my-app/components/sidebar.tsx`, add the `ShoppingBag` icon import and a new nav entry between Inventory and Shops:

```tsx
import { Package, Store, LayoutDashboard, ClipboardList, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/products", label: "Products", icon: ShoppingBag },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];
```

**Step 2: Update bottom tabs navItems array**

In `my-app/components/bottom-tabs.tsx`, add `ShoppingBag` import and new entry between Inventory and Shops:

```tsx
import { Package, Store, LayoutDashboard, ClipboardList, ShoppingBag } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/products", label: "Products", icon: ShoppingBag },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];
```

**Step 3: Verify the app builds**

Run: `cd my-app && npx next build`
Expected: Build succeeds (the /products route doesn't exist yet, but nav links are just `<Link>` elements).

**Step 4: Commit**

```bash
git add my-app/components/sidebar.tsx my-app/components/bottom-tabs.tsx
git commit -m "feat: add Products link to sidebar and bottom tabs navigation"
```

---

### Task 2: Create the products page route and server component

**Files:**
- Create: `my-app/app/(app)/products/page.tsx`

**Step 1: Create the server page component**

This page fetches inventory items, categories, and shops (for order mode), then renders the client component.

```tsx
import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { getShops } from "@/lib/actions/shops";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const [items, categories, shops] = await Promise.all([
    getInventoryItems(),
    getCategories(),
    getShops(),
  ]);
  return <ProductsClient items={items} categories={categories} shops={shops} />;
}
```

**Step 2: Create a minimal placeholder client component**

Create `my-app/components/products/products-client.tsx` with a minimal placeholder so the page renders:

```tsx
"use client";

import type { InventoryItem, Category, Shop } from "@/lib/types";

interface ProductsClientProps {
  items: InventoryItem[];
  categories: Category[];
  shops: Shop[];
}

export function ProductsClient({ items, categories, shops }: ProductsClientProps) {
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      <h1 className="font-display text-2xl md:text-3xl text-foreground mb-6">Products</h1>
      <p className="text-muted-foreground">{items.length} products across {categories.length} categories</p>
    </div>
  );
}
```

**Step 3: Verify the page loads**

Run: `cd my-app && npx next dev`
Navigate to `/products` and confirm the placeholder renders.

**Step 4: Commit**

```bash
git add my-app/app/(app)/products/page.tsx my-app/components/products/products-client.tsx
git commit -m "feat: create products page route with placeholder client component"
```

---

### Task 3: Build the product card component

**Files:**
- Create: `my-app/components/products/product-card.tsx`

**Step 1: Create the ProductCard component**

This card is used in both showcase and order modes. In showcase mode it shows image + name + price. In order mode it additionally shows stock, qty stepper, price input, discount input, and subtotal.

```tsx
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

        {/* Order mode: add button or controls */}
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

            {/* Price input */}
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

            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">£{discountedSubtotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd my-app && npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add my-app/components/products/product-card.tsx
git commit -m "feat: create ProductCard component with showcase and order mode variants"
```

---

### Task 4: Build the full ProductsClient with showcase mode

**Files:**
- Modify: `my-app/components/products/products-client.tsx`

**Step 1: Implement the full showcase mode**

Replace the placeholder with the full implementation including search, category filter pills, category-grouped grid with sticky headers, and the "Start Order" button.

```tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/product-card";
import type { InventoryItem, Category, Shop } from "@/lib/types";

interface CartItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface ProductsClientProps {
  items: InventoryItem[];
  categories: Category[];
  shops: Shop[];
}

export function ProductsClient({ items, categories, shops }: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const shopId = searchParams.get("shop");
  const mode = searchParams.get("mode");
  const orderMode = mode === "order" && !!shopId;
  const shop = shops.find((s) => s.id === shopId) ?? null;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showShopPicker, setShowShopPicker] = useState(false);

  // Filter items by search and category
  const filteredItems = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (activeCategory) {
      result = result.filter((item) => item.category_id === activeCategory);
    }
    return result;
  }, [items, search, activeCategory]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: { category: Category; items: InventoryItem[] }[] = [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    for (const item of filteredItems) {
      const cat = catMap.get(item.category_id);
      if (!cat) continue;
      let group = groups.find((g) => g.category.id === cat.id);
      if (!group) {
        group = { category: cat, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }

    // Sort groups alphabetically by category name
    groups.sort((a, b) => a.category.name.localeCompare(b.category.name));
    return groups;
  }, [filteredItems, categories]);

  // Cart helpers
  const getCartItem = (itemId: string) => cart.find((c) => c.itemId === itemId);

  const addToCart = (item: InventoryItem) => {
    if (cart.find((c) => c.itemId === item.id)) return;
    setCart([...cart, { itemId: item.id, quantity: 1, unitPrice: item.price, discount: 0 }]);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    setCart(cart.map((c) =>
      c.itemId === itemId
        ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, item?.quantity ?? Infinity)) }
        : c
    ));
  };

  const updatePrice = (itemId: string, price: string) => {
    const num = parseFloat(price);
    if (isNaN(num) || num < 0) return;
    setCart(cart.map((c) => (c.itemId === itemId ? { ...c, unitPrice: num } : c)));
  };

  const updateDiscount = (itemId: string, discount: string) => {
    const num = parseFloat(discount);
    if (isNaN(num) || num < 0 || num > 100) return;
    setCart(cart.map((c) => (c.itemId === itemId ? { ...c, discount: num } : c)));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.itemId !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => {
    return sum + c.quantity * c.unitPrice * (1 - c.discount / 100);
  }, 0);

  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleStartOrder = () => {
    if (shops.length === 1) {
      router.push(`/products?shop=${shops[0].id}&mode=order`);
    } else {
      setShowShopPicker(true);
    }
  };

  const handleSelectShop = (id: string) => {
    setShowShopPicker(false);
    router.push(`/products?shop=${id}&mode=order`);
  };

  const handleExitOrderMode = () => {
    setCart([]);
    router.push("/products");
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">
            {orderMode ? `Order — ${shop?.name ?? ""}` : "Products"}
          </h1>
          {orderMode && (
            <button
              onClick={handleExitOrderMode}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              Exit order mode
            </button>
          )}
        </div>
        {!orderMode && (
          <Button onClick={handleStartOrder} className="bg-primary hover:bg-primary/90">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Start Order
          </Button>
        )}
      </div>

      {/* Shop picker overlay */}
      {showShopPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 animate-scale-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Select Shop</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowShopPicker(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {shops.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectShop(s.id)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.location}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + Category filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid grouped by category */}
      <div className="space-y-8 pb-32">
        {groupedItems.map(({ category, items: catItems }) => (
          <section key={category.id}>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-1 px-1 mb-3">
              <h2 className="font-display text-lg text-foreground">{category.name}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {catItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  category={category}
                  orderMode={orderMode}
                  cartData={getCartItem(item.id) ? {
                    quantity: getCartItem(item.id)!.quantity,
                    unitPrice: getCartItem(item.id)!.unitPrice,
                    discount: getCartItem(item.id)!.discount,
                  } : undefined}
                  onAddToCart={() => addToCart(item)}
                  onUpdateQuantity={(delta) => updateQuantity(item.id, delta)}
                  onUpdatePrice={(price) => updatePrice(item.id, price)}
                  onUpdateDiscount={(discount) => updateDiscount(item.id, discount)}
                  onRemove={() => removeFromCart(item.id)}
                />
              ))}
            </div>
          </section>
        ))}

        {groupedItems.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>

      {/* Sticky bottom cart bar (order mode only) */}
      {orderMode && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:left-[240px] pb-safe">
          <div className="bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">
                  {cart.length} {cart.length === 1 ? "item" : "items"}
                </span>
                <span className="text-lg font-semibold tabular-nums ml-2">
                  £{cartTotal.toFixed(2)}
                </span>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                Review Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify showcase mode renders**

Run dev server, navigate to `/products`. Confirm:
- Products grid renders with images grouped by category
- Search filters products
- Category pills filter by category
- "Start Order" button shows shop picker

**Step 3: Commit**

```bash
git add my-app/components/products/products-client.tsx
git commit -m "feat: implement products page with showcase mode, search, and category filters"
```

---

### Task 5: Build the order review sheet

**Files:**
- Create: `my-app/components/products/order-review-sheet.tsx`

**Step 1: Create the OrderReviewSheet component**

This is the expandable bottom sheet that shows when "Review Order" is tapped. It shows the full cart, totals, and "Place Order" button. Reuses the existing `placeOrder` action and `generateOrderPdf`.

```tsx
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
  ChevronUp,
} from "lucide-react";
import { placeOrder } from "@/lib/actions/orders";
import { generateOrderPdf } from "@/lib/generate-order-pdf";
import type { InventoryItem, Shop } from "@/lib/types";

interface CartItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface OrderReviewSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  items: InventoryItem[];
  shop: Shop;
  total: number;
  onOrderPlaced: () => void;
}

export function OrderReviewSheet({
  open,
  onClose,
  cart,
  items,
  shop,
  total,
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

  const handlePlaceOrder = () => {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder(shop.id, lineItems);
      if (result.error) {
        setError(result.error.message ?? "Failed to place order.");
      } else {
        const id = typeof result.data === "string" ? result.data : null;
        setOrderId(id);
        setConfirmed(true);
        router.refresh();
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
            <h3 className="font-display text-xl mb-2">Order placed successfully</h3>
            <p className="text-muted-foreground text-sm mb-1">
              {cart.reduce((s, c) => s + c.quantity, 0)} items totaling £{total.toFixed(2)}
            </p>
            <p className="text-muted-foreground/70 text-xs">Order for {shop.name}</p>
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
                          {c.discount > 0 ? `${c.discount}%` : "—"}
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

              <div className="flex items-center gap-2 p-3 mt-4 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This action cannot be undone. Stock will be deducted immediately.</span>
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
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add my-app/components/products/order-review-sheet.tsx
git commit -m "feat: create OrderReviewSheet component for order review and placement"
```

---

### Task 6: Wire up order mode and review sheet in ProductsClient

**Files:**
- Modify: `my-app/components/products/products-client.tsx`

**Step 1: Import and integrate the OrderReviewSheet**

Add to the imports at the top of `products-client.tsx`:

```tsx
import { OrderReviewSheet } from "@/components/products/order-review-sheet";
```

Add state for the review sheet:

```tsx
const [reviewOpen, setReviewOpen] = useState(false);
```

Replace the "Review Order" button in the sticky bottom bar with:

```tsx
<Button className="bg-primary hover:bg-primary/90" onClick={() => setReviewOpen(true)}>
  Review Order
</Button>
```

Add the `OrderReviewSheet` component at the end of the JSX (before the closing `</div>`):

```tsx
{orderMode && shop && (
  <OrderReviewSheet
    open={reviewOpen}
    onClose={() => setReviewOpen(false)}
    cart={cart}
    items={items}
    shop={shop}
    total={cartTotal}
    onOrderPlaced={() => {
      setCart([]);
      router.push("/products");
    }}
  />
)}
```

**Step 2: Verify the full order flow**

Run dev server, navigate to `/products?shop=<a-real-shop-id>&mode=order`. Confirm:
- Cards show qty/price/discount controls when added
- Sticky bottom bar appears with running total
- "Review Order" opens the sheet
- Review table shows discount column

**Step 3: Commit**

```bash
git add my-app/components/products/products-client.tsx
git commit -m "feat: wire up order review sheet to products page order mode"
```

---

### Task 7: Update shop detail page to link to products order mode

**Files:**
- Modify: `my-app/components/shops/shop-detail-client.tsx:130-137`

**Step 1: Replace the New Order dialog trigger with navigation**

In `shop-detail-client.tsx`, change the "New Order" button from opening a dialog to navigating to the products page:

Replace imports — remove `NewOrderFlow` import, add `useRouter`:

```tsx
import { useRouter } from "next/navigation";
// Remove: import { NewOrderFlow } from "@/components/orders/new-order-flow";
```

In the component body, add router and replace the handler:

```tsx
const router = useRouter();
// Remove: const [newOrderOpen, setNewOrderOpen] = useState(false);
```

Update the button:

```tsx
<Button
  onClick={() => router.push(`/products?shop=${shop.id}&mode=order`)}
  className="bg-primary hover:bg-primary/90"
>
  <Plus className="w-4 h-4 mr-2" />
  New Order
</Button>
```

Remove the `<NewOrderFlow ... />` JSX block entirely.

Also remove `InventoryItemSlim` from the type import and the `items` prop since they're no longer needed. The `categories` prop can also be removed.

Update the interface:

```tsx
interface ShopDetailClientProps {
  shop: Shop;
  orders: Order[];
}
```

**Step 2: Update the shop detail server page to stop passing items/categories**

In `my-app/app/(app)/shops/[id]/page.tsx`, remove the `getInventoryItemsSlim` and `getCategories` calls, and only pass `shop` and `orders` to `ShopDetailClient`.

**Step 3: Verify the shop detail page still works**

Navigate to a shop detail page, click "New Order", confirm it navigates to `/products?shop=<id>&mode=order`.

**Step 4: Commit**

```bash
git add my-app/components/shops/shop-detail-client.tsx my-app/app/(app)/shops/[id]/page.tsx
git commit -m "feat: change shop New Order button to navigate to products page in order mode"
```

---

### Task 8: Handle sidebar collapse offset in sticky bottom bar

**Files:**
- Modify: `my-app/components/products/products-client.tsx`

**Step 1: Fix the bottom bar left offset**

The sidebar can be 240px or 72px (collapsed). Since the collapsed state is local to the Sidebar component, the simplest approach is to use a CSS class that accounts for the sidebar being present on `md+` screens:

Replace the hardcoded `md:left-[240px]` with a more flexible approach:

```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 md:pl-0 pb-safe">
```

This positions the bar full-width and lets the app shell's existing layout handle the offset. The bar is inside the main content area, so the sidebar offset is already handled by the flex layout. Actually, since the products page content is within the app shell's main area, the `fixed` positioning needs to account for the sidebar. Use `md:left-[72px] lg:left-[240px]` or better yet, change to `sticky` positioning at the bottom of the scrollable content area.

The simplest fix: change from `fixed` to a wrapper approach. Place the bar as a `fixed` element but add a left margin that matches the sidebar. Since the sidebar width is dynamic (collapsed state), the cleanest approach is to not use `md:left-[...]` and instead let the bar span the full width, which still works fine visually.

```tsx
<div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 pb-safe">
```

Note: `bottom-16` on mobile accounts for the bottom tabs nav (h-16). On `md+`, bottom-0 since there are no bottom tabs (sidebar is used instead).

**Step 2: Commit**

```bash
git add my-app/components/products/products-client.tsx
git commit -m "fix: adjust sticky cart bar position to account for bottom tabs on mobile"
```

---

### Task 9: Final verification and cleanup

**Step 1: Full build check**

Run: `cd my-app && npx next build`
Expected: Build succeeds with no errors.

**Step 2: Manual test checklist**

- [ ] `/products` shows product grid with images, grouped by category
- [ ] Search filters products across categories
- [ ] Category pills filter to a single category
- [ ] "Start Order" shows shop picker (or auto-selects if only 1 shop)
- [ ] Order mode shows qty/price/discount controls on product cards
- [ ] Adding items shows sticky bottom bar with running total
- [ ] "Review Order" opens bottom sheet with discount column
- [ ] "Place Order" succeeds and shows confirmation
- [ ] "Export Invoice" generates PDF
- [ ] Shop detail "New Order" navigates to order mode
- [ ] Out-of-stock items greyed out in showcase mode
- [ ] Responsive layout: 2 cols mobile, 3 cols tablet, 4 cols desktop

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: products page with showcase and order mode complete"
```
