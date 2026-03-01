"use client";

import { useState } from "react";
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
import { FileText } from "lucide-react";
import type { Order } from "@/lib/types";
import { InvoiceModal } from "./invoice-modal";

interface OrderDetailProps {
  order: Order;
}

export function OrderDetail({ order }: OrderDetailProps) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  return (
    <div className="p-4">
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
            <TableRow key={line.item_id} className="hover:bg-transparent">
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
      <Separator className="my-3" />
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total</span>
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tabular-nums">
            ${order.total.toFixed(2)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInvoiceOpen(true)}
            className="compact-touch"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            View Invoice
          </Button>
        </div>
      </div>

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={order}
      />
    </div>
  );
}
