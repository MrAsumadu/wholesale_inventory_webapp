"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Package, Search } from "lucide-react";
import { OrderDetail } from "@/components/orders/order-detail";
import type { Order, Shop } from "@/lib/types";

interface OrdersClientProps {
  orders: Order[];
  shops: Shop[];
}

export function OrdersClient({ orders, shops }: OrdersClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const shopMap = useMemo(() => {
    const map = new Map<string, string>();
    shops.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [shops]);

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((order) => {
      const shopName = shopMap.get(order.shop_id) ?? "";
      return shopName.toLowerCase().includes(q);
    });
  }, [orders, search, shopMap]);

  const formatDate = (iso: string) => {
    const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Orders
        </h1>
        <Badge variant="secondary" className="tabular-nums">
          {filteredOrders.length}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filter by shop name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No orders found</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            {search ? "Try a different search term" : "No orders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {filteredOrders.map((order) => {
            const expanded = expandedId === order.id;
            const shopName = shopMap.get(order.shop_id) ?? "Unknown Shop";
            return (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-4">
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{shopName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(order.created_at)} &middot;{" "}
                        {(order.line_items ?? []).length}{" "}
                        {(order.line_items ?? []).length === 1
                          ? "item"
                          : "items"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="tabular-nums font-medium"
                  >
                    £{order.total.toFixed(2)}
                  </Badge>
                </button>

                {expanded && (
                  <div className="border-t border-border animate-fade-in-up">
                    <OrderDetail order={order} shop={shops.find((s) => s.id === order.shop_id)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
