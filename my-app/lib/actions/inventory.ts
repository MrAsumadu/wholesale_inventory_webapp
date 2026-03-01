"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
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

  revalidatePath("/inventory");
  revalidatePath("/");
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

  revalidatePath("/inventory");
  revalidatePath("/");
  return { error };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);

  revalidatePath("/inventory");
  revalidatePath("/");
  return { error };
}
