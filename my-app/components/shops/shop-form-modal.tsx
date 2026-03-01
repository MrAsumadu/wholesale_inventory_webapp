"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createShop, updateShop } from "@/lib/actions/shops";
import type { Shop } from "@/lib/types";

interface ShopFormModalProps {
  open: boolean;
  onClose: () => void;
  shop?: Shop | null;
}

function ShopForm({ shop, onClose }: { shop?: Shop | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(shop?.name ?? "");
  const [owner, setOwner] = useState(shop?.owner ?? "");
  const [location, setLocation] = useState(shop?.location ?? "");
  const [phone, setPhone] = useState(shop?.phone ?? "");
  const [openingTime, setOpeningTime] = useState(shop?.opening_time ?? "08:00");
  const [closingTime, setClosingTime] = useState(shop?.closing_time ?? "18:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Shop name is required."); return; }
    if (!owner.trim()) { setError("Owner name is required."); return; }
    if (!location.trim()) { setError("Location is required."); return; }
    if (!phone.trim()) { setError("Phone number is required."); return; }

    setLoading(true);
    setError(null);

    try {
      const fields = {
        name: name.trim(),
        owner: owner.trim(),
        location: location.trim(),
        phone: phone.trim(),
        opening_time: openingTime,
        closing_time: closingTime,
      };

      if (shop) {
        const { error: err } = await updateShop(shop.id, fields);
        if (err) throw err;
      } else {
        const { error: err } = await createShop(fields);
        if (err) throw err;
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {shop ? "Edit Shop" : "Add Shop"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="shop-name">Shop Name</Label>
          <Input
            id="shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Green Valley Market"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="owner">Owner Name</Label>
          <Input
            id="owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g. Maria Santos"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">Location / Address</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. 142 Oak Street, Springfield, IL 62701"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. (217) 555-0134"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="opening">Opening Time</Label>
            <Input
              id="opening"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="closing">Closing Time</Label>
            <Input
              id="closing"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {shop ? "Save Changes" : "Add Shop"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ShopFormModal({ open, onClose, shop }: ShopFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <ShopForm key={shop?.id ?? "new"} shop={shop} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
