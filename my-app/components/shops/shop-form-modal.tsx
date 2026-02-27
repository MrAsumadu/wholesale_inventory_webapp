"use client";

import { useState, useEffect } from "react";
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
import type { Shop } from "@/lib/types";

interface ShopFormModalProps {
  open: boolean;
  onClose: () => void;
  shop?: Shop | null;
}

export function ShopFormModal({ open, onClose, shop }: ShopFormModalProps) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("18:00");

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setOwner(shop.owner);
      setLocation(shop.location);
      setPhone(shop.phone);
      setOpeningTime(shop.openingTime);
      setClosingTime(shop.closingTime);
    } else {
      setName("");
      setOwner("");
      setLocation("");
      setPhone("");
      setOpeningTime("08:00");
      setClosingTime("18:00");
    }
  }, [shop, open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {shop ? "Edit Shop" : "Add Shop"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
            {shop ? "Save Changes" : "Add Shop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
