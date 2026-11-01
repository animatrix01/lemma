"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { analyze, APIException, streamEvents } from "@/lib/api";
import { ClaudeChatInput } from "@/components/ui/claude-chat-input";
import { RunFeed } from "@/components/run-feed";
import { AppShell } from "@/components/app-shell";
import { Playfair_Display } from "next/font/google";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyzeRequest, SSEEnvelope } from "@/types/api";

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

interface SentFile {
    id: string;
    file: File;
}

interface SentSnippet {
    id: string;
    content: string;
}

const DOMAIN = "Education";

const EXAMPLES = [
    "Is this scholarship still open for 2026?",
    "Compare benefits across two government schemes",
    "Verify the claims in this policy document",
];

const QUICK_ACTIONS = [
    {
        label: "Analyze Policy",
        template: "Analyze the following policy document for information gaps, inconsistencies, and missing data:\n\n[Paste policy name or document here]\n\nPlease identify:\n- Missing eligibility criteria\n- Unclear terms and conditions\n- Contradictory statements\n- Important dates or deadlines that are not specified",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
        ),
    },
    {
        label: "Check Benefits",
        template: "Compare the benefits and eligibility requirements across these programs:\n\n[Program 1: URL or name]\n[Program 2: URL or name]\n[Program 3: URL or name]\n\nHelp me identify:\n- Which programs I'm eligible for\n- Key differences in benefits\n- Application requirements\n- Important deadlines",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2.5 6 2.5 6 2.5s6 0 6-2.5v-5" />
            </svg>
        ),
    },
    {
        label: "Verify Documents",
        template: "Verify the claims and facts in the following document:\n\n[URL or paste document content here]\n\nCross-reference with trusted sources and identify:\n- Factual inaccuracies\n- Unsupported claims\n- Outdated information\n- Missing citations or sources",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" />
            </svg>
        ),
    },
];

export default function DashboardPage() {
    const router = useRouter();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string>("");
    const [activeRunId, setActiveRunId] = useState<number | null>(null);
    const [topic, setTopic] = useState<string>("");
    const [events, setEvents] = useState<SSEEnvelope[]>([]);
    const [runDone, setRunDone] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [promptTemplate, setPromptTemplate] = useState<string>("");

    // Check auth
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const auth = localStorage.getItem("lemma_auth");
        if (!auth) {
            router.push("/");
        } else {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, [router]);

    useEffect(() => {
        if (!activeRunId) return;
        const stop = streamEvents(
            activeRunId,
            (e) => {
                setEvents((prev) => [...prev, e]);
                if (e.type === "run_done") {
                    setRunDone(true);
                    setTimeout(() => setShouldRedirect(true), 2000);
                }
            },
            () => {
                setRunDone(true);
                setTimeout(() => setShouldRedirect(true), 2000);
            },
            (err) => {
                setError(err.message);
                setRunDone(true);
            }
        );
        return () => stop();
    }, [activeRunId]);

    async function startAnalysis(topic: string, files: SentFile[] = [], pastedContent: SentSnippet[] = []) {
        if (!topic.trim() && files.length === 0 && pastedContent.length === 0) {
            setError("Please enter a topic or question");
            return;
        }

        setError("");
        setEvents([]);
        setRunDone(false);
        setSending(true);

        try {
            const attachments = await uploadFiles([...files, ...pastedContent.map(p => ({
                id: p.id,
                file: new File([p.content], 'pasted-text.txt', { type: 'text/plain' }),
            }))]);

            const request: AnalyzeRequest = {
                topic: topic.trim() || "Analyze uploaded content",
                question: topic.trim() || "Analyze uploaded content",
                domain: DOMAIN,
                urls: [],
                attachments,
            };

            const res = await analyze(request);
            setTopic(request.topic);
            setActiveRunId(res.run_id);
        } catch (err) {
            if (err instanceof APIException) {
                setError(err.message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to start analysis. Please try again.");
            }
        } finally {
            setSending(false);
        }
    }

    async function uploadFiles(files: SentFile[]): Promise<string[]> {
        if (files.length === 0) return [];

        const attachments: string[] = [];

        for (const fileObj of files) {
            try {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result);
                    };
                    reader.onerror = () => reject(new Error(`Failed to read ${fileObj.file.name}`));
                    reader.readAsDataURL(fileObj.file);
                });
                attachments.push(base64);
            } catch (err) {
                throw new Error(`Failed to process file: ${fileObj.file.name}`);
            }
        }

        return attachments;
    }

    async function handleSendMessage(data: {
        message: string;
        files: SentFile[];
        pastedContent: SentSnippet[];
        model: string;
        isThinkingEnabled: boolean;
    }) {
        const text = (data.message || "").trim();
        if (!text) return;
        const id = "session_" + Date.now();
        // Stash the opening message so the chat page can send it on mount.
        try {
            sessionStorage.setItem(`lemma_chat_${id}`, text);
        } catch {}
        router.push(`/c/${id}`);
    }

    const inRun = activeRunId !== null;

    if (!isAuthenticated && !isLoading) {
        return null;
    }

    return (
        <AppShell>
            {inRun ? (
                <div className="flex h-full flex-col">
                    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-2 pb-2 flex flex-col min-h-0">
                        <div className="text-center mb-3 shrink-0">
                            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                Run #{activeRunId}
                            </p>
                            <h2 className="text-lg font-medium text-foreground mt-1 truncate">{topic}</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 px-1">
                            <RunFeed events={events} done={runDone} />
                        </div>

                        {error && (
                            <div className="mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive shrink-0">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 px-4 pb-4">
                        <div className="mx-auto w-full max-w-2xl">
                            {shouldRedirect && (
                                <div className="flex justify-center mb-3">
                                    <Link
                                        href={`/runs/${activeRunId}`}
                                        className={cn(buttonVariants({ size: "lg" }), "shadow-md animate-in fade-in-0 zoom-in-95 duration-300")}
                                    >
                                        View Full Report â†’
                                    </Link>
                                </div>
                            )}
                            {!runDone && (
                                <ClaudeChatInput onSendMessage={handleSendMessage} />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative h-full overflow-hidden bg-[#0d0908]">
                    <div className="relative isolate flex flex-col items-center justify-center px-6 h-full pb-[7rem]">
                        {/* Banner background image + scrims */}
                        <img
                            src="/images/hero-bg.jpg"
                            alt=""
                            className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0 [filter:brightness(0.85)_contrast(1.03)] opacity-70"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />
                        <div className="absolute left-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_0%_0%,rgba(0,0,0,0.8),transparent_72%)]" />
                        <div className="absolute right-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,0,0,0.8),transparent_72%)]" />
                        <div className="absolute bottom-0 left-0 right-0 h-56 bg-[linear-gradient(to_top,rgba(38,38,38,0.97),transparent)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:6px_6px]" />

                        <div className="z-10 relative w-full max-w-3xl text-center">
                            {/* Welcome text */}
                            <div className="mb-2 mt-0">
                                <p className="text-2xl sm:text-3xl text-white/90 font-semibold tracking-tight">
                                    Welcome back, Guest
                                </p>
                            </div>

                            <h1 className="mt-20 sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-4xl text-white tracking-tight font-bold animate-fade-slide-in-2">
                                Ask anything.
                                <br />
                                We'll find the truth.
                            </h1>

                            <p className="sm:text-xl animate-fade-slide-in-3 text-lg text-white/85 max-w-2xl mt-6 mx-auto font-medium">
                                Verify claims, catch contradictions, find missing data
                            </p>

                            {error && (
                                <div className="mt-6 mx-auto max-w-2xl rounded-md border border-destructive/60 bg-destructive/15 backdrop-blur p-4 text-sm text-white">
                                    {error}
                                </div>
                            )}

                            {/* Prompt box â€” banner CTA slot */}
                            <div className="animate-fade-slide-in-4 w-full max-w-3xl mx-auto mt-[8.25rem]">
                                <ClaudeChatInput 
                                    onSendMessage={handleSendMessage}
                                    initialMessage={promptTemplate}
                                />
                            </div>

                            {/* Quick actions */}
                            <div className="flex flex-wrap justify-center gap-3 mt-6 max-w-2xl mx-auto">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action.label}
                                        disabled={sending}
                                        onClick={() => setPromptTemplate(action.template)}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white/90 bg-white/10 border border-white/10 rounded-full backdrop-blur-sm hover:bg-white/15 hover:text-white transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {action.icon}
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
