"use server";

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createClientFromCookies } from "@/lib/supabase/server";
import type { AuditLog, AuditEntityType, AuditAction } from "@/lib/types";

export interface AuditLogFilters {
  entityType?: AuditEntityType;
  action?: AuditAction;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogResult {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.search) {
    query = query.or(
      `user_email.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getRecentAuditLogs(limit = 8): Promise<AuditLog[]> {
  const allCookies = (await cookies()).getAll();
  return unstable_cache(
    async (limit: number): Promise<AuditLog[]> => {
      const supabase = createClientFromCookies(allCookies);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    ["recent-audit-logs"],
    { tags: ["audit-logs"] }
  )(limit);
}
