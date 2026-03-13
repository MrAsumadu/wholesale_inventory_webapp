"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag, X, Plus } from "lucide-react";
import { ShopFormModal } from "@/components/shops/shop-form-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/product-card";
import { OrderReviewSheet } from "@/components/products/order-review-sheet";
import { ProductDetailModal } from "@/components/products/product-detail-modal";
import { useCart } from "@/lib/hooks/use-cart";
import type { InventoryItem, Category, Shop, Order } from "@/lib/types";

interface ProductsClientProps {
  items: InventoryItem[];
  categories: Category[];
  shops: Shop[];
  editOrder?: Order | null;
}

export function ProductsClient({ items, categories, shops, editOrder }: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const shopId = searchParams.get("shop");
  const mode = searchParams.get("mode");
  const editOrderId = searchParams.get("edit");
  const orderMode = mode === "order" && !!shopId;
  const shop = shops.find((s) => s.id === shopId) ?? null;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const {
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
  } = useCart(items, shops, editOrder, editOrderId, shopId);

  // Restore order mode from localStorage
  useEffect(() => {
    if (restoredShopId && !orderMode) {
      router.replace(`/products?shop=${restoredShopId}&mode=order`);
    }
  }, [restoredShopId, orderMode, router]);

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

  const uncategorised: Category = { id: "__uncategorised__", name: "Uncategorised", image: "", created_at: "" };

  const groupedItems = useMemo(() => {
    const groups: { category: Category; items: InventoryItem[] }[] = [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    for (const item of filteredItems) {
      const cat = catMap.get(item.category_id) ?? uncategorised;
      let group = groups.find((g) => g.category.id === cat.id);
      if (!group) {
        group = { category: cat, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }

    groups.sort((a, b) => a.category.name.localeCompare(b.category.name));
    return groups;
  }, [filteredItems, categories]);

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
    clearCart();
    router.push("/products");
  };

  // Modal: find the selected item and its category
  const selectedItem = selectedItemId ? items.find((i) => i.id === selectedItemId) ?? null : null;
  const selectedCategory = selectedItem
    ? categories.find((c) => c.id === selectedItem.category_id)
    : undefined;
  const selectedCartData = selectedItemId ? getCartItem(selectedItemId) : undefined;

  return (
    <>
      {/* Shop picker overlay — outside animated container so fixed positioning works */}
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
              <button
                onClick={() => setShowCreateShop(true)}
                className="w-full p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create New Shop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel order confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-fade-in">
            <h2 className="font-display text-lg mb-2">Cancel Order?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure? Your order will be discarded.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}>
                No, keep editing
              </Button>
              <Button
                size="sm"
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  setShowCancelConfirm(false);
                  handleExitOrderMode();
                }}
              >
                Yes, cancel order
              </Button>
            </div>
          </div>
        </div>
      )}

      <ShopFormModal open={showCreateShop} onClose={() => setShowCreateShop(false)} />

      <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">
            {orderMode ? (editOrderId ? `Edit Order — ${shop?.name ?? ""}` : `Order — ${shop?.name ?? ""}`) : "Products"}
          </h1>
        </div>
        {!orderMode && (
          <Button onClick={handleStartOrder} className="bg-primary hover:bg-primary/90">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Start Order
          </Button>
        )}
      </div>

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
              {catItems.map((item) => {
                const cd = getCartItem(item.id);
                return (
                  <ProductCard
                    key={item.id}
                    item={item}
                    orderMode={orderMode}
                    cartData={cd ? { quantity: cd.quantity, unitPrice: cd.unitPrice, discount: cd.discount } : undefined}
                    onAddToCart={() => addToCart(item)}
                    onOpenDetail={() => setSelectedItemId(item.id)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {groupedItems.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>

      </div>

      {/* Product detail modal */}
      <ProductDetailModal
        item={selectedItem}
        category={selectedCategory}
        orderMode={orderMode}
        cartData={selectedCartData ? { quantity: selectedCartData.quantity, unitPrice: selectedCartData.unitPrice, discount: selectedCartData.discount } : undefined}
        onClose={() => setSelectedItemId(null)}
        onAddToCart={() => {
          if (selectedItem) addToCart(selectedItem);
        }}
        onUpdateQuantity={(delta) => {
          if (selectedItemId) updateQuantity(selectedItemId, delta);
        }}
        onSetQuantity={(qty) => {
          if (selectedItemId) setQuantity(selectedItemId, qty);
        }}
        onUpdatePrice={(price) => {
          if (selectedItemId) updatePrice(selectedItemId, price);
        }}
        onUpdateDiscount={(discount) => {
          if (selectedItemId) updateDiscount(selectedItemId, discount);
        }}
        onRemove={() => {
          if (selectedItemId) removeFromCart(selectedItemId);
        }}
      />

      {/* Sticky bottom cart bar — outside animated container so fixed positioning works */}
      {orderMode && cart.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 pb-safe">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setReviewOpen(true)}
                >
                  Review Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order review sheet */}
      {orderMode && shop && (
        <OrderReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          cart={cart}
          items={items}
          shop={shop}
          total={cartTotal}
          editOrderId={editOrderId}
          onOrderPlaced={() => {
            clearCart();
            router.push("/products");
          }}
        />
      )}
    </>
  );
}
