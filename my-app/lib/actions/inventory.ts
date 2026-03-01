"use server";

import { updateTag, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createClientFromCookies } from "@/lib/supabase/server";
import type { InventoryItem, InventoryItemSlim } from "@/lib/types";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<InventoryItem[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    ["inventory"],
    { tags: ["inventory"] }
  )();
}

export async function getInventoryItemsSlim(): Promise<InventoryItemSlim[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<InventoryItemSlim[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, price, quantity, category_id")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    ["inventory-slim"],
    { tags: ["inventory"] }
  )();
}

export async function createItem(fields: {
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date?: string | null;
  image?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      name: fields.name,
      price: fields.price,
      quantity: fields.quantity,
      category_id: fields.category_id,
      expiration_date: fields.expiration_date ?? null,
      image: fields.image ?? "/placeholder-item.svg",
    })
    .select()
    .single();

  updateTag("inventory");
  return { data, error };
}

export async function updateItem(id: string, fields: Partial<{
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date: string | null;
  image: string;
}>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update(fields)
    .eq("id", id);

  updateTag("inventory");
  return { error };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("inventory_items")
    .select("image")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);

  if (error?.code === "23503") {
    return { error: { ...error, message: "Cannot delete an item that has been ordered." } };
  }

  if (!error && item?.image && !item.image.startsWith("/")) {
    const marker = "/storage/v1/object/public/images/";
    const idx = item.image.indexOf(marker);
    if (idx !== -1) {
      const path = item.image.substring(idx + marker.length);
      await supabase.storage.from("images").remove([path]);
    }
  }

  updateTag("inventory");
  return { error };
}
