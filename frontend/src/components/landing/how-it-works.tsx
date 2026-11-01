import { Inbox, GitCompareArrows, BadgeCheck } from "lucide-react";

const STEPS = [
    {
        num: "01",
        icon: Inbox,
        title: "Ingest the noise",
        body: "Drop in documents, PDFs, links or just a question. LEMMA pulls every claim, figure and eligibility rule that the decision hinges on.",
    },
    {
        num: "02",
        icon: GitCompareArrows,
        title: "Cross-verify everything",
        body: "Rule-based checks and LLM agents compare each claim across sources — surfacing conflicts, gaps and stale data you would never catch reading one page.",
    },
    {
        num: "03",
        icon: BadgeCheck,
        title: "Get a defensible answer",
        body: "Verdicts arrive side-by-side: what agrees, what contradicts, what is missing. Every answer ranks its sources with confidence scores you can audit.",
    },
];

const TRACE = [
    { label: "Fetching sources", meta: "6 pages", state: "done" },
    { label: "Extracting claims", meta: "14 found", state: "done" },
    { label: "Comparing across sources", meta: "42 checks", state: "done" },
    { label: "Adjudicating conflicts", meta: "2 found", state: "done", kinds: ["CONFLICT", "GAP"] },
    { label: "Drafting the report", meta: null, state: "active" },
];

export function HowItWorks() {
    return (
        <section className="relative w-full px-4 pt-10 sm:pt-14 pb-20 sm:pb-28">
            <div className="mx-auto max-w-5xl">
                {/* Torch — bolt-style ember, our theme color */}
                <div className="relative flex flex-col items-center select-none pointer-events-none mb-10" aria-hidden="true">
                    <div className="absolute top-0 h-[380px] w-[640px] max-w-full rounded-full bg-[radial-gradient(closest-side,rgba(239,68,68,0.16),transparent_70%)] blur-2xl" />
                    <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/70 to-white" />
                    <div className="relative -mt-1 flex items-center justify-center">
                        <span className="absolute h-16 w-16 rounded-full border border-red-500/30" />
                        <span className="absolute h-6 w-6 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9),rgba(239,68,68,0.5)_70%,transparent)] blur-[2px]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_8px_rgba(239,68,68,0.55)]" />
                    </div>
                </div>

                {/* Section heading — open, no container */}
                <div className="text-center mb-14">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500">
                        The pipeline
                    </span>
                    <h2 className="mt-5 text-4xl sm:text-6xl font-normal tracking-tight text-foreground">
                        How LEMMA works
                    </h2>
                    <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
                        A deterministic pipeline with agent intelligence where it counts — every stage observable, every verdict auditable.
                    </p>
                </div>

                {/* Steps — flat columns on hairlines, no boxes */}
                <div className="relative">
                    <div className="grid gap-10 md:grid-cols-3 md:gap-6">
                        {STEPS.map((step) => (
                            <div key={step.num} className="group relative border-t border-white/10 pt-6 transition-colors duration-300 hover:border-red-500/40">
                                <div className="flex items-center gap-2.5">
                                    <step.icon className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {step.title}
                                    </h3>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-zinc-400 pr-2">
                                    {step.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Run trace — the one window we keep, on purpose */}
                <div className="mt-16 grid gap-8 md:grid-cols-[1fr_1.15fr] md:items-center">
                    <div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500">
                            Transparency
                        </span>
                        <h3 className="mt-4 text-3xl sm:text-4xl font-normal text-foreground">
                            Every run shows its work
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                            No black box. You watch claims get extracted, compared and adjudicated in real time —
                            and the final report links every verdict back to its sources.
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#181816] overflow-hidden shadow-lg shadow-black/40">
                        {/* Window chrome */}
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                run-trace · run #42
                            </span>
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                live
                            </span>
                        </div>

                        <div className="p-4 space-y-2 font-mono text-xs sm:text-[13px]">
                            {TRACE.map((t) => (
                                <div
                                    key={t.label}
                                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {t.state === "done" ? (
                                            <span className="text-zinc-400 shrink-0">✓</span>
                                        ) : (
                                            <span className="inline-block w-3.5 h-3.5 shrink-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                                        )}
                                        <span className={t.state === "done" ? "text-zinc-500" : "text-foreground"}>
                                            {t.label}
                                        </span>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {t.kinds && (
                                            <>
                                                {t.kinds.map((k) => (
                                                    <span
                                                        key={k}
                                                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${
                                                            k === "CONFLICT"
                                                                ? "bg-red-500/10 text-red-400"
                                                                : "bg-white/10 text-zinc-300"
                                                        }`}
                                                    >
                                                        {k}
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                        <span className="text-muted-foreground/70 text-[11px]">{t.meta}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-1">
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                                    <div className="h-full w-2/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent bg-[length:200%_100%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
