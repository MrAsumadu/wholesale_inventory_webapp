"use client";

import { useSyncExternalStore } from "react";
import { demoStore } from "@/lib/demo/store";
import type { DemoData } from "@/lib/demo/types";

/** Returns the live demo dataset in demo mode, or null in the real app. */
export function useDemoData(): DemoData | null {
  return useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSnapshot,
    demoStore.getServerSnapshot,
  );
}
