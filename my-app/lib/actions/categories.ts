"use server";

import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(fields: { name: string; image?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: fields.name, image: fields.image ?? "/placeholder-item.svg" })
    .select()
    .single();

  return { data, error };
}

export async function updateCategory(id: string, fields: { name?: string; image?: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(fields)
    .eq("id", id);

  return { error };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("image")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error?.code === "23503") {
    return { error: { ...error, message: "Cannot delete a category that has items. Reassign items first." } };
  }

  if (!error && category?.image && !category.image.startsWith("/")) {
    const marker = "/storage/v1/object/public/images/";
    const idx = category.image.indexOf(marker);
    if (idx !== -1) {
      const path = category.image.substring(idx + marker.length);
      await supabase.storage.from("images").remove([path]);
    }
  }

  return { error };
}
