import analyzeResponse from "../mocks/analyze_response.json";
import runEvents from "../mocks/run_events.json";
import matrix from "../mocks/matrix.json";
import evidenceChain from "../mocks/evidence_chain.json";
import checklist from "../mocks/checklist.json";
import runsList from "../mocks/runs_list.json";
import evals from "../mocks/evals.json";
import scannerReport from "../mocks/scanner_report.json";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE !== "false";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export const mockSources = [
  { id: 1, url: "https://example.gov.in/scholarship", title: "Official", page_date: "2025-01-10", tier: "Official", words: 1200, active: true },
  { id: 2, url: "https://news.example.com/update", title: "News", page_date: "2025-02-01", tier: "News", words: 800, active: true },
];

export async function analyze(_req: any) {
  if (MOCK_MODE) return analyzeResponse;
  const r = await fetch(`${API_BASE}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(_req) });
  return r.json();
}

export async function getMatrix(runId: number) {
  if (MOCK_MODE) return matrix;
  const r = await fetch(`${API_BASE}/api/runs/${runId}/matrix`);
  return r.json();
}

export async function getEvidence(runId: number, findingId: number) {
  if (MOCK_MODE) return evidenceChain;
  const r = await fetch(`${API_BASE}/api/runs/${runId}/evidence/${findingId}`);
  return r.json();
}

export async function getChecklist(runId: number) {
  if (MOCK_MODE) return checklist;
  // no GET in contract? assume matrix? fallback mock
  return checklist;
}

export async function toggleChecklist(runId: number, itemId: number) {
  if (MOCK_MODE) return { item_id: itemId, done: true };
  const r = await fetch(`${API_BASE}/api/runs/${runId}/checklist/${itemId}/done`, { method: "POST" });
  return r.json();
}

export async function rerun(runId: number, disabled: number[]) {
  if (MOCK_MODE) return { run_id: runId, status: "recomputed" };
  const r = await fetch(`${API_BASE}/api/runs/${runId}/rerun`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabled_source_ids: disabled }) });
  return r.json();
}

export async function getRuns() {
  if (MOCK_MODE) return runsList;
  const r = await fetch(`${API_BASE}/api/runs`);
  return r.json();
}

export async function getEvals() {
  if (MOCK_MODE) return evals;
  const r = await fetch(`${API_BASE}/evals`);
  return r.json();
}

export async function getScannerReport(_url: string) {
  if (MOCK_MODE) return scannerReport;
  const r = await fetch(`${API_BASE}/api/scanner`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: _url }) });
  return r.json();
}

export function streamEvents(runId: number, onEvent: (e: any) => void, onDone: () => void) {
  if (MOCK_MODE) {
    let i = 0;
    const events = runEvents as any[];
    const iv = setInterval(() => {
      if (i >= events.length) { clearInterval(iv); onDone(); return; }
      onEvent(events[i]);
      i++;
    }, 400);
    return () => clearInterval(iv);
  }
  const es = new EventSource(`${API_BASE}/api/runs/${runId}/status`);
  es.onmessage = (msg) => {
    try {
      const d = JSON.parse(msg.data);
      onEvent(d);
      if (d.type === "run_done" || d.type === "run_failed") { onDone(); es.close(); }
    } catch {}
  };
  return () => es.close();
}
