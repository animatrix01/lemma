"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LemmaLogo } from "@/components/lemma-logo";
import type { SSEEnvelope } from "@/types/api";

const STAGES = [
    { key: "Ingest", label: "Gathering" },
    { key: "Extract", label: "Extracting" },
    { key: "Map", label: "Mapping" },
    { key: "Analyze", label: "Analyzing" },
];

interface RunFeedProps {
    events: SSEEnvelope[];
    done: boolean;
    className?: string;
}

export function RunFeed({ events, done, className }: RunFeedProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (!showDetails) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [events.length, showDetails]);

    const stageDone = (stage: string) =>
        events.some((e) => e.type === "stage_done" && e.payload?.stage === stage);

    const currentStage = () => {
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (stageDone(STAGES[i].key)) return i + 1;
        }
        return 0;
    };

    const stage = currentStage();
    const allDone = stage === STAGES.length;

    // Count key metrics
    const sourceCount = events.filter((e) => e.type === "source_fetched").length;
    const claimCount = events.reduce(
        (sum, e) => sum + (e.type === "claim_extracted" ? (e.payload?.count_total || 0) : 0),
        0
    );
    const conflictCount = events.filter((e) => e.type === "conflict_found").length;
    const gapCount = events.filter(
        (e) => e.type === "finding_finalized" && e.payload?.kind === "GAP"
    ).length;

    // Get latest meaningful event
    const getLatestActivity = () => {
        if (allDone || done) return "Complete";
        const lastEvent = events[events.length - 1];
        if (!lastEvent) return "Initializing...";
        
        const p = lastEvent.payload || {};
        switch (lastEvent.type) {
            case "search_query":
                return "Searching web sources...";
            case "source_fetched":
                return `Fetched ${sourceCount} source${sourceCount === 1 ? "" : "s"}`;
            case "claim_extracted":
                return `Extracted ${claimCount} claim${claimCount === 1 ? "" : "s"}`;
            case "mapping_progress":
                return "Mapping claims to slots...";
            case "conflict_found":
                return "Detecting contradictions...";
            case "gap_probe":
                return "Probing information gaps...";
            case "stage_done":
                return `${p.stage} complete`;
            default:
                return "Processing...";
        }
    };

    return (
        <div className={cn("flex flex-col items-center gap-8", className)}>
            {/* Animated logo + current stage */}
            <div className="flex flex-col items-center gap-6 py-8">
                <div className="relative">
                    <LemmaLogo
                        className={cn(
                            "w-20 h-20 text-[#FACC15] transition-all",
                            !allDone && !done && "animate-spin-slow"
                        )}
                    />
                    {(allDone || done) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h2 className="text-2xl font-semibold text-foreground">
                        {allDone || done ? "Analysis Complete" : STAGES[stage]?.label || "Initializing"}
                    </h2>
                    <p className="text-base text-muted-foreground animate-pulse">
                        {getLatestActivity()}
                    </p>
                </div>
            </div>

            {/* Progress stages */}
            <div className="flex items-center gap-3 w-full max-w-xl">
                {STAGES.map((s, i) => (
                    <div key={s.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold transition-all",
                                    stageDone(s.key)
                                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                        : stage === i
                                        ? "border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15] animate-pulse"
                                        : "border-border text-muted-foreground"
                                )}
                            >
                                {stageDone(s.key) ? "✓" : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    stageDone(s.key)
                                        ? "text-emerald-400"
                                        : stage === i
                                        ? "text-[#FACC15]"
                                        : "text-muted-foreground"
                                )}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 flex-1 transition-colors",
                                    stageDone(STAGES[i + 1].key)
                                        ? "bg-emerald-500"
                                        : "bg-border"
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-xl">
                <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">{sourceCount}</div>
                    <div className="text-sm text-muted-foreground">Sources</div>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">{claimCount}</div>
                    <div className="text-sm text-muted-foreground">Claims</div>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-red-400">{conflictCount}</div>
                    <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-[#FACC15]">{gapCount}</div>
                    <div className="text-sm text-muted-foreground">Gaps</div>
                </div>
            </div>

            {/* Technical details (collapsed by default) */}
            <div className="w-full max-w-3xl">
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showDetails ? "Hide" : "Show"} technical details
                </button>

                {showDetails && (
                    <div className="mt-4 flex flex-col gap-2 max-h-64 overflow-y-auto p-4 rounded-lg border border-border bg-card">
                        {events.map((e, i) => {
                            const p = e.payload || {};
                            let text = "";
                            let tone = "text-muted-foreground";

                            switch (e.type) {
                                case "search_query":
                                    text = `Searching: "${p.query}"`;
                                    tone = "text-foreground";
                                    break;
                                case "source_fetched":
                                    text = `Fetched ${p.url}`;
                                    tone = "text-muted-foreground";
                                    break;
                                case "claim_extracted":
                                    text = `Extracted ${p.count_total || 1} claims from source #${p.source_id}`;
                                    tone = "text-foreground";
                                    break;
                                case "conflict_found":
                                    text = `Conflict: "${p.slot_key}"`;
                                    tone = "text-red-400";
                                    break;
                                case "gap_probe":
                                    text = `Gap probe: "${p.slot_key}"`;
                                    tone = "text-[#FACC15]";
                                    break;
                                case "stage_done":
                                    text = `✓ ${p.stage} complete`;
                                    tone = "text-emerald-400";
                                    break;
                                default:
                                    text = e.type;
                            }

                            return (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                                    <span className={cn("leading-relaxed font-mono", tone)}>{text}</span>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default RunFeed;
