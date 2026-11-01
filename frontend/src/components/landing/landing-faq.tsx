const FAQS = [
    {
        q: "What does LEMMA actually detect?",
        a: "Three classes of problems: conflicts (sources disagree on the same fact), gaps (something the decision needs is simply missing from every source) and stale data (information that was true once but is outdated now). Each is verified with both deterministic rules and LLM agents.",
    },
    {
        q: "Who is LEMMA for?",
        a: "Anyone making decisions on information they cannot fully trust: students checking scholarship deadlines, researchers validating figures, analysts comparing schemes, or journalists cross-checking a claim before publishing.",
    },
    {
        q: "How accurate is it?",
        a: "On our golden dataset — hand-labelled conflict, gap and stale cases — LEMMA scores 95.5% F1 (96% precision, 95% recall, 100% accuracy). The complete per-kind breakdown is published on the evals page, so the numbers are auditable rather than marketing.",
    },
    {
        q: "What can I feed it?",
        a: "Just type a question, paste text straight in, or upload files and documents. Uploaded material is passed through the ingest pipeline the same way fetched sources are — every claim is extracted and compared.",
    },
    {
        q: "Does LEMMA store my data?",
        a: "Runs are tied to your session so you can return to their reports. We do not train models on your documents, and attachments are only retained as part of your run history.",
    },
    {
        q: "Why should I trust the verdicts?",
        a: "Because you don't have to take our word for it. Every verdict lists the exact sources it was compared against, the pipeline trace is visible while the run happens, and the same pipeline is evaluated continuously on the golden dataset.",
    },
];

export function LandingFaq() {
    return (
        <section className="relative w-full px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-[0.8fr_1.4fr] md:gap-14 items-start">
                {/* Sticky heading column */}
                <div className="md:sticky md:top-24">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500">
                        FAQ
                    </span>
                    <h2 className="mt-5 text-4xl sm:text-5xl font-normal tracking-tight text-foreground">
                        Questions,<br />answered
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-xs">
                        Anything else? Drop it in the prompt box above — LEMMA answers with receipts.
                    </p>
                </div>

                {/* Accordion — hairline rows, no boxes */}
                <div className="border-t border-white/10">
                    {FAQS.map((item) => (
                        <details
                            key={item.q}
                            className="group relative border-b border-white/10"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden transition-colors hover:text-white group-open:text-red-400">
                                <span>{item.q}</span>
                                <svg
                                    className="w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-45 group-open:text-red-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M5 12h14" /><path d="M12 5v14" />
                                </svg>
                            </summary>
                            <p className="pb-6 pr-8 text-sm leading-relaxed text-zinc-400">
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
