"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LemmaLogo } from "@/components/lemma-logo";
import type { ScannerReportOut, ScannerStance } from "@/types/api";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Globe,
  BookOpen,
  Newspaper,
  FileText,
  Sparkles,
  ScanLine,
  Eye,
  Zap,
} from "lucide-react";

export default function ScanPage() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<ScannerReportOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [scanProgress, setScanProgress] = useState<string[]>([]);
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);

  // Load report from URL parameter
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (reportId) {
      fetchFinalReport(parseInt(reportId));
    }
  }, [searchParams]);

  const trustedSources = [
    {
      name: "Wikipedia",
      url: "https://www.wikipedia.org",
      icon: <Globe className="h-5 w-5" />,
      description: "Free encyclopedia",
      gradient: "from-blue-500/20 to-cyan-500/20",
      ring: "ring-blue-500/30",
      hover: "hover:ring-blue-500/50",
    },
    {
      name: "Reuters",
      url: "https://www.reuters.com",
      icon: <Newspaper className="h-5 w-5" />,
      description: "Global news agency",
      gradient: "from-orange-500/20 to-amber-500/20",
      ring: "ring-orange-500/30",
      hover: "hover:ring-orange-500/50",
    },
    {
      name: "BBC News",
      url: "https://www.bbc.com/news",
      icon: <Newspaper className="h-5 w-5" />,
      description: "British broadcaster",
      gradient: "from-red-500/20 to-rose-500/20",
      ring: "ring-red-500/30",
      hover: "hover:ring-red-500/50",
    },
    {
      name: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov",
      icon: <BookOpen className="h-5 w-5" />,
      description: "Medical research",
      gradient: "from-emerald-500/20 to-teal-500/20",
      ring: "ring-emerald-500/30",
      hover: "hover:ring-emerald-500/50",
    },
  ];

  const scanProcessSteps = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Extract Claims",
      description: "AI identifies factual statements and claims from the article",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: "Cross-Reference",
      description: "Each claim is verified against trusted sources across the web",
      gradient: "from-blue-500/20 to-indigo-500/20",
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Analyze Evidence",
      description: "Evidence is evaluated and categorized by reliability and accuracy",
      gradient: "from-red-500/20 to-pink-500/20",
    },
  ];

  const stanceConfig: Record<
    ScannerStance,
    {
      variant: "default" | "destructive" | "secondary" | "outline";
      icon: React.ReactNode;
      color: string;
      bgGradient: string;
      label: string;
    }
  > = {
    REFUTED: {
      variant: "destructive",
      icon: <XCircle className="h-4 w-4" />,
      color: "text-red-500",
      bgGradient: "bg-gradient-to-br from-red-500/10 to-red-600/5",
      label: "Refuted",
    },
    UNSUPPORTED: {
      variant: "secondary",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-yellow-500",
      bgGradient: "bg-gradient-to-br from-yellow-500/10 to-yellow-600/5",
      label: "Unsupported",
    },
    UNDATED: {
      variant: "outline",
      icon: <Calendar className="h-4 w-4" />,
      color: "text-blue-500",
      bgGradient: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
      label: "Undated",
    },
    CORROBORATED: {
      variant: "default",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-500",
      bgGradient: "bg-gradient-to-br from-green-500/10 to-green-600/5",
      label: "Corroborated",
    },
  };

  const toggleFinding = (id: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFindings(newExpanded);
  };

  async function scan() {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setError("");
    setLoading(true);
    setReport(null);
    setScanProgress([]);
    setExpandedFindings(new Set());

    try {
      // Start the scan
      const startResponse = await fetch(`${API_BASE}/api/scanner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!startResponse.ok) {
        throw new Error("Failed to start scan");
      }

      const { report_id } = await startResponse.json();
      setCurrentReportId(report_id);

      // Listen to SSE for progress
      const eventSource = new EventSource(
        `${API_BASE}/api/scanner/${report_id}/status`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update progress based on event type
          if (data.type === "scanner_claim_extracted") {
            const msg = data.payload.message || `📝 Found claim: ${data.payload.claim?.substring(0, 60)}...`;
            setScanProgress(prev => [...prev, msg]);
          } else if (data.type === "scanner_check") {
            setScanProgress(prev => [...prev, `🔍 Verifying: ${data.payload.claim?.substring(0, 50)}... (${data.payload.results} sources)`]);
          } else if (data.type === "scanner_verdict") {
            const emoji = data.payload.stance === "REFUTED" ? "❌" : 
                         data.payload.stance === "CORROBORATED" ? "✅" : 
                         data.payload.stance === "UNSUPPORTED" ? "⚠️" : "📅";
            setScanProgress(prev => [...prev, `${emoji} ${data.payload.stance}: ${data.payload.claim?.substring(0, 50)}...`]);
          } else if (data.type === "scanner_done") {
            eventSource.close();
            fetchFinalReport(report_id);
          } else if (data.type === "scanner_failed") {
            eventSource.close();
            setError(data.payload.error || "Scan failed");
            setLoading(false);
            setCurrentReportId(null);
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        fetchFinalReport(report_id);
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan source";
      setError(message);
      setLoading(false);
    }
  }

  async function fetchFinalReport(reportId: number) {
    try {
      const response = await fetch(`${API_BASE}/api/scanner/${reportId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch report");
      }
      const finalReport = await response.json();
      setReport(finalReport);
    } catch (err) {
      setError("Failed to load final report");
    } finally {
      setLoading(false);
      setCurrentReportId(null);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && url.trim()) {
      scan();
    }
  };

  const stats = report?.findings
    ? {
        total: report.findings.length,
        refuted: report.findings.filter((f) => f.stance === "REFUTED").length,
        unsupported: report.findings.filter((f) => f.stance === "UNSUPPORTED").length,
        undated: report.findings.filter((f) => f.stance === "UNDATED").length,
        corroborated: report.findings.filter((f) => f.stance === "CORROBORATED").length,
      }
    : null;

  // Initial hero view (no scan started)
  if (!report && !loading) {
    return (
      <AppShell>
        <div className="relative h-full min-h-0 overflow-y-auto bg-[#0d0908]">
          <div className="relative isolate flex min-h-full flex-col items-center justify-center px-6 py-16">
            {/* Banner background image + overlays */}
            <img
              src="/images/hero-bg.jpg"
              alt=""
              className="w-full h-full object-cover absolute inset-0 [filter:brightness(0.85)_contrast(1.1)]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-transparent to-rose-950/20" />
            
            {/* Animated gradient orbs */}
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-rose-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="z-10 relative w-full max-w-4xl text-center">
              {/* Badge pill */}
              <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-xl animate-fade-slide-in-1">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-white/90">
                  AI-Powered Source Verification
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl leading-tight text-white tracking-tight font-normal animate-fade-slide-in-2">
                Scan the Truth
                <br />
                <span className="bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 bg-clip-text text-transparent">
                  Behind Every Claim
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mt-6 mx-auto leading-relaxed animate-fade-slide-in-3">
                Cross-reference any article with trusted sources. Expose misinformation, verify facts, and uncover the truth.
              </p>

              {/* Input Section */}
              <div className="animate-fade-slide-in-4 w-full max-w-2xl mx-auto mt-12 space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-300" />
                  <div className="relative flex gap-3 p-2 bg-black/40 backdrop-blur-xl rounded-2xl ring-1 ring-white/10">
                    <Input
                      placeholder="Enter article URL to verify (e.g., https://example.com/article)"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 h-14 text-base bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-red-500/50"
                    />
                    <Button 
                      onClick={scan} 
                      disabled={!url.trim()}
                      className="h-14 px-8 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-red-500/25 disabled:opacity-40"
                    >
                      <ScanLine className="mr-2 h-5 w-5" />
                      Scan Now
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/30 backdrop-blur-xl p-4 text-sm text-red-200">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-red-300">Scan Failed</h3>
                        <p className="text-red-200/80 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trusted Sources Section */}
              <div className="mt-16 space-y-6">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-xl font-semibold text-white">Trusted Source Network</h2>
                </div>
                <p className="text-sm text-white/60 max-w-xl mx-auto">
                  We cross-reference claims against authoritative sources to ensure accuracy
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {trustedSources.map((source) => (
                    <a
                      key={source.name}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <div className={`relative overflow-hidden bg-gradient-to-br ${source.gradient} backdrop-blur-xl rounded-2xl p-6 ring-1 ${source.ring} ${source.hover} transition-all duration-300 h-full`}>
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                            {source.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-base text-white mb-1">{source.name}</h3>
                            <p className="text-xs text-white/60">
                              {source.description}
                            </p>
                          </div>
                          <ExternalLink className="h-3 w-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* How It Works Section */}
              <div className="mt-20">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-semibold text-white">How Scanning Works</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {scanProcessSteps.map((step, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-white/10 hover:ring-white/20 transition-all group"
                    >
                      <div className={`absolute -inset-1 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`} />
                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 ring-1 ring-red-500/30 text-red-400">
                            {step.icon}
                          </div>
                          <div className="text-5xl font-bold text-white/5">
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white mb-2">{step.title}</h3>
                          <p className="text-sm text-white/60 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Loading state
  if (loading) {
    return (
      <AppShell>
        <div className="h-full min-h-0 overflow-y-auto bg-[#0d0908]">
          <div className="relative min-h-full">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-red-950/20 to-black" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:32px_32px]" />
          
          {/* Animated scanning effect */}
          <div className="pointer-events-none sticky top-0 z-10 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-shimmer" style={{
            backgroundSize: '200% 100%',
          }} />

            <div className="relative mx-auto max-w-4xl px-6 py-16 space-y-8">
              {/* Scanning Header */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-red-950/30 ring-1 ring-red-500/30 backdrop-blur-xl">
                  <ScanLine className="h-6 w-6 text-red-400 animate-pulse" />
                  <span className="text-lg font-semibold text-white">Scanning in Progress</span>
                </div>
                <p className="text-white/60 max-w-xl mx-auto">
                  Analyzing article and cross-referencing claims with trusted sources
                </p>
              </div>

              {/* Real-time Progress Feed */}
              {scanProgress.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-white">
                      <Eye className="h-4 w-4 text-red-400" />
                      Live Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                      {scanProgress.slice(-15).reverse().map((progress, idx) => (
                        <div
                          key={idx}
                          className="text-sm p-3 rounded-lg bg-white/5 text-white/80 animate-in slide-in-from-left duration-300 border border-white/5"
                        >
                          {progress}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loading Stats Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-white/10 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-2/3 mb-4"></div>
                    <div className="h-10 bg-white/10 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Defensive guard: reached the results view without a report (transient state
  // during report transitions). Hero view (line 267) and loading view cover all
  // other combinations, so report is non-null past this point.
  if (!report) {
    return null;
  }

  // Results view
  return (
    <AppShell>
      <div className="h-full min-h-0 overflow-y-auto bg-[#0d0908]">
        <div className="relative min-h-full">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:32px_32px]" />
        
          <div className="relative mx-auto max-w-5xl px-6 py-10 space-y-8">
            {/* Sticky Header with URL */}
            <div className="sticky top-0 z-10 -mx-6 px-6 pb-6 pt-6 bg-gradient-to-b from-[#0d0908] to-transparent backdrop-blur-sm">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30">
                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white mb-1">Scan Complete</p>
                        <p className="text-sm text-white/60 truncate">{report.url}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReport(null);
                        setUrl("");
                        setError("");
                      }}
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <ScanLine className="mr-2 h-4 w-4" />
                      New Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-400" />
                Scan Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-white/60">
                        <FileText className="h-4 w-4" />
                        <p className="text-sm font-medium">Total Claims</p>
                      </div>
                      <p className="text-5xl font-bold text-white">{stats?.total || 0}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`backdrop-blur-xl transition-all ${
                  stats && stats.refuted > 0
                    ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 ring-2 ring-red-500/20"
                    : "bg-white/5 border-white/10"
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-400">
                        <XCircle className="h-4 w-4" />
                        <p className="text-sm font-medium">Refuted</p>
                      </div>
                      <p className="text-5xl font-bold text-red-400">
                        {stats?.refuted || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`backdrop-blur-xl transition-all ${
                  stats && stats.unsupported > 0
                    ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 ring-2 ring-yellow-500/20"
                    : "bg-white/5 border-white/10"
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-sm font-medium">Unsupported</p>
                      </div>
                      <p className="text-5xl font-bold text-yellow-400">
                        {stats?.unsupported || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`backdrop-blur-xl transition-all ${
                  stats && stats.corroborated > 0
                    ? "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 ring-2 ring-green-500/20"
                    : "bg-white/5 border-white/10"
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <p className="text-sm font-medium">Verified</p>
                      </div>
                      <p className="text-5xl font-bold text-green-400">
                        {stats?.corroborated || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-6">
              {report.findings && report.findings.length === 0 ? (
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl border-blue-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-5">
                      <div className="p-4 rounded-2xl bg-blue-500/20 ring-1 ring-blue-500/30">
                        <CheckCircle2 className="h-8 w-8 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl text-white mb-2">
                          No Factual Claims Found
                        </h3>
                        <p className="text-sm text-white/70 leading-relaxed mb-4">
                          The article doesn't contain verifiable factual claims that can be checked, or the content couldn't be properly extracted from the page.
                        </p>
                        <div className="text-xs text-white/60 space-y-2 bg-white/5 rounded-lg p-4">
                          <p>• Articles behind paywalls or with JavaScript-heavy content may not be accessible</p>
                          <p>• Try a different URL, preferably from Wikipedia, BBC, or other open sources</p>
                          <p>• Opinion pieces and editorials typically don't have checkable claims</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                      <Shield className="h-6 w-6 text-red-400" />
                      Detailed Findings
                    </h2>
                    <Badge className="bg-white/10 text-white border-white/20 text-base px-4 py-1">
                      {report.findings?.length || 0} claim{(report.findings?.length || 0) !== 1 ? "s" : ""}{" "}
                      flagged
                    </Badge>
                  </div>

                  {report.findings?.map((finding) => {
                    const config = stanceConfig[finding.stance];
                    const isExpanded = expandedFindings.has(finding.id);
                    const hasEvidence =
                      finding.evidence?.counter_quote || finding.evidence?.url;

                    return (
                      <Card
                        key={finding.id}
                        className={`${config.bgGradient} backdrop-blur-xl border-white/10 hover:border-white/20 transition-all hover:shadow-2xl`}
                      >
                        <CardContent className="pt-6 space-y-5">
                          {/* Claim Header */}
                          <div className="flex items-start gap-4">
                            <div className={`${config.color} mt-1 p-3 rounded-xl bg-white/5 ring-1 ring-white/10`}>
                              {config.icon}
                            </div>
                            <div className="flex-1 space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <Badge className={`mb-3 ${config.color} bg-white/10 border-white/20`}>
                                    {config.label}
                                  </Badge>
                                  <h3 className="font-semibold text-lg leading-tight text-white">
                                    {finding.claim}
                                  </h3>
                                </div>
                              </div>

                              {/* Quote */}
                              {finding.quote && (
                                <div className="bg-white/5 border-l-4 border-red-500/50 rounded-r-xl p-4 backdrop-blur">
                                  <p className="text-xs font-medium text-white/50 mb-2">
                                    Original Quote:
                                  </p>
                                  <p className="text-sm italic leading-relaxed text-white/80">
                                    &quot;{finding.quote}&quot;
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Evidence Section */}
                          {hasEvidence && (
                            <div className="border-t border-white/10 pt-5 space-y-4">
                              <button
                                onClick={() => toggleFinding(finding.id)}
                                className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-all"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                {isExpanded ? "Hide" : "View"} Evidence & Sources
                              </button>

                              {isExpanded && (
                                <div className="space-y-4 pl-6 animate-in fade-in duration-200">
                                  {finding.evidence?.counter_quote && (
                                    <div className="bg-white/5 border-l-4 border-red-500/70 rounded-r-xl p-4 backdrop-blur">
                                      <p className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-2">
                                        <Shield className="h-3 w-3" />
                                        Counter Evidence from Trusted Source:
                                      </p>
                                      <p className="text-sm leading-relaxed text-white/80">
                                        &quot;{finding.evidence.counter_quote}&quot;
                                      </p>
                                    </div>
                                  )}

                                  {finding.evidence?.url && (
                                    <a
                                      href={finding.evidence.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600/20 to-rose-600/20 hover:from-red-600/30 hover:to-rose-600/30 text-sm text-white font-medium transition-all ring-1 ring-red-500/30 hover:ring-red-500/50"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      View Original Source
                                    </a>
                                  )}

                                  {finding.evidence?.searches && (
                                    <p className="text-xs text-white/50 flex items-center gap-2">
                                      <Search className="h-3 w-3" />
                                      Verified through {finding.evidence.searches} independent
                                      searches
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
