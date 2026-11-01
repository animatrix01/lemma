"use client";

import { useRouter } from "next/navigation";
import { PanelLeft, ChevronLeft, ChevronRight, LogOut, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

export function AppTopBar({
    sidebarHidden,
    onToggleSidebar,
}: {
    sidebarHidden: boolean;
    onToggleSidebar: () => void;
}) {
    const router = useRouter();

    return (
        <div className="flex h-12 shrink-0 items-center justify-between px-3 bg-transparent">
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
                    className={iconBtn}
                >
                    <PanelLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    title="Back"
                    className={iconBtn}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => router.forward()}
                    title="Forward"
                    className={iconBtn}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            <AuthButtons />
        </div>
    );
}

export function AuthButtons() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const email = localStorage.getItem("lemma_user");
        setUserEmail(email);
    }, []);

    function handleLogout() {
        localStorage.removeItem("lemma_auth");
        localStorage.removeItem("lemma_user");
        router.push("/");
    }

    if (userEmail) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{userEmail}</span>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => router.push("/")}
                className={cn(buttonVariants({ variant: "outline" }))}
            >
                Sign In
            </button>
            <button
                type="button"
                onClick={() => router.push("/")}
                className={cn(buttonVariants())}
            >
                Sign Up
            </button>
        </div>
    );
}

