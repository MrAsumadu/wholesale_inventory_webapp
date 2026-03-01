"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Navigation, ChevronRight } from "lucide-react";
import type { Shop } from "@/lib/types";

interface ShopCardProps {
  shop: Shop;
  orderCount: number;
}

export function ShopCard({ shop, orderCount }: ShopCardProps) {
  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.location)}`,
      "_blank"
    );
  };

  return (
    <Link href={`/shops/${shop.id}`}>
      <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors">
              {shop.name}
            </h3>
            <p className="text-sm text-muted-foreground">{shop.owner}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{shop.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <span>{shop.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {formatTime(shop.opening_time)} – {formatTime(shop.closing_time)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {orderCount} {orderCount === 1 ? "order" : "orders"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleNavigate}
          >
            <Navigation className="w-3.5 h-3.5" />
            Navigate
          </Button>
        </div>
      </div>
    </Link>
  );
}
