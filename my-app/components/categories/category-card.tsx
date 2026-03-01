"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";

interface CategoryCardProps {
  category: Category;
  itemCount: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryCard({
  category,
  itemCount,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <Image
          src={category.image}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Action buttons - appear on hover */}
        <div
          className={`absolute top-3 right-3 flex gap-1.5 transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0 sm:opacity-0"
          } max-sm:opacity-100`}
        >
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white backdrop-blur-sm shadow-sm compact-touch"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white hover:text-destructive backdrop-blur-sm shadow-sm compact-touch"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Name + count overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-display text-lg leading-tight">
            {category.name}
          </h3>
          <Badge
            variant="secondary"
            className="mt-1.5 bg-white/20 text-white border-0 backdrop-blur-sm text-xs"
          >
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
