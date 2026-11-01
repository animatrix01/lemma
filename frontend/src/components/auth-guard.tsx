"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LemmaLogo } from "@/components/lemma-logo";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = localStorage.getItem("lemma_auth");
        if (!auth) {
            router.push("/");
        } else {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, [router]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <LemmaLogo className="w-16 h-16 text-[#FACC15] animate-pulse" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
