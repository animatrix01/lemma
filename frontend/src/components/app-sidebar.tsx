"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRuns } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { label: "New Analysis", href: "/" },
  { label: "Scan a Source", href: "/scan" },
  { label: "Evals", href: "/evals" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [runs, setRuns] = useState<any[]>([]);
  useEffect(() => { getRuns().then((r: any) => setRuns(r.runs || [])); }, []);
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <div className="text-lg font-semibold tracking-tight">LEMMA</div>
        <div className="text-xs text-muted-foreground">Digital Dark Spot</div>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              buttonVariants({ variant: pathname === n.href ? "secondary" : "ghost" }),
              "justify-start"
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <Separator className="my-3" />
      <div className="px-4 text-xs text-muted-foreground">History</div>
      <div className="flex-1 overflow-auto px-2 py-2 text-sm">
        {runs.length === 0 && <div className="px-2 py-1 text-muted-foreground">No runs yet</div>}
        {runs.map((r) => (
          <Link key={r.id} href={`/runs/${r.id}`} className="block rounded-md px-2 py-1 hover:bg-muted">
            {r.topic}
          </Link>
        ))}
      </div>
    </aside>
  );
}