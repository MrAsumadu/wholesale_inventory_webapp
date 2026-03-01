"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
