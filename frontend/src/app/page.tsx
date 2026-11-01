"use client";

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

    function handleLogin() {
        localStorage.setItem("lemma_auth", "true");
        router.push("/dashboard");
    }

    function handleGetStarted() {
        localStorage.setItem("lemma_auth", "true");
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
                        <Button variant="ghost" onClick={handleLogin} className="rounded-full text-sm">
                            Sign In
                        </Button>
                        <Button onClick={handleGetStarted} className="rounded-full bg-white text-neutral-900 hover:bg-white/90 text-sm">
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
                        className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0 [filter:brightness(1.04)_contrast(1.03)]"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />
                    <div className="absolute left-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_0%_0%,rgba(0,0,0,0.35),transparent_72%)]" />
                    <div className="absolute right-0 top-0 h-[280px] w-[46%] bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,0,0,0.35),transparent_72%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-56 bg-[linear-gradient(to_top,rgba(13,9,8,0.9),transparent)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:6px_6px]" />

                    <div className="z-10 relative w-full max-w-3xl text-center pt-20 sm:pt-24 lg:pt-28">
                        {/* Badge pill */}
                        <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur animate-fade-slide-in-1">
                            <span className="inline-flex items-center text-xs font-medium text-neutral-900 bg-white/90 rounded-full py-0.5 px-2">
                                New
                            </span>
                            <span className="text-sm font-medium text-white/90">
                                Analyze schemes like a pro — free to try
                            </span>
                        </div>

                        <h1 className="sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-4xl text-white tracking-tight font-normal animate-fade-slide-in-2">
                            Detect information gaps
                            <br className="hidden sm:block" />
                            before they mislead
                        </h1>

                        <p className="sm:text-lg animate-fade-slide-in-3 text-base text-white/80 max-w-2xl mt-6 mx-auto">
                            Verify claims, catch contradictions, find missing data
                        </p>

                        {/* Prompt box — banner CTA slot */}
                        <div className="animate-fade-slide-in-4 w-full max-w-3xl mx-auto mt-12 sm:mt-14">
                            <ClaudeChatInput
                                onSendMessage={handleGetStarted}
                                placeholder="Ask a question to get started..."
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
        </div>
    );
}
