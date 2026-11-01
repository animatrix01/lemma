"use client";

import { useEffect, useState } from "react";
import { getEvals, APIException } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LemmaLogo } from "@/components/lemma-logo";
import type { EvalsResponse } from "@/types/api";
import { CheckCircle2, XCircle, TrendingUp, Target, Zap, Shield } from "lucide-react";

export default function EvalsPage() {
  const [data, setData] = useState<EvalsResponse | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getEvals()
      .then((res) => {
        // Filter to only 4 categories: gap, stale, conflict, clean (remove multi)
        const filteredCases = res.cases.filter(c => c.kind !== "multi");
        const filteredByKind = Object.fromEntries(
          Object.entries(res.summary.by_kind || {}).filter(([k]) => k !== "multi")
        );
        
        setData({
          ...res,
          cases: filteredCases,
          summary: {
            ...res.summary,
            total: filteredCases.length,
            by_kind: filteredByKind
          }
        });
      })
      .catch((err) => {
        const message = err instanceof APIException ? err.message : "Failed to load evals";
        setError(message);
      });
  }, []);

  if (!data && !error) {
    return (
      <AppShell>
        <div className="relative h-full min-h-0 overflow-y-auto bg-[#0d0908]" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="relative h-full min-h-0 overflow-y-auto bg-[#0d0908]">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-16">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Evaluation Suite</h1>
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 backdrop-blur-xl p-4 text-sm text-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-300">Load Failed</h3>
                  <p className="text-red-200/80 mt-1">{error}</p>
                </div>
              </div>
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
      <div className="relative h-full min-h-0 overflow-y-auto bg-[#0d0908]">
        {/* Banner Background - Fixed positioning */}
        <div className="fixed inset-0 pointer-events-none">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-50 [filter:brightness(0.7)_contrast(1.05)]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0d0908]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Content - Relative positioning above banner */}
        <div className="relative z-10">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 space-y-8">
            {/* Header with badge */}
            <div className="text-center space-y-6 pb-8">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-xl animate-fade-slide-in-1">
                <Shield className="w-5 h-5 text-[#FACC15]" />
                <span className="text-sm font-medium text-white/90">
                  Gold-Standard Validation
                </span>
              </div>

              <div className="space-y-4 animate-fade-slide-in-2">
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white">
                  Evaluation Suite
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                  Validated against real-world cases · {cases.length} test scenarios across {Object.keys(summary.by_kind || {}).length} detection categories
                </p>
              </div>
            </div>

            {/* Key Metrics - Glass Cards */}
            <div className="grid gap-4 md:grid-cols-4 animate-fade-slide-in-3">
              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-white/70">Success Rate</div>
                  <Target className="h-5 w-5 text-[#FACC15]" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">{successRate}%</div>
                <p className="text-sm text-white/60">
                  {summary.passed}/{summary.total} passed
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-white/70">Precision</div>
                  <Zap className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">
                  {summary.precision ? (summary.precision * 100).toFixed(1) : '—'}%
                </div>
                <p className="text-sm text-white/60">True positive rate</p>
              </div>

              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-white/70">Recall</div>
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">
                  {summary.recall ? (summary.recall * 100).toFixed(1) : '—'}%
                </div>
                <p className="text-sm text-white/60">Detection coverage</p>
              </div>

              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-white/70">F1 Score</div>
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">
                  {summary.f1_score ? summary.f1_score.toFixed(3) : '—'}
                </div>
                <p className="text-sm text-white/60">Harmonic mean</p>
              </div>
            </div>

            {/* Performance by Category */}
            {summary.by_kind && (
              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 overflow-hidden animate-fade-slide-in-4">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">Performance by Category</h2>
                  <p className="text-sm text-white/60 mt-1">Detection accuracy breakdown across issue types</p>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(summary.by_kind).map(([kind, stats]) => {
                      const categoryColors: Record<string, { bg: string; text: string; ring: string }> = {
                        gap: { bg: "bg-yellow-500/10", text: "text-yellow-400", ring: "ring-yellow-500/20" },
                        stale: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/20" },
                        conflict: { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/20" },
                        clean: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" }
                      };
                      const colors = categoryColors[kind] || { bg: "bg-white/5", text: "text-white", ring: "ring-white/10" };

                      return (
                        <div 
                          key={kind} 
                          className={`flex items-center justify-between rounded-xl ${colors.bg} border ${colors.ring} p-4`}
                        >
                          <div>
                            <div className={`font-semibold capitalize ${colors.text} text-lg`}>{kind}</div>
                            <div className="text-sm text-white/60 mt-1">
                              {stats.passed}/{stats.total} passed
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${colors.text}`}>
                              {(stats.accuracy * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Dataset Metadata */}
            {metadata && (
              <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">Dataset Information</h2>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
                    {metadata.dataset_version && (
                      <div>
                        <dt className="text-white/60 mb-1">Version</dt>
                        <dd className="font-semibold text-white text-lg">{metadata.dataset_version}</dd>
                      </div>
                    )}
                    {metadata.model_version && (
                      <div>
                        <dt className="text-white/60 mb-1">Model</dt>
                        <dd className="font-semibold text-white text-lg">{metadata.model_version}</dd>
                      </div>
                    )}
                    {metadata.last_run && (
                      <div>
                        <dt className="text-white/60 mb-1">Last Run</dt>
                        <dd className="font-semibold text-white text-lg">
                          {new Date(metadata.last_run).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {metadata.test_environment && (
                      <div>
                        <dt className="text-white/60 mb-1">Environment</dt>
                        <dd className="font-semibold text-white text-lg capitalize">{metadata.test_environment}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Test Cases */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Test Cases</h2>
              <div className="grid gap-4">
                {cases.length === 0 && (
                  <p className="text-white/60">No eval cases found</p>
                )}
                {cases.map((c) => {
                  const categoryColors: Record<string, string> = {
                    gap: "border-yellow-500/30",
                    stale: "border-orange-500/30",
                    conflict: "border-red-500/30",
                    clean: "border-emerald-500/30"
                  };
                  const borderColor = c.passed ? categoryColors[c.kind] || "border-white/10" : "border-red-500/50";

                  return (
                    <div 
                      key={c.id} 
                      className={`rounded-2xl bg-neutral-900/80 backdrop-blur-xl border ${borderColor} overflow-hidden`}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <h3 className="text-lg font-semibold text-white">{c.id}</h3>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  c.kind === "gap" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                                  c.kind === "stale" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                                  c.kind === "conflict" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                }`}
                              >
                                {c.kind}
                              </Badge>
                              {c.confidence !== undefined && (
                                <Badge variant="outline" className="bg-white/5 text-white/70 border-white/20">
                                  {(c.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              )}
                            </div>
                            {c.description && (
                              <p className="text-sm text-white/80 mb-2">{c.description}</p>
                            )}
                            {c.topic && (
                              <p className="text-xs text-white/50">Topic: {c.topic}</p>
                            )}
                          </div>
                          <div className="shrink-0">
                            {c.passed ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-400" />
                            )}
                          </div>
                        </div>
                        {c.detail && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-sm text-white/70">
                              <span className="font-semibold text-white">Result: </span>
                              {c.detail}
                            </div>
                            {c.found && c.found.length > 0 && (
                              <div className="mt-3 flex items-center gap-2 text-xs">
                                <span className="text-white/60">Detected:</span>
                                {c.found.map((f) => (
                                  <Badge key={f} variant="secondary" className="bg-white/10 text-white/80 border-white/20">
                                    {f}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
