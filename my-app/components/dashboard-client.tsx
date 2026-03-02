"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  Store,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  History,
} from "lucide-react";
import type { Category, InventoryItemSlim, Shop, RecentOrder, AuditLog, AuditAction } from "@/lib/types";

interface DashboardClientProps {
  categories: Category[];
  inventoryItems: InventoryItemSlim[];
  shops: Shop[];
  recentOrders: RecentOrder[];
  orderStats: { count: number; totalRevenue: number };
  recentActivity: AuditLog[];
}

function actionDotColor(action: AuditAction) {
  switch (action) {
    case "create": return "bg-green-500";
    case "update": return "bg-blue-500";
    case "delete": return "bg-red-500";
  }
}

function activityDescription(log: AuditLog): string {
  const vals = (log.new_values ?? log.old_values) as Record<string, unknown> | null;
  const name = vals?.name ?? vals?.item_name;
  const entityLabel = {
    category: "category",
    inventory_item: "item",
    shop: "shop",
    order: "order",
  }[log.entity_type];

  if (log.action === "create") {
    if (log.entity_type === "order") {
      const shopName = (log.new_values as Record<string, unknown>)?.shop_name;
      if (shopName) return `Sold to ${shopName}`;
      return "Sold order";
    }
    if (name) return `Added ${name}`;
    return `Added ${entityLabel}`;
  }
  if (log.action === "delete") {
    if (name) return `Removed ${name}`;
    return `Removed ${entityLabel}`;
  }
  if (name) return `Updated ${name}`;
  return `Updated ${entityLabel}`;
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardClient({
  categories,
  inventoryItems,
  shops,
  recentOrders,
  orderStats,
  recentActivity,
}: DashboardClientProps) {
  const totalItems = inventoryItems.length;
  const totalStock = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
  const lowStockItems = inventoryItems.filter((i) => i.quantity < 10);
  const totalShops = shops.length;
  const totalOrders = orderStats.count;
  const totalRevenue = orderStats.totalRevenue;

  const getShopName = (shopId: string) =>
    shops.find((s) => s.id === shopId)?.name ?? "Unknown";

  const formatDate = (iso: string) => {
    const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your wholesale inventory operations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        {/* Total Items */}
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {categories.length} categories
              </Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{totalItems}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Inventory items
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 tabular-nums">
              {totalStock.toLocaleString()} units in stock
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card
          className={
            lowStockItems.length > 0
              ? "border-amber-200 bg-amber-50/30"
              : "border-border"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  lowStockItems.length > 0 ? "bg-amber-100" : "bg-muted"
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 ${
                    lowStockItems.length > 0
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              {lowStockItems.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  Action needed
                </Badge>
              )}
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {lowStockItems.length}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Low stock alerts
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Items below 10 units
            </p>
          </CardContent>
        </Card>

        {/* Total Shops */}
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{totalShops}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active shops
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 tabular-nums">
              {totalOrders} total orders
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              £
              {totalRevenue.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Total revenue
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Across all orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div>
          <h2 className="font-display text-lg mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/inventory">
              <Button
                variant="outline"
                className="w-full justify-between h-12 press-effect"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Manage Inventory
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/categories">
              <Button
                variant="outline"
                className="w-full justify-between h-12 press-effect"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Browse Categories
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/shops">
              <Button
                variant="outline"
                className="w-full justify-between h-12 press-effect"
              >
                <span className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  View Shops
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Recent Orders</h2>
            <Link
              href="/orders"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </Link>
          </div>
          <Card className="border-border">
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                recentOrders.map((order, i) => (
                  <Link key={order.id} href={`/shops/${order.shop_id}`}>
                    <div
                      className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-colors ${
                        i < recentOrders.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {getShopName(order.shop_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.created_at)} &middot;{" "}
                            {(order.line_items ?? []).length}{" "}
                            {(order.line_items ?? []).length === 1
                              ? "item"
                              : "items"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        £{order.total.toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Low stock detail */}
      {lowStockItems.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Low Stock Items</h2>
            <Link
              href="/inventory"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View inventory
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {lowStockItems.map((item) => (
              <Card key={item.id} className="border-amber-200/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {categories.find((c) => c.id === item.category_id)
                          ?.name}
                      </p>
                    </div>
                    <Badge
                      variant="destructive"
                      className="ml-2 shrink-0 text-xs"
                    >
                      {item.quantity} left
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* Recent Activity */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Recent Activity</h2>
          <Link
            href="/audit-log"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all
          </Link>
        </div>
        <Card className="border-border">
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              recentActivity.map((log, i) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-4 ${
                    i < recentActivity.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${actionDotColor(log.action)}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {activityDescription(log)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user_email} &middot;{" "}
                        {formatRelativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
