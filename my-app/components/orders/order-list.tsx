"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import type { Order, Shop } from "@/lib/types";
import { OrderDetail } from "./order-detail";

interface OrderListProps {
  orders: Order[];
  shop?: Shop | null;
}

export function OrderList({ orders, shop }: OrderListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (iso: string) => {
    const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <Package className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No orders yet</p>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Create a new order to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 stagger-children">
      {orders.map((order) => {
        const expanded = expandedId === order.id;
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
                  <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(order.line_items ?? []).length}{" "}
                    {(order.line_items ?? []).length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    order.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  }`}
                >
                  {order.status === "pending" ? "Pending" : "Completed"}
                </Badge>
                <Badge variant="secondary" className="tabular-nums font-medium">
                  £{order.total.toFixed(2)}
                </Badge>
              </div>
            </button>

            {expanded && (
              <div className="border-t border-border animate-fade-in-up">
                <OrderDetail order={order} shop={shop} onOrderChanged={() => {}} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
