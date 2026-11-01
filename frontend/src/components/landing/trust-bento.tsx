import { FileCheck, ShieldAlert, Clock3 } from "lucide-react";

const PROOFS = [
    {
        name: "nsp.gov.in — scheme portal",
        kind: "Verified",
        icon: FileCheck,
        tone: "text-emerald-400",
        dot: "bg-emerald-400",
    },
    {
        name: "State welfare circular (PDF)",
        kind: "Conflict",
        icon: ShieldAlert,
        tone: "text-red-400",
        dot: "bg-red-400",
    },
    {
        name: "Press release — Feb 2024",
        kind: "Stale",
        icon: Clock3,
        tone: "text-rose-400",
        dot: "bg-rose-400",
    },
];

const METRICS = [
    { label: "Precision", value: "96%" },
    { label: "Recall", value: "95%" },
    { label: "Accuracy", value: "100%" },
];

export function TrustBento() {
    return (
        <section className="relative w-full overflow-hidden px-4 py-20 sm:py-28">
            {/* ember arc rising from the top edge — same treatment as the CTA band */}
            <div
                className="pointer-events-none absolute -top-64 left-1/2 h-[340px] w-[110%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(239,68,68,0.10),transparent_70%)] blur-3xl"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute top-0 left-1/2 h-px w-2/5 -translate-x-1/2 bg-[linear-gradient(to_right,transparent,rgba(239,68,68,0.35),transparent)]"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:6px_6px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-5xl grid gap-14 md:grid-cols-[1fr_1.2fr] md:gap-10 items-start">
                {/* Big stat — open on the page */}
                <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500">
                        Measured, not promised
                    </span>
                    <p className="mt-6 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-[96px] leading-none font-bold tracking-tighter text-transparent sm:text-[120px]">
                        95.5
                    </p>
                    <p className=" mt-3 text-xl font-medium text-foreground/90">F1 score</p>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                        Scored on a golden dataset of hand-labelled conflict, gap and stale-source cases.
                        Full breakdown published on the evals page.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {METRICS.map((m, i) => (
                            <span key={m.label} className="inline-flex items-center gap-2">
                                {i > 0 && <span className="text-red-500/60">·</span>}
                                <span className="font-semibold text-white">{m.value}</span>
                                <span className="text-zinc-500">{m.label}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Proof list — hairlines only */}
                <div>
                    <h3 className="text-3xl sm:text-4xl font-normal text-foreground">
                        Every claim shows its proof
                    </h3>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
                        LEMMA never answers without receipts. Verdicts carry the exact sources they came from,
                        flagged by what the cross-check found.
                    </p>
                    <div className="mt-8 border-t border-white/10">
                        {PROOFS.map((p) => (
                            <div
                                key={p.name}
                                className="group flex items-center justify-between gap-4 py-5 border-b border-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <p.icon
                                        className={`w-4 h-4 shrink-0 ${p.tone} opacity-70 group-hover:opacity-100 transition-opacity`}
                                        strokeWidth={1.75}
                                    />
                                    <span className="text-sm text-foreground/90 truncate">{p.name}</span>
                                </div>
                                <span className={`shrink-0 inline-flex items-center gap-2 text-xs font-medium ${p.tone}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                                    {p.kind}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
