"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { shops, orders } from "@/lib/mock-data";
import { ShopCard } from "@/components/shops/shop-card";
import { ShopFormModal } from "@/components/shops/shop-form-modal";

export default function ShopsPage() {
  const [addOpen, setAddOpen] = useState(false);

  const getOrderCount = (shopId: string) =>
    orders.filter((o) => o.shopId === shopId).length;

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Shops
        </h1>
        <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Shop
        </Button>
      </div>

      {/* Shop list */}
      {shops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No shops yet</p>
          <p className="text-muted-foreground/70 text-sm mt-1 mb-4">
            Add your first shop to start managing orders
          </p>
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Shop
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              orderCount={getOrderCount(shop.id)}
            />
          ))}
        </div>
      )}

      <ShopFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
