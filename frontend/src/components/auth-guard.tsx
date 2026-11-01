"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

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
                <span className={`${playfairDisplay.variable} font-playfair text-5xl font-bold italic text-white animate-pulse`}>
                    Lemma
                </span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
