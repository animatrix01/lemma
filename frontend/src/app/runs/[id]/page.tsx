"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getMatrix, getChecklist, toggleChecklist, rerun, streamEvents, mockSources } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const STAGES = ["Ingest", "Extract", "Map", "Analyze"];

export default function RunPage() {
  const params = useParams();
  const runId = Number(params?.id);
  const [events, setEvents] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const [matrix, setMatrix] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>(mockSources.map((s) => ({ ...s })));
  const [inspector, setInspector] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);

  useEffect(() => {
    const stop = streamEvents(runId, (e) => setEvents((prev) => [...prev, e]), async () => {
      setDone(true);
      const m = await getMatrix(runId);
      setMatrix(m);
      const c = await getChecklist(runId);
      setChecklist(c as any);
    });
    return () => stop();
  }, [runId]);

  const stageDone = (stage: string) => events.some((e) => e.type === "stage_done" && e.payload?.stage === stage);

  async function openInspector(finding: any) {
    setInspector(finding);
    const ev = await (await import("@/lib/api")).getEvidence(runId, finding.id);
    setEvidence(ev);
  }

  async function toggleSource(id: number, checked: boolean) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, active: checked } : s)));
  }

  async function doRerun() {
    const disabled = sources.filter((s) => !s.active).map((s) => s.id);
    await rerun(runId, disabled);
    const m = await getMatrix(runId);
    setMatrix(m);
  }

  async function tickItem(item: any) {
    await toggleChecklist(runId, item.id);
    setChecklist((prev) => prev.map((it) => (it.id === item.id ? { ...it, done: true } : it)));
  }

  const copyChecklist = () => {
    const text = checklist.map((c) => `- [${c.done ? "x" : " "}] ${c.prompt}`).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Run #{runId}</h1>

      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {STAGES.map((s) => (
              <Badge key={s} variant={stageDone(s) ? "default" : "outline"}>{s}</Badge>
            ))}
          </div>
          <ScrollArea className="h-64 rounded-md border border-border p-3">
            {events.map((e, i) => (
              <div key={i} className="text-sm font-mono mb-1">
                <span className="text-muted-foreground">#{e.seq}</span> {e.type}{" "}
                <span className="text-muted-foreground">{JSON.stringify(e.payload)}</span>
              </div>
            ))}
            {!done && <div className="text-sm text-muted-foreground">streaming…</div>}
          </ScrollArea>
        </CardContent>
      </Card>

      {matrix && (
        <>
          <Card>
            <CardHeader><CardTitle>Coverage Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">
            States: Supported by sources · Contradicted by sources · Potentially outdated · Not found in reviewed sources · Unverified
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
                {matrix.slots.map((slot: any) => {
                  const finding = matrix.findings.find((f: any) => f.slot_key === slot.key);
                  return (
                    <div key={slot.id} className="rounded-lg border border-border p-4 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{slot.label}</div>
                        <Badge variant="outline">{slot.state}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{slot.definition}</div>
                      <div className="mt-2 h-2 w-full rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${Math.min(100, (slot.mapped_count || 0) * 33)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        mapped: {slot.mapped_count}
                        {finding && (
                          <button className="ml-2 underline" onClick={() => openInspector(finding)}>
                            view finding
                          </button>
                        )}
                      </div>
                      {slot.mapped_count === 0 && (
                        <div className="mt-2 h-12 rounded bg-zinc-900" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sources.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <Checkbox checked={s.active} onCheckedChange={(c) => toggleSource(s.id, Boolean(c))} />
                  <div className="flex-1">
                    <div>{s.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.page_date} · {s.tier} · {s.words} words
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={doRerun} className="mt-2">Re-run</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Verification Checklist</CardTitle>
              <Button variant="outline" size="sm" onClick={copyChecklist}>Copy as text</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklist.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <Checkbox checked={item.done} onCheckedChange={() => tickItem(item)} />
                  <div>
                    <div>{item.prompt}</div>
                    <div className="text-xs text-muted-foreground">{item.target_hint}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Sheet open={!!inspector} onOpenChange={(o) => !o && setInspector(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Evidence Inspector</SheetTitle></SheetHeader>
          {evidence && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="text-muted-foreground">{evidence.detail?.verdict || ""}</div>
              {evidence.chain?.map((e: any) => (
                <div key={e.id} className="rounded border border-border p-3">
                  <div className="italic">“{e.quote}”</div>
                  <div className="text-xs text-muted-foreground mt-1">{e.url}</div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}