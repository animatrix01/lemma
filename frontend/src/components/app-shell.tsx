"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";

export function AppShell({ children }: { children: ReactNode }) {
    const [sidebarHidden, setSidebarHidden] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar hidden={sidebarHidden} />
            <div className="relative flex min-w-0 flex-1 flex-col">
                <div className="absolute inset-x-0 top-0 z-50">
                    <AppTopBar
                        sidebarHidden={sidebarHidden}
                        onToggleSidebar={() => setSidebarHidden((v) => !v)}
                    />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

export default AppShell;
