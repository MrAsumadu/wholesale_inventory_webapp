"use client";

import { Sidebar } from "./sidebar";
import { BottomTabs } from "./bottom-tabs";
import { PwaInstallPrompt } from "./pwa-install-prompt";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomTabs />
      <PwaInstallPrompt />
    </div>
  );
}
