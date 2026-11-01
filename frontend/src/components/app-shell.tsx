"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";

export function AppShell({ children }: { children: ReactNode }) {
    const [sidebarHidden, setSidebarHidden] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar hidden={sidebarHidden} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="relative z-50">
                    <AppTopBar
                        sidebarHidden={sidebarHidden}
                        onToggleSidebar={() => setSidebarHidden((v) => !v)}
                    />
                </div>
                <div className="min-h-0 flex-1">{children}</div>
            </div>
        </div>
    );
}

export default AppShell;
