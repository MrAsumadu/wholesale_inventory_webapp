"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/lib/types";

interface OrderDetailProps {
  order: Order;
}

export function OrderDetail({ order }: OrderDetailProps) {
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
          {order.lineItems.map((line) => (
            <TableRow key={line.itemId} className="hover:bg-transparent">
              <TableCell className="text-sm">{line.itemName}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {line.quantity}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                ${line.unitPrice.toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums font-medium">
                ${(line.quantity * line.unitPrice).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="my-3" />
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-base font-semibold tabular-nums">
          ${order.total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
