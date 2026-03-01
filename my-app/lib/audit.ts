import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntityType, AuditAction } from "@/lib/types";

interface AuditEventParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("audit_logs").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      user_id: user.id,
      user_email: user.email ?? "unknown",
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
    });

    updateTag("audit-logs");
  } catch (err) {
    console.error("[audit] Failed to log event:", err);
  }
}
