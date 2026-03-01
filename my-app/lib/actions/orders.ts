"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Order, RecentOrder } from "@/lib/types";

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, shop_id, total, created_at, line_items:order_line_items(id)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getOrderStats(): Promise<{ count: number; totalRevenue: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("total");

  if (error) throw error;
  const rows = data ?? [];
  return {
    count: rows.length,
    totalRevenue: rows.reduce((sum, o) => sum + o.total, 0),
  };
}

export async function getShopOrders(shopId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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

  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/shops");
  revalidatePath(`/shops/${shopId}`);
  revalidatePath("/");
  return { data, error };
}
