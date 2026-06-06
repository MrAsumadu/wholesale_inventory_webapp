"use client";

import { Sidebar } from "./sidebar";
import { BottomTabs } from "./bottom-tabs";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import { DemoBanner } from "./demo-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <DemoBanner />
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomTabs />
      <PwaInstallPrompt />
    </div>
  );
}
