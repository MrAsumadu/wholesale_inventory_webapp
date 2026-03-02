"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAuditLogs,
  type AuditLogResult,
} from "@/lib/actions/audit-logs";
import type { AuditEntityType, AuditAction, AuditLog } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  History,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

function actionBadgeVariant(action: AuditAction) {
  switch (action) {
    case "create":
      return "default" as const;
    case "update":
      return "secondary" as const;
    case "delete":
      return "destructive" as const;
  }
}

function actionLabel(action: AuditAction, entityType?: AuditEntityType) {
  if (entityType === "order" && action === "create") return "Sold";
  switch (action) {
    case "create":
      return "Added";
    case "update":
      return "Updated";
    case "delete":
      return "Removed";
  }
}

function actionIcon(action: AuditAction) {
  switch (action) {
    case "create":
      return <Plus className="w-3 h-3" />;
    case "update":
      return <Pencil className="w-3 h-3" />;
    case "delete":
      return <Trash2 className="w-3 h-3" />;
  }
}

function entityLabel(type: AuditEntityType): string {
  return {
    category: "Category",
    inventory_item: "Inventory Item",
    shop: "Shop",
    order: "Order",
  }[type];
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarizeChanges(log: AuditLog): string {
  const vals = (log.new_values ?? log.old_values) as Record<string, unknown> | null;
  const name = vals?.name ?? vals?.item_name;

  if (log.action === "create") {
    if (log.entity_type === "order") {
      const shopName = (log.new_values as Record<string, unknown>)?.shop_name;
      if (shopName) return `Sold to "${shopName}"`;
      return "Sold";
    }
    if (name) return `Added "${name}"`;
    return "New record";
  }
  if (log.action === "delete") {
    if (name) return `Removed "${name}"`;
    return "Record removed";
  }
  if (log.action === "update" && log.new_values) {
    const keys = Object.keys(log.new_values).filter(
      (k) => k !== "id" && k !== "created_at"
    );
    if (keys.length === 0) return "Updated";
    if (keys.length <= 2) return `Changed ${keys.join(", ")}`;
    return `Changed ${keys.length} fields`;
  }
  return "-";
}

export function AuditLogClient() {
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuditLogResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [entityType, action, debouncedSearch]);

  const fetchLogs = useCallback(() => {
    startTransition(async () => {
      const data = await getAuditLogs({
        entityType: entityType === "all" ? undefined : entityType,
        action: action === "all" ? undefined : action,
        search: debouncedSearch || undefined,
        page,
        pageSize: 25,
      });
      setResult(data);
    });
  }, [entityType, action, debouncedSearch, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Audit Log
        </h1>
        {result && (
          <Badge variant="secondary" className="tabular-nums">
            {result.total}
          </Badge>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select
          value={entityType}
          onValueChange={(v) => setEntityType(v as AuditEntityType | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="inventory_item">Inventory Item</SelectItem>
            <SelectItem value="shop">Shop</SelectItem>
            <SelectItem value="order">Order</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={action}
          onValueChange={(v) => setAction(v as AuditAction | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                No activity found
              </p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                {debouncedSearch || entityType !== "all" || action !== "all"
                  ? "Try adjusting your filters"
                  : "Actions will appear here as you use the app"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground text-xs tabular-nums">
                          {formatTimestamp(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={actionBadgeVariant(log.action)}
                            className="gap-1"
                          >
                            {actionIcon(log.action)}
                            {actionLabel(log.action, log.entity_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entityLabel(log.entity_type)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {log.user_email}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                          {summarizeChanges(log)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border">
                {result.data.map((log) => (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={actionBadgeVariant(log.action)}
                        className="gap-1"
                      >
                        {actionIcon(log.action)}
                        {actionLabel(log.action, log.entity_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {entityLabel(log.entity_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summarizeChanges(log)}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {log.user_email}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isPending}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isPending}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
