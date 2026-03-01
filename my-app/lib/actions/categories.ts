"use server";

import { updateTag, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createClientFromCookies } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { logAuditEvent } from "@/lib/audit";

export async function getCategories(): Promise<Category[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<Category[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    ["categories"],
    { tags: ["categories"] }
  )();
}

export async function createCategory(fields: { name: string; image?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: fields.name, image: fields.image ?? "/placeholder-item.svg" })
    .select()
    .single();

  if (data) {
    await logAuditEvent({
      entityType: "category",
      entityId: data.id,
      action: "create",
      newValues: data as Record<string, unknown>,
    });
  }

  updateTag("categories");
  return { data, error };
}

export async function updateCategory(id: string, fields: { name?: string; image?: string }) {
  const supabase = await createClient();

  const { data: oldData } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("categories")
    .update(fields)
    .eq("id", id);

  if (!error) {
    await logAuditEvent({
      entityType: "category",
      entityId: id,
      action: "update",
      oldValues: oldData as Record<string, unknown> | null,
      newValues: fields as Record<string, unknown>,
    });
  }

  updateTag("categories");
  return { error };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error?.code === "23503") {
    return { error: { ...error, message: "Cannot delete a category that has items. Reassign items first." } };
  }

  if (!error && category) {
    await logAuditEvent({
      entityType: "category",
      entityId: id,
      action: "delete",
      oldValues: category as Record<string, unknown>,
    });
  }

  if (!error && category?.image && !category.image.startsWith("/")) {
    const marker = "/storage/v1/object/public/images/";
    const idx = category.image.indexOf(marker);
    if (idx !== -1) {
      const path = category.image.substring(idx + marker.length);
      await supabase.storage.from("images").remove([path]);
    }
  }

  updateTag("categories");
  return { error };
}
