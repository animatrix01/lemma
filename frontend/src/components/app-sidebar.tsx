"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import {
    Plus,
    Search,
    FlaskConical,
    ChevronDown,
    SlidersHorizontal,
    ScanLine,
} from "lucide-react";
import { LemmaLogo } from "@/components/lemma-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRuns } from "@/lib/api";
import { API_BASE } from "@/lib/api";
import type { RunSummary } from "@/types/api";

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

interface ScanReport {
    id: number;
    url: string;
    status: string;
    created_at?: string;
}

const MOCK_RECENT = [
    "iPhone 15 Pro vs Samsung S24 — battery specs mismatch",
    "New York Times article contradicts Reuters on GDP data",
    "Product recall notice missing from manufacturer website",
    "CEO interview conflicts with Q3 earnings report",
    "Climate study cited by news — original paper shows different conclusion",
    "Hotel cancellation policy differs between booking sites",
    "Software license terms — vendor site vs app store listing",
    "Medical study claims vs peer review findings",
];

interface AppSidebarProps {
    hidden: boolean;
}

export function AppSidebar({ hidden }: AppSidebarProps) {
    const pathname = usePathname();
    const [rail, setRail] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [recentOpen, setRecentOpen] = useState(true);
    const [scansOpen, setScansOpen] = useState(true);
    const [runs, setRuns] = useState<RunSummary[]>([]);
    const [scans, setScans] = useState<ScanReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const loadRuns = async () => {
        setLoading(true);
        try {
            const r = await getRuns();
            setRuns(r.runs || []);
        } catch {
            setRuns([]);
        } finally {
            setLoading(false);
        }
    };

    const loadScans = async () => {
        setScanLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/scanner`);
            if (response.ok) {
                const data = await response.json();
                setScans(data || []);
            }
        } catch {
            setScans([]);
        } finally {
            setScanLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        loadRuns();
        loadScans();
        // Refresh lists every 5 seconds when on relevant pages
        if (pathname === "/" || pathname === "/scan") {
            const interval = setInterval(() => {
                loadRuns();
                loadScans();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [pathname, mounted]);

    if (hidden) return null;

    const expanded = !rail || hovered;

    const items = [
        { label: "New Analysis", href: "/dashboard", icon: Plus },
        { label: "Scan a Source", href: "/scan", icon: Search },
        { label: "Evals", href: "/evals", icon: FlaskConical },
    ];

    const recentItems = [
        ...runs
            .filter((r) => r.id > 0)
            .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
            .slice(0, 10)
            .map((r) => ({ 
                key: `run-${r.id}`, 
                topic: r.topic, 
                href: `/runs/${r.id}`,
                status: r.status 
            })),
    ];

    return (
        <aside
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                "relative z-40 hidden shrink-0 flex-col border-r border-white/5 bg-[#0d0908] text-sidebar-foreground transition-all duration-200 md:flex",
                expanded ? "w-72" : "w-16",
                playfairDisplay.variable
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex items-center gap-3 px-4 pt-4 pb-3",
                    expanded ? "justify-between" : "justify-center"
                )}
            >
                {expanded ? (
                    <Link href="/dashboard" className="flex items-center gap-3 px-0">
                        <span className="font-playfair text-2xl font-bold italic tracking-wide text-white">
                            Lemma
                        </span>
                    </Link>
                ) : (
                    <Link href="/dashboard" title="LEMMA">
                        <span className="font-playfair text-xl font-bold italic text-white">
                            L
                        </span>
                    </Link>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 px-3 mt-2">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        title={expanded ? undefined : item.label}
                        className={cn(
                            buttonVariants({
                                variant: pathname === item.href ? "secondary" : "ghost",
                            }),
                            "justify-start h-10 text-[15px] font-medium",
                            !expanded && "justify-center px-0"
                        )}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {expanded && <span className="truncate">{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Recent section */}
            <div 
                className="mt-6 flex min-h-0 flex-1 flex-col px-3 overflow-y-auto scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {/* Analysis History */}
                {mounted && (
                    <>
                        <div
                            className={cn(
                                "flex items-center justify-between px-3 mb-2",
                                !expanded && "justify-center"
                            )}
                        >
                            {expanded && (
                                <button
                                    type="button"
                                    title="Toggle recent analyses"
                                    onClick={() => setRecentOpen(!recentOpen)}
                                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Recent Analyses
                                    <ChevronDown
                                        className={cn(
                                            "w-4 h-4 transition-transform",
                                            !recentOpen && "-rotate-90"
                                        )}
                                    />
                                </button>
                            )}
                        </div>

                        {expanded && recentOpen && (
                            <div className="flex flex-col gap-1 mb-4">
                                {loading && (
                                    <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                                        Loading...
                                    </div>
                                )}
                                {!loading && recentItems.length === 0 && (
                                    <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                                        No analyses yet
                                    </div>
                                )}
                                {!loading && recentItems.map((item) => {
                                    const inner = (
                                        <div className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                                            <span className={cn(
                                                "h-2 w-2 shrink-0 rounded-full",
                                                item.status === "analyzed" ? "bg-emerald-400/80" :
                                                item.status === "running" ? "bg-[#FACC15] animate-pulse" :
                                                "bg-muted-foreground/50"
                                            )} />
                                            <span className="truncate text-[15px] text-muted-foreground group-hover:text-foreground leading-snug">
                                                {item.topic}
                                            </span>
                                        </div>
                                    );
                                    return item.href ? (
                                        <Link key={item.key} href={item.href} className="block">
                                            {inner}
                                        </Link>
                                    ) : (
                                        <div key={item.key}>{inner}</div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Scan History */}
                        <div
                            className={cn(
                                "flex items-center justify-between px-3 mb-2 mt-2",
                                !expanded && "justify-center"
                            )}
                        >
                            {expanded && (
                                <button
                                    type="button"
                                    title="Toggle scan history"
                                    onClick={() => setScansOpen(!scansOpen)}
                                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Scan History
                                    <ChevronDown
                                        className={cn(
                                            "w-4 h-4 transition-transform",
                                            !scansOpen && "-rotate-90"
                                        )}
                                    />
                                </button>
                            )}
                        </div>

                        {expanded && scansOpen && (
                            <div className="flex flex-col gap-1 pb-2">
                                {scanLoading && (
                                    <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                                        Loading...
                                    </div>
                                )}
                                {!scanLoading && scans.length === 0 && (
                                    <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                                        No scans yet
                                    </div>
                                )}
                                {!scanLoading && scans.map((scan) => {
                                    let displayUrl = scan.url;
                                    try {
                                        displayUrl = new URL(scan.url).hostname.replace('www.', '');
                                    } catch {
                                        // If URL parsing fails, just use the original URL
                                        displayUrl = scan.url.substring(0, 50);
                                    }
                                    return (
                                        <Link 
                                            key={scan.id} 
                                            href={`/scan?report=${scan.id}`}
                                            className="block"
                                        >
                                            <div className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                                                <ScanLine className={cn(
                                                    "h-3.5 w-3.5 shrink-0",
                                                    scan.status === "done" ? "text-emerald-400/80" :
                                                    scan.status === "running" ? "text-[#FACC15] animate-pulse" :
                                                    scan.status === "failed" ? "text-red-400/80" :
                                                    "text-muted-foreground/50"
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-[15px] text-muted-foreground group-hover:text-foreground leading-snug">
                                                        {displayUrl}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

export default AppSidebar;
