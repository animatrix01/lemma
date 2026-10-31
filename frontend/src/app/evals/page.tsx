"use client";

import { useEffect, useState } from "react";
import { getEvals } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EvalsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { getEvals().then(setData); }, []);
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Evals</h1>
      {data && (
        <>
          <div className="text-sm text-muted-foreground">Passed {data.summary.passed}/{data.summary.total}</div>
          <div className="grid gap-3">
            {data.cases.map((c: any) => (
              <Card key={c.id}>
                <CardHeader><CardTitle>{c.id} — {c.kind}</CardTitle></CardHeader>
                <CardContent>{c.passed ? "✓" : "✗"} {c.detail}</CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}