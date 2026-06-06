"use client";

import { isDemoMode } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/store";
import { RotateCcw, FlaskConical } from "lucide-react";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  const handleReset = () => {
    demoStore.reset();
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-primary/10 text-primary px-4 py-2 text-xs sm:text-sm border-b border-primary/20">
      <span className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span>
          <strong>Demo mode.</strong> Sample data — your changes stay in this browser only.
        </span>
      </span>
      <button
        onClick={handleReset}
        className="flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 font-medium hover:bg-primary/15 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset demo
      </button>
    </div>
  );
}
