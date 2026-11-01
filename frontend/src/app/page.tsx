"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Instrument_Serif, Playfair_Display } from "next/font/google";
import { ClaudeChatInput } from "@/components/ui/claude-chat-input";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TrustBento } from "@/components/landing/trust-bento";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingCta } from "@/components/landing/landing-cta";
import { LemmaLogo } from "@/components/lemma-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const instrumentSerif = Instrument_Serif({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-instrument-serif",
    display: "swap",
});

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

export default function LandingPage() {
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [email, setEmail] = useState("demo@lemma.ai");
    const [password, setPassword] = useState("demo123");

    function openAuth() {
        setAuthOpen(true);
    }

    function handleAuthSubmit(e: React.FormEvent) {
        e.preventDefault();
        localStorage.setItem("lemma_auth", "true");
        localStorage.setItem("lemma_user", email);
        setAuthOpen(false);
        router.push("/dashboard");
    }

    return (
        <div className={cn("min-h-screen overflow-x-clip bg-background", instrumentSerif.variable, playfairDisplay.variable)}>            {/* Header — banner glass-pill style */}
            <header className="fixed top-0 left-0 right-0 z-50">
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center">
                        <span className="font-playfair text-3xl font-bold italic tracking-wide text-white">
                            Lemma
                        </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur">
                        <Button variant="ghost" onClick={openAuth} className="rounded-full text-sm">
                            Sign In
                        </Button>
                        <Button onClick={openAuth} className="rounded-full bg-white text-neutral-900 hover:bg-white/90 text-sm">
                            Get Started
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M7 7h10v10" />
                                <path d="M7 17 17 7" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="bg-[#0d0908]">
                {/* Hero Section — banner style */}
                <div className="relative isolate overflow-hidden flex flex-col items-center px-6 pb-20 min-h-[calc(100vh-4rem)]">
                    {/* Banner background image + scrims */}
                    <img
                        src="/images/hero-bg.jpg"
                        alt=""
                        className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0 [filter:brightness(0.85)_contrast(1.03)] opacity-70"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />
                    <div className="absolute left-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_0%_0%,rgba(0,0,0,0.35),transparent_72%)]" />
                    <div className="absolute right-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,0,0,0.35),transparent_72%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-56 bg-[linear-gradient(to_top,rgba(13,9,8,0.9),transparent)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:6px_6px]" />

                    <div className="z-10 relative w-full max-w-5xl text-center pt-20 sm:pt-24 lg:pt-28">
                        {/* Badge pill */}
                        <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur animate-fade-slide-in-1">
                            <span className="inline-flex items-center text-xs font-medium text-neutral-900 bg-white/90 rounded-full py-0.5 px-2">
                                New
                            </span>
                            <span className="text-sm font-medium text-white/90">
                                Analyze schemes like a pro — free to try
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] leading-[1.15] text-white tracking-tight font-bold animate-fade-slide-in-2 whitespace-nowrap">
                            Detect information gaps <br />
                            before they mislead
                        </h1>

                        <p className="sm:text-lg animate-fade-slide-in-3 text-base text-white/80 max-w-2xl mt-6 mx-auto">
                            Verify claims, catch contradictions, find missing data
                        </p>

                        {/* Prompt box — banner CTA slot */}
                        <div className="animate-fade-slide-in-4 w-full max-w-3xl mx-auto mt-12 sm:mt-14">
                            <ClaudeChatInput
                                onSendMessage={() => openAuth()}
                                placeholder="Ask a question to get started..."
                                readOnly
                                onFocus={openAuth}
                            />
                        </div>
                    </div>

                    {/* Sources strip — banner's partner grid */}
                    <div className="z-10 relative w-full mx-auto mt-auto pt-16 pb-2">
                        <p className="animate-fade-slide-in-1 text-sm text-white/70 text-center">
                            Cross-checked across the sources you actually rely on
                        </p>
                        <div className="animate-fade-slide-in-2 mt-6 flex flex-wrap items-center justify-center gap-3">
                            {["Government portals", "Policy PDFs", "News", "Research", "Outdated pages"].map((s) => (
                                <span
                                    key={s}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm"
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15]/80" />
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Below the fold sections */}
                <HowItWorks />
                <TrustBento />
                <LandingFaq />
                <LandingCta />
            </main>
{/* Auth dialog */}
            {authOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setAuthOpen(false)}>
                    <div className="w-full max-w-lg rounded-2xl bg-[#1a1410] p-8 ring-1 ring-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-semibold text-white mb-2">Sign in to Lemma</h2>
                        <p className="text-base text-white/60 mb-6">Use the demo credentials to continue.</p>
                        <form onSubmit={handleAuthSubmit} className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full rounded-lg bg-white/5 px-4 py-3 text-white ring-1 ring-white/10 outline-none focus:ring-white/30 text-base"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full rounded-lg bg-white/5 px-4 py-3 text-white ring-1 ring-white/10 outline-none focus:ring-white/30 text-base"
                            />
                            <div className="text-sm text-white/50">
                                Demo: <span className="text-white/80">demo@lemma.ai</span> / <span className="text-white/80">demo123</span>
                            </div>
                            <button type="submit" className="w-full rounded-full bg-white py-3 text-base font-medium text-black hover:bg-white/90">
                                Continue
                            </button>
                        </form>
                        <button onClick={() => setAuthOpen(false)} className="mt-4 w-full text-sm text-white/50 hover:text-white/80">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
