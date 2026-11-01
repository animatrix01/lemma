"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMatrix,
  getChecklist,
  toggleChecklist,
  getEvidence,
  streamEvents,
  APIException,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileQuestion, 
  ArrowLeft, 
  ExternalLink, 
  Info,
  FileText,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SSEEnvelope,
  MatrixResponse,
  ChecklistItemOut,
  FindingOut,
  EvidenceDetailResponse,
  SlotOut,
} from "@/types/api";

export default function RunPage() {
  const params = useParams();
  const router = useRouter();
  const runId = Number(params?.id);
  const [events, setEvents] = useState<SSEEnvelope[]>([]);
  const [done, setDone] = useState(false);
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItemOut[]>([]);
  const [inspector, setInspector] = useState<FindingOut | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDetailResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState({ matrix: false, evidence: false });
  const [showTechnical, setShowTechnical] = useState(false);
  const [filterState, setFilterState] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(runId) || runId <= 0) {
      setError("Invalid run ID");
      return;
    }

    loadMatrixAndChecklist();

    const stop = streamEvents(
      runId,
      (e) => {
        setEvents((prev) => [...prev, e]);
        if (e.type === "run_done") {
          setTimeout(() => loadMatrixAndChecklist(), 1000);
        }
      },
      async () => {
        setDone(true);
        await loadMatrixAndChecklist();
      },
      (err) => {
        setError(err.message);
        setDone(true);
        loadMatrixAndChecklist();
      }
    );
    return () => stop();
  }, [runId]);

  async function loadMatrixAndChecklist() {
    setLoading((prev) => ({ ...prev, matrix: true }));
    try {
      const [matrixData, checklistData] = await Promise.all([
        getMatrix(runId).catch(() => null),
        getChecklist(runId).catch(() => []),
      ]);
      if (matrixData) setMatrix(matrixData);
      setChecklist(checklistData || []);
    } finally {
      setLoading((prev) => ({ ...prev, matrix: false }));
    }
  }

  async function openInspector(finding: FindingOut) {
    setInspector(finding);
    setEvidence(null);
    setLoading((prev) => ({ ...prev, evidence: true }));
    try {
      const ev = await getEvidence(runId, finding.id);
      setEvidence(ev);
    } catch {
      setEvidence(null);
    } finally {
      setLoading((prev) => ({ ...prev, evidence: false }));
    }
  }

  async function tickItem(item: ChecklistItemOut) {
    try {
      await toggleChecklist(runId, item.id);
      setChecklist((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, done: true } : it))
      );
    } catch (err) {
      console.error("Failed to update checklist:", err);
    }
  }

  if (isNaN(runId) || runId <= 0) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Card className="p-6">
            <p className="text-destructive">Invalid run ID</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!matrix) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center bg-[#0d0908]">
          <Card className="p-6 max-w-md bg-white/5 backdrop-blur-xl border-white/10">
            <p className="text-white/70">
              {error || "No data available yet. The analysis may still be running."}
            </p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Calculate metrics
  const conflicts = matrix.findings.filter((f) => f.kind === "CONFLICT");
  const gaps = matrix.findings.filter((f) => f.kind === "GAP");
  const stale = matrix.findings.filter((f) => f.kind === "STALE");
  const systemFindings = matrix.findings.filter((f) => f.kind === "SYSTEM");
  
  // Count sources from events
  const sourceEvents = events.filter((e) => e.type === "source_fetched");
  const totalSources = sourceEvents.length;
  
  // Calculate total claims from slots
  const totalClaims = matrix.slots.reduce((sum, s) => sum + (s.mapped_count || 0), 0);
  
  // Check for insufficient evidence condition
  const hasInsufficientEvidence = systemFindings.some(
    f => f.detail?.reason === "extraction_failure"
  );

  // Get query info from events if available
  const searchEvent = events.find(e => e.type === "search_query");
  const queryTopic = searchEvent?.payload?.query || `Run #${runId}`;

  // Filter findings based on selected state
  const filteredFindings = filterState 
    ? matrix.findings.filter(f => {
        if (filterState === "CONFLICT") return f.kind === "CONFLICT";
        if (filterState === "GAP") return f.kind === "GAP";
        if (filterState === "STALE") return f.kind === "STALE";
        if (filterState === "SYSTEM") return f.kind === "SYSTEM";
        return true;
      })
    : matrix.findings;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-foreground">Analysis Report</h1>
                <p className="text-base text-muted-foreground mt-1 truncate">{queryTopic}</p>
                <p className="text-xs text-muted-foreground">Run #{runId}</p>
              </div>
            </div>
            {matrix.status && (
              <Badge 
                variant={matrix.status === "analyzed" ? "default" : "secondary"}
                className="shrink-0"
              >
                {matrix.status}
              </Badge>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Insufficient Evidence Warning */}
          {hasInsufficientEvidence && (
            <Card className="border-2 border-orange-500/50 bg-orange-500/5">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-400 shrink-0 mt-1" />
                  <div>
                    <CardTitle className="text-orange-400">Insufficient Evidence</CardTitle>
                    <CardDescription className="mt-2 text-foreground/80">
                      We reviewed {totalSources} source{totalSources !== 1 ? "s" : ""}, but no usable claims could be extracted. 
                      The requirements could not be assessed reliably. Any apparently missing information should be treated as 
                      unresolved, not as confirmed gaps.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Sources reviewed: {totalSources}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>Claims extracted: 0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Next step: Review source quality and try additional sources</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investigation Metrics */}
          {!hasInsufficientEvidence && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6 pb-5 text-center">
                  <div className="text-3xl font-bold text-foreground">{totalSources}</div>
                  <div className="text-sm text-muted-foreground mt-1">Sources</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 pb-5 text-center">
                  <div className="text-3xl font-bold text-foreground">{totalClaims}</div>
                  <div className="text-sm text-muted-foreground mt-1">Claims</div>
                </CardContent>
              </Card>
              <Card className={cn(conflicts.length > 0 && "border-red-500/50")}>
                <CardContent className="pt-6 pb-5 text-center">
                  <div className={cn("text-3xl font-bold", conflicts.length > 0 ? "text-red-400" : "text-foreground")}>
                    {conflicts.length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Conflicts</div>
                </CardContent>
              </Card>
              <Card className={cn(gaps.length > 0 && "border-[#FACC15]/50")}>
                <CardContent className="pt-6 pb-5 text-center">
                  <div className={cn("text-3xl font-bold", gaps.length > 0 ? "text-[#FACC15]" : "text-foreground")}>
                    {gaps.length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Gaps</div>
                </CardContent>
              </Card>
              <Card className={cn(stale.length > 0 && "border-orange-500/50")}>
                <CardContent className="pt-6 pb-5 text-center">
                  <div className={cn("text-3xl font-bold", stale.length > 0 ? "text-orange-400" : "text-foreground")}>
                    {stale.length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Outdated</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Executive Summary */}
          {!hasInsufficientEvidence && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Executive Summary</CardTitle>
                <CardDescription>Investigation outcome</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {conflicts.length === 0 && gaps.length === 0 && stale.length === 0 ? (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-emerald-400 mb-1">No Critical Issues Found</div>
                      <div className="text-sm text-foreground/80">
                        Reviewed {totalSources} source{totalSources !== 1 ? "s" : ""} and extracted {totalClaims} claim{totalClaims !== 1 ? "s" : ""}. 
                        All reviewed sources are consistent and comprehensive for the analyzed criteria.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-foreground/90">
                    <p>
                      Investigation reviewed {totalSources} source{totalSources !== 1 ? "s" : ""} and 
                      extracted {totalClaims} claim{totalClaims !== 1 ? "s" : ""} across {matrix.slots.length} requirement
                      {matrix.slots.length !== 1 ? "s" : ""}.
                    </p>
                    {conflicts.length > 0 && (
                      <p className="text-red-400">
                        • Found {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} where sources provide contradictory information
                      </p>
                    )}
                    {gaps.length > 0 && (
                      <p className="text-[#FACC15]">
                        • Identified {gaps.length} information gap{gaps.length !== 1 ? "s" : ""} where critical data was not found
                      </p>
                    )}
                    {stale.length > 0 && (
                      <p className="text-orange-400">
                        • Detected {stale.length} potentially outdated reference{stale.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requirement Coverage */}
          {!hasInsufficientEvidence && matrix.slots.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">Requirement Coverage</h2>
                <div className="flex gap-2">
                  <Button
                    variant={filterState === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterState(null)}
                  >
                    All
                  </Button>
                  {conflicts.length > 0 && (
                    <Button
                      variant={filterState === "CONFLICT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterState("CONFLICT")}
                    >
                      Conflicts
                    </Button>
                  )}
                  {gaps.length > 0 && (
                    <Button
                      variant={filterState === "GAP" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterState("GAP")}
                    >
                      Gaps
                    </Button>
                  )}
                  {stale.length > 0 && (
                    <Button
                      variant={filterState === "STALE" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterState("STALE")}
                    >
                      Outdated
                    </Button>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {matrix.slots.map((slot) => {
                      const slotFindings = matrix.findings.filter(f => f.slot_id === slot.id);
                      const hasIssues = slotFindings.length > 0;
                      const criticalIssue = slotFindings.find(f => f.kind === "CONFLICT") || 
                                           slotFindings.find(f => f.kind === "GAP") ||
                                           slotFindings[0];
                      
                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-start justify-between p-4 rounded-lg border transition-colors",
                            hasIssues ? "border-border bg-muted/30 hover:bg-muted/50" : "border-border hover:bg-muted/30",
                            criticalIssue && "cursor-pointer"
                          )}
                          onClick={() => criticalIssue && openInspector(criticalIssue)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-foreground">{slot.label || slot.key}</div>
                              {slot.is_core && (
                                <Badge variant="secondary" className="text-xs">Core</Badge>
                              )}
                            </div>
                            {slot.definition && (
                              <div className="text-sm text-muted-foreground mt-1">{slot.definition}</div>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                {slot.mapped_count} claim{slot.mapped_count !== 1 ? "s" : ""}
                              </span>
                              {hasIssues && (
                                <div className="flex items-center gap-2">
                                  {slotFindings.map(f => (
                                    <Badge 
                                      key={f.id}
                                      variant="outline"
                                      className={cn(
                                        f.kind === "CONFLICT" && "border-red-500/50 text-red-400",
                                        f.kind === "GAP" && "border-[#FACC15]/50 text-[#FACC15]",
                                        f.kind === "STALE" && "border-orange-500/50 text-orange-400"
                                      )}
                                    >
                                      {f.kind}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {criticalIssue && (
                            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Key Findings */}
          {!hasInsufficientEvidence && (conflicts.length > 0 || gaps.length > 0 || stale.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Key Findings</h2>

              {conflicts.length > 0 && (
                <Card className="border-red-500/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                      <div>
                        <CardTitle className="text-red-400">
                          {conflicts.length} Conflict{conflicts.length !== 1 ? "s" : ""} Detected
                        </CardTitle>
                        <CardDescription>Sources contain contradictory information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {conflicts.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => openInspector(f)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{f.slot_key}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {f.detail?.values && f.detail.values.length > 0
                                ? `Conflicting values: ${f.detail.values.join(" vs ")}`
                                : "Multiple sources disagree"}
                            </div>
                            {f.detail?.method && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Detected via {f.detail.method}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {gaps.length > 0 && (
                <Card className="border-[#FACC15]/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-6 h-6 text-[#FACC15] shrink-0" />
                      <div>
                        <CardTitle className="text-[#FACC15]">
                          {gaps.length} Information Gap{gaps.length !== 1 ? "s" : ""}
                        </CardTitle>
                        <CardDescription>Critical information not found in sources</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {gaps.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => openInspector(f)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{f.slot_key}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Not found in {f.detail?.sources_checked || 0} reviewed sources
                            </div>
                            {f.detail?.probes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Attempted {f.detail.probes} additional search{f.detail.probes !== 1 ? "es" : ""}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {stale.length > 0 && (
                <Card className="border-orange-500/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-orange-400 shrink-0" />
                      <div>
                        <CardTitle className="text-orange-400">
                          {stale.length} Potentially Outdated
                        </CardTitle>
                        <CardDescription>Information may no longer be current</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stale.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => openInspector(f)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{f.slot_key}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {f.detail?.claim_date 
                                ? `From ${f.detail.claim_date}` 
                                : f.detail?.reference 
                                ? `References ${f.detail.reference}`
                                : "Old reference date"}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* What to Verify Next */}
          {checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>What to Verify Next</CardTitle>
                <CardDescription>Recommended verification actions based on findings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => tickItem(item)}
                      className="mt-1 shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm",
                        item.done && "line-through text-muted-foreground"
                      )}>
                        {item.prompt}
                      </div>
                      {item.target_hint && !item.done && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {item.target_hint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Investigation Timeline */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <CardTitle>Investigation Timeline</CardTitle>
                  <CardDescription>Detailed execution log</CardDescription>
                </div>
                {showTechnical ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </CardHeader>
            {showTechnical && (
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.map((e, i) => (
                    <div 
                      key={i} 
                      className="text-xs font-mono p-2 rounded bg-muted/30 border border-border"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">#{e.seq}</span>
                        <span className="text-foreground font-medium shrink-0">{e.type}</span>
                        <span className="text-muted-foreground flex-1 break-all">
                          {JSON.stringify(e.payload)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Evidence Inspector */}
      <Sheet open={!!inspector} onOpenChange={(o) => !o && setInspector(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{inspector?.slot_key}</SheetTitle>
            <SheetDescription>
              <Badge 
                variant="outline"
                className={cn(
                  inspector?.kind === "CONFLICT" && "border-red-500/50 text-red-400",
                  inspector?.kind === "GAP" && "border-[#FACC15]/50 text-[#FACC15]",
                  inspector?.kind === "STALE" && "border-orange-500/50 text-orange-400",
                  inspector?.kind === "SYSTEM" && "border-border text-foreground"
                )}
              >
                {inspector?.kind}
              </Badge>
              <span className="ml-2">{inspector?.state}</span>
            </SheetDescription>
          </SheetHeader>
          {loading.evidence && (
            <div className="mt-6 text-center text-sm text-muted-foreground">Loading evidence...</div>
          )}
          {evidence && (
            <div className="mt-6 space-y-4">
              {evidence.chain && evidence.chain.length > 0 ? (
                evidence.chain.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="pt-6">
                      <div className="text-sm italic text-foreground mb-3 leading-relaxed">
                        &quot;{e.quote}&quot;
                      </div>
                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#FACC15] hover:text-[#FACC15]/80 flex items-center gap-1 break-all"
                        >
                          {e.url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8 border border-border rounded-lg">
                  No evidence available for this finding
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
