"use client";

import { cn } from "@/lib/utils";

export function HeroBackground() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#17102b]"
        >
            {/* Saturated violet field — fills the hero edge-to-edge */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_85%_at_50%_28%,rgba(101,78,255,0.55),rgba(74,52,224,0.42)_42%,rgba(54,38,170,0.30)_66%,rgba(23,16,43,0.94)_100%)]" />

            {/* Brighter violet halo — upper right, drifting */}
            <div
                className={cn(
                    "absolute right-[2%] top-[2%] h-[420px] w-[560px] rounded-full",
                    "bg-[radial-gradient(closest-side,rgba(139,92,246,0.35),rgba(124,58,237,0.16)_55%,transparent_80%)]",
                    "blur-[60px] animate-[heroDrift_9s_ease-in-out_infinite]"
                )}
            />

            {/* Pale-lavender light streak — right of center, like bolt's white bloom */}
            <div
                className={cn(
                    "absolute right-[10%] top-[22%] h-[300px] w-[460px] rounded-full",
                    "bg-[radial-gradient(closest-side,rgba(226,228,255,0.14),rgba(196,200,255,0.06)_55%,transparent_80%)]",
                    "blur-[50px] animate-[heroDrift_12s_ease-in-out_infinite_reverse]"
                )}
            />

            {/* Deep indigo pool — lower left */}
            <div className="absolute -left-[12%] top-[34%] h-[520px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(67,49,190,0.30),rgba(45,32,130,0.14)_55%,transparent_80%)] blur-[70px]" />

            {/* Corner black vignettes — top-left strongest, like the reference's dark clouds */}
            <div className="absolute left-0 top-0 h-[420px] w-[52%] bg-[radial-gradient(ellipse_at_12%_-8%,rgba(0,0,0,0.72),rgba(0,0,0,0.35)_45%,transparent_72%)]" />
            <div className="absolute right-0 top-0 h-[340px] w-[42%] bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,0,0,0.60),transparent_70%)]" />

            {/* Bottom fade — lands back on the page background in the last stretch */}
            <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-[linear-gradient(to_top,#262626_12%,rgba(38,38,38,0))]" />

            {/* Dot texture — uniform across the whole hero */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:6px_6px]" />
        </div>
    );
}
