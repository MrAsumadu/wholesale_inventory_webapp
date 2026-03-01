"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Printer } from "lucide-react";
import type { Order, Shop } from "@/lib/types";

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  shop?: Shop | null;
}

export function InvoiceModal({ open, onClose, order, shop }: InvoiceModalProps) {

  const formatDate = (iso: string) => {
    const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00");
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Invoice</DialogTitle>
        </DialogHeader>

        {/* Printable invoice content */}
        <div id="invoice-content" className="space-y-6">
          {/* Invoice header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-lg">Shahjalal Inventory</p>
                <p className="text-xs text-muted-foreground">Invoice</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                Invoice #{order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Bill to */}
          {shop && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Bill To
              </p>
              <p className="text-sm font-medium">{shop.name}</p>
              <p className="text-sm text-muted-foreground">{shop.location}</p>
              <p className="text-sm text-muted-foreground">{shop.phone}</p>
            </div>
          )}

          <Separator />

          {/* Line items */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">
                  Unit Price
                </TableHead>
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
                    ${line.unit_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums font-medium">
                    ${(line.quantity * line.unit_price).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              ${order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-end pt-2 no-print">
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
