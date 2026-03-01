"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/categories");
  revalidatePath("/");
  return { data, error };
}

export async function updateCategory(id: string, fields: { name?: string; image?: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(fields)
    .eq("id", id);

  revalidatePath("/categories");
  revalidatePath("/");
  return { error };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  revalidatePath("/categories");
  revalidatePath("/");
  return { error };
}
