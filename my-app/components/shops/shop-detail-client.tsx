"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { OrderList } from "@/components/orders/order-list";
import { ShopFormModal } from "@/components/shops/shop-form-modal";
import { deleteShop } from "@/lib/actions/shops";
import type { Shop, Order } from "@/lib/types";

interface ShopDetailClientProps {
  shop: Shop;
  orders: Order[];
}

export function ShopDetailClient({ shop, orders }: ShopDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    const { error } = await deleteShop(shop.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message || "Failed to delete shop. Please try again.");
    } else {
      router.push("/shops");
    }
  }

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  const handleNavigate = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.location)}`,
      "_blank"
    );
  };

  const handleCall = () => {
    window.open(`tel:${shop.phone}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Back link */}
      <Link
        href="/shops"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Shops
      </Link>

      {/* Shop header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">
            {shop.name}
          </h1>
          <p className="text-muted-foreground mt-1">{shop.owner}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => { setDeleteOpen(true); setDeleteError(""); }}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={handleCall}>
            <Phone className="w-4 h-4 mr-1.5" />
            Call
          </Button>
          <Button variant="outline" size="sm" onClick={handleNavigate}>
            <Navigation className="w-4 h-4 mr-1.5" />
            Navigate
          </Button>
        </div>
      </div>

      {/* Shop info */}
      <div className="rounded-lg border border-border bg-card p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Address
              </p>
              <p className="text-sm">{shop.location}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Phone
              </p>
              <p className="text-sm">{shop.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Hours
              </p>
              <p className="text-sm">
                {formatTime(shop.opening_time)} – {formatTime(shop.closing_time)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Orders section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-foreground">Orders</h2>
        <Button
          onClick={() => router.push(`/products?shop=${shop.id}&mode=order`)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      <OrderList orders={orders} shop={shop} />

      {/* Modals */}
      <ShopFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        shop={shop}
      />

      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) { setDeleteOpen(false); setDeleteError(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Shop</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{shop.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteError(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
