"use client";

import { useState } from "react";
import scannerReport from "@/mocks/scanner_report.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ScanPage() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<any>(null);

  const color: Record<string, string> = {
    REFUTED: "destructive",
    UNSUPPORTED: "secondary",
    UNDATED: "outline",
    CORROBORATED: "default",
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Scan a Source</h1>
      <div className="flex gap-2">
        <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={() => setReport(scannerReport)}>Scan</Button>
      </div>
      {report && (
        <Card>
          <CardHeader><CardTitle>{report.url}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.findings.map((f: any) => (
              <div key={f.id} className="rounded border border-border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={color[f.stance] as any}>{f.stance}</Badge>
                  <span className="font-medium">{f.claim}</span>
                </div>
                <div className="text-sm mt-1">quote: “{f.quote}”</div>
                {f.evidence?.counter_quote && (
                  <div className="text-sm text-muted-foreground">counter: “{f.evidence.counter_quote}” ({f.evidence.url})</div>
                )}
                {f.evidence?.searches && (
                  <div className="text-sm text-muted-foreground">searches: {f.evidence.searches}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}