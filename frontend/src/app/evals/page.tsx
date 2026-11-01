"use client";

import { useEffect, useState } from "react";
import { getEvals, APIException } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EvalsResponse } from "@/types/api";
import { CheckCircle2, XCircle, TrendingUp, Target, Zap, Database } from "lucide-react";

export default function EvalsPage() {
  const [data, setData] = useState<EvalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getEvals()
      .then(setData)
      .catch((err) => {
        const message = err instanceof APIException ? err.message : "Failed to load evals";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-4">
            <h1 className="text-2xl font-semibold tracking-tight">Evaluation Suite</h1>
            <p className="mt-4 text-muted-foreground">Loading evaluation results...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-4">
            <h1 className="text-2xl font-semibold tracking-tight">Evaluation Suite</h1>
            <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  const { cases, summary, metadata } = data;
  const successRate = ((summary.passed / summary.total) * 100).toFixed(1);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-4 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Evaluation Suite</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Golden dataset validation · {cases.length} test cases across {Object.keys(summary.by_kind || {}).length} categories
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {summary.passed}/{summary.total} cases passed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precision</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.precision ? (summary.precision * 100).toFixed(1) : '—'}%
                </div>
                <p className="text-xs text-muted-foreground">True positive rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recall</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.recall ? (summary.recall * 100).toFixed(1) : '—'}%
                </div>
                <p className="text-xs text-muted-foreground">Detection coverage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.f1_score ? summary.f1_score.toFixed(3) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Harmonic mean</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Category */}
          {summary.by_kind && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Category</CardTitle>
                <CardDescription>Breakdown of detection accuracy across issue types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(summary.by_kind).map(([kind, stats]) => (
                    <div key={kind} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium capitalize">{kind}</div>
                        <div className="text-sm text-muted-foreground">
                          {stats.passed}/{stats.total} passed
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{(stats.accuracy * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dataset Metadata */}
          {metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Dataset Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  {metadata.dataset_version && (
                    <>
                      <dt className="text-muted-foreground">Version</dt>
                      <dd className="font-medium">{metadata.dataset_version}</dd>
                    </>
                  )}
                  {metadata.model_version && (
                    <>
                      <dt className="text-muted-foreground">Model</dt>
                      <dd className="font-medium">{metadata.model_version}</dd>
                    </>
                  )}
                  {metadata.last_run && (
                    <>
                      <dt className="text-muted-foreground">Last Run</dt>
                      <dd className="font-medium">
                        {new Date(metadata.last_run).toLocaleDateString()}
                      </dd>
                    </>
                  )}
                  {metadata.test_environment && (
                    <>
                      <dt className="text-muted-foreground">Environment</dt>
                      <dd className="font-medium capitalize">{metadata.test_environment}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Test Cases */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Test Cases</h2>
            <div className="grid gap-3">
              {cases.length === 0 && (
                <p className="text-muted-foreground">No eval cases found</p>
              )}
              {cases.map((c) => (
                <Card key={c.id} className={c.passed ? "" : "border-destructive"}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{c.id}</CardTitle>
                          <Badge variant={c.passed ? "default" : "destructive"} className="shrink-0">
                            {c.kind}
                          </Badge>
                          {c.confidence !== undefined && (
                            <Badge variant="outline" className="shrink-0">
                              {(c.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          )}
                        </div>
                        {c.description && (
                          <CardDescription className="text-sm">{c.description}</CardDescription>
                        )}
                        {c.topic && (
                          <p className="text-xs text-muted-foreground mt-1">Topic: {c.topic}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {c.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {c.detail && (
                    <CardContent>
                      <div className="text-sm">
                        <span className="font-medium">Result: </span>
                        {c.detail}
                      </div>
                      {c.found && c.found.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Detected:</span>
                          {c.found.map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
