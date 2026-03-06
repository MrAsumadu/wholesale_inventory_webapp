"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, Pencil, Check, Trash2, Loader2, AlertTriangle } from "lucide-react";
import type { Order, Shop } from "@/lib/types";
import { InvoiceModal } from "./invoice-modal";
import { confirmOrder, cancelOrder } from "@/lib/actions/orders";

interface OrderDetailProps {
  order: Order;
  shop?: Shop | null;
  onOrderChanged?: () => void;
}

export function OrderDetail({ order, shop, onOrderChanged }: OrderDetailProps) {
  const router = useRouter();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPendingOrder = order.status === "pending";

  const handleConfirmOrder = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.error) {
        setError(result.error.message ?? "Failed to confirm order.");
      } else {
        setConfirmingAction(null);
        router.refresh();
      }
    });
  };

  const handleCancelOrder = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrder(order.id);
      if (result.error) {
        setError(result.error.message ?? "Failed to cancel order.");
      } else {
        setConfirmingAction(null);
        router.refresh();
      }
    });
  };

  const handleEdit = () => {
    router.push(`/products?shop=${order.shop_id}&mode=order&edit=${order.id}`);
  };

  return (
    <div className="p-4">
      {error && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Item</TableHead>
            <TableHead className="text-xs text-right">Qty</TableHead>
            <TableHead className="text-xs text-right">Unit Price</TableHead>
            <TableHead className="text-xs text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(order.line_items ?? []).map((line) => (
            <TableRow key={line.id} className="hover:bg-transparent">
              <TableCell className="text-sm">{line.item_name}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {line.quantity}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                £{line.unit_price.toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums font-medium">
                £{(line.quantity * line.unit_price).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="my-3" />

      {/* Confirmation dialogs */}
      {confirmingAction && (
        <div className="flex items-center justify-between p-3 mb-3 rounded-lg border border-border bg-muted/50">
          <span className="text-sm">
            {confirmingAction === "confirm"
              ? "Confirm this order? Stock will be deducted."
              : "Cancel this order? This cannot be undone."}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingAction(null)}
              disabled={isPending}
            >
              No
            </Button>
            <Button
              size="sm"
              onClick={confirmingAction === "confirm" ? handleConfirmOrder : handleCancelOrder}
              disabled={isPending}
              className={confirmingAction === "cancel" ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tabular-nums">
            £{order.total.toFixed(2)}
          </span>
          {isPendingOrder ? (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmingAction("confirm")}
                className="bg-primary hover:bg-primary/90"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingAction("cancel")}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInvoiceOpen(true)}
              className="compact-touch"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              View Invoice
            </Button>
          )}
        </div>
      </div>

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={order}
        shop={shop}
      />
    </div>
  );
}
