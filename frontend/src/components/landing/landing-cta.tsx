"use client";

import Link from "next/link";

export function LandingCta() {
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <section className="relative w-full overflow-hidden py-24 sm:py-32 bg-[#0d0908]">
            {/* Portal arc field — counter-rotating glowing arcs in ember red */}
            <div
                className="pointer-events-none absolute left-1/2 top-[46%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
            >
                {/* deep ambient glow behind the arcs */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(239,68,68,0.10),transparent_65%)] blur-3xl" />
                <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,90,60,0.12),transparent_70%)] blur-2xl" />

                <svg viewBox="0 0 900 900" className="absolute inset-0 h-full w-full">
                    <defs>
                        <linearGradient id="arcGradA" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(254,202,155,0)" />
                            <stop offset="35%" stopColor="rgba(254,159,110,0.85)" />
                            <stop offset="60%" stopColor="rgba(239,68,68,0.9)" />
                            <stop offset="100%" stopColor="rgba(153,27,27,0)" />
                        </linearGradient>
                        <linearGradient id="arcGradB" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,228,196,0)" />
                            <stop offset="45%" stopColor="rgba(255,186,140,0.7)" />
                            <stop offset="75%" stopColor="rgba(220,38,38,0.6)" />
                            <stop offset="100%" stopColor="rgba(127,29,29,0)" />
                        </linearGradient>
                        <linearGradient id="arcGradC" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(120,20,20,0)" />
                            <stop offset="50%" stopColor="rgba(239,68,68,0.5)" />
                            <stop offset="100%" stopColor="rgba(60,10,10,0)" />
                        </linearGradient>
                    </defs>
                    <g className="animate-arc-spin-b" style={{ transformOrigin: "450px 450px" }}>
                        <ellipse cx="450" cy="450" rx="430" ry="430" fill="none" stroke="url(#arcGradA)" strokeWidth="1.5" strokeDasharray="900 1802" strokeLinecap="round" />
                        <ellipse cx="450" cy="450" rx="330" ry="330" fill="none" stroke="url(#arcGradB)" strokeWidth="1" strokeDasharray="620 1452" strokeLinecap="round" />
                    </g>
                    <g className="animate-arc-spin-a" style={{ transformOrigin: "450px 450px" }}>
                        <ellipse cx="450" cy="450" rx="380" ry="380" fill="none" stroke="url(#arcGradB)" strokeWidth="1.25" strokeDasharray="760 1627" strokeLinecap="round" transform="rotate(120 450 450)" />
                        <ellipse cx="450" cy="450" rx="255" ry="255" fill="none" stroke="url(#arcGradA)" strokeWidth="1" strokeDasharray="420 1182" strokeLinecap="round" transform="rotate(250 450 450)" />
                    </g>
                    <g className="animate-arc-spin-c" style={{ transformOrigin: "450px 450px" }}>
                        <ellipse cx="450" cy="450" rx="478" ry="478" fill="none" stroke="url(#arcGradC)" strokeWidth="1" strokeDasharray="1000 2003" strokeLinecap="round" transform="rotate(40 450 450)" />
                        <ellipse cx="450" cy="450" rx="180" ry="180" fill="none" stroke="url(#arcGradC)" strokeWidth="1" strokeDasharray="300 830" strokeLinecap="round" transform="rotate(310 450 450)" />
                    </g>
                </svg>
            </div>

            <div
                className="pointer-events-none absolute top-0 left-1/2 h-px w-2/3 bg-[linear-gradient(to_right,transparent,rgba(239,68,68,0.7),transparent)]"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:6px_6px]"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-3xl px-4 text-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-400">
                    Get started
                </span>
                <h2 className="mt-5 text-4xl sm:text-6xl font-normal tracking-tight text-white leading-[1.05]">
                    Ready to check{" "}
                    <span className="bg-gradient-to-r from-red-300 via-red-500 to-red-700 bg-clip-text text-transparent">
                        the facts?
                    </span>
                </h2>
                <p className="mt-5 text-zinc-400 text-base sm:text-lg">
                    Drop a claim, a scheme, or a messy document — get a verdict.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/evals"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-zinc-300 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
                    >
                        See the evals
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                    </Link>
                    <button
                        onClick={scrollToTop}
                        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500 hover:scale-[1.02] hover:shadow-red-500/40 active:scale-[0.99]"
                    >
                        Start analyzing
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}
