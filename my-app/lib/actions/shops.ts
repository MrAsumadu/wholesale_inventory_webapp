"use server";

import { updateTag, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createClientFromCookies } from "@/lib/supabase/server";
import type { Shop } from "@/lib/types";

export async function getShops(): Promise<Shop[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (): Promise<Shop[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    ["shops"],
    { tags: ["shops"] }
  )();
}

export async function getShop(id: string): Promise<Shop | null> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (id: string): Promise<Shop | null> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data;
    },
    ["shop"],
    { tags: ["shops"] }
  )(id);
}

export async function createShop(fields: {
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .insert(fields)
    .select()
    .single();

  updateTag("shops");
  return { data, error };
}

export async function updateShop(id: string, fields: Partial<{
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
}>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update(fields)
    .eq("id", id);

  updateTag("shops");
  return { error };
}

export async function deleteShop(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .delete()
    .eq("id", id);

  if (error?.code === "23503") {
    return { error: { ...error, message: "Cannot delete a shop that has orders." } };
  }

  updateTag("shops");
  return { error };
}
