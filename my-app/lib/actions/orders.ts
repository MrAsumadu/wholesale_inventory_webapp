"use server";

import { updateTag, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createClientFromCookies } from "@/lib/supabase/server";
import type { Order, RecentOrder } from "@/lib/types";

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .eq("id", orderId)
    .single();

  if (error) return null;
  return data;
}

export async function getOrders(limit = 100): Promise<Order[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (limit: number): Promise<Order[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("orders")
        .select("*, line_items:order_line_items(*)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    ["orders"],
    { tags: ["orders"] }
  )(limit);
}

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (limit: number): Promise<RecentOrder[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("orders")
        .select("id, shop_id, total, status, created_at, line_items:order_line_items(id)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    ["recent-orders"],
    { tags: ["orders"] }
  )(limit);
}

export async function getOrderStats(): Promise<{ count: number; totalRevenue: number }> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<{ count: number; totalRevenue: number }> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase.rpc("get_order_stats");

      if (error) throw error;
      return {
        count: data?.count ?? 0,
        totalRevenue: data?.totalRevenue ?? 0,
      };
    },
    ["order-stats"],
    { tags: ["orders"] }
  )();
}

export async function getShopOrders(shopId: string, limit = 100): Promise<Order[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (shopId: string, limit: number): Promise<Order[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("orders")
        .select("*, line_items:order_line_items(*)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    ["shop-orders"],
    { tags: ["orders", "shops"] }
  )(shopId, limit);
}

export async function getOrderCountsByShop(): Promise<Record<string, number>> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<Record<string, number>> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase.rpc("get_order_counts_by_shop");

      if (error) throw error;
      return (data as Record<string, number>) ?? {};
    },
    ["order-counts"],
    { tags: ["orders"] }
  )();
}

export async function placeOrder(
  shopId: string,
  lineItems: {
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
  }[]
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_shop_id: shopId,
    p_line_items: lineItems,
  });

  updateTag("orders");
  return { data, error };
}

export async function confirmOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_order", {
    p_order_id: orderId,
  });

  updateTag("orders");
  updateTag("inventory");
  return { error };
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("status", "pending");

  updateTag("orders");
  return { error };
}

export async function updatePendingOrder(
  orderId: string,
  lineItems: {
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
  }[]
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_pending_order", {
    p_order_id: orderId,
    p_line_items: lineItems,
  });

  updateTag("orders");
  return { error };
}
