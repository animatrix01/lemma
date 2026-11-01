import analyzeResponse from "@/mocks/analyze_response.json";
import runEvents from "@/mocks/run_events.json";
import matrix from "@/mocks/matrix.json";
import evidenceChain from "@/mocks/evidence_chain.json";
import checklist from "@/mocks/checklist.json";
import runsList from "@/mocks/runs_list.json";
import evals from "@/mocks/evals.json";
import scannerReport from "@/mocks/scanner_report.json";

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  MatrixResponse,
  EvidenceDetailResponse,
  ChecklistItemOut,
  ChecklistDoneResponse,
  RerunRequest,
  RerunResponse,
  RunsListResponse,
  EvalsResponse,
  ScannerRequest,
  ScannerReportOut,
  SSEEnvelope,
  SourceOut,
  APIError,
} from "@/types/api";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export const mockSources: SourceOut[] = [
  { id: 1, url: "https://example.gov.in/scholarship", title: "Official", page_date: "2025-01-10", tier: "Official", words: 1200, active: true },
  { id: 2, url: "https://news.example.com/update", title: "News", page_date: "2025-02-01", tier: "News", words: 800, active: true },
];

// API Error handler
class APIException extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = "APIException";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let detail: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.detail || errorMessage;
      detail = errorData.detail;
    } catch {
      // Response body is not JSON, use status text
    }

    throw new APIException(errorMessage, response.status, detail);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new APIException("Failed to parse response JSON", response.status);
  }
}

export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  if (MOCK_MODE) return analyzeResponse as AnalyzeResponse;

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleResponse<AnalyzeResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to connect to server");
  }
}

export async function getMatrix(runId: number): Promise<MatrixResponse> {
  if (MOCK_MODE) return matrix as MatrixResponse;

  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/matrix`);
    return handleResponse<MatrixResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to fetch matrix");
  }
}

export async function getEvidence(runId: number, findingId: number): Promise<EvidenceDetailResponse> {
  if (MOCK_MODE) return evidenceChain as EvidenceDetailResponse;

  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/evidence/${findingId}`);
    return handleResponse<EvidenceDetailResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to fetch evidence");
  }
}

export async function getChecklist(runId: number): Promise<ChecklistItemOut[]> {
  if (MOCK_MODE) return checklist as ChecklistItemOut[];

  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/checklist`);
    return handleResponse<ChecklistItemOut[]>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to fetch checklist");
  }
}

export async function toggleChecklist(runId: number, itemId: number): Promise<ChecklistDoneResponse> {
  if (MOCK_MODE) return { item_id: itemId, done: true };

  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/checklist/${itemId}/done`, {
      method: "POST",
    });
    return handleResponse<ChecklistDoneResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to toggle checklist item");
  }
}

export async function rerun(runId: number, disabled: number[]): Promise<RerunResponse> {
  if (MOCK_MODE) return { run_id: runId, status: "recomputed" };

  const payload: RerunRequest = { disabled_source_ids: disabled };

  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/rerun`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<RerunResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to rerun analysis");
  }
}

export async function getRuns(): Promise<RunsListResponse> {
  if (MOCK_MODE) return runsList as RunsListResponse;

  try {
    const response = await fetch(`${API_BASE}/api/runs`);
    return handleResponse<RunsListResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to fetch runs");
  }
}

export async function getEvals(): Promise<EvalsResponse> {
  if (MOCK_MODE) return evals as EvalsResponse;

  try {
    const response = await fetch(`${API_BASE}/evals`);
    return handleResponse<EvalsResponse>(response);
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to fetch evals");
  }
}

export async function getScannerReport(url: string): Promise<ScannerReportOut> {
  if (MOCK_MODE) return scannerReport as ScannerReportOut;

  const payload: ScannerRequest = { url };

  try {
    // Step 1: Start the scan
    const startResponse = await fetch(`${API_BASE}/api/scanner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const startData = await handleResponse<{ report_id: number; status: string }>(startResponse);
    const reportId = startData.report_id;

    // Step 2: Poll for completion or listen to SSE
    // For simplicity, we'll poll every 2 seconds
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportResponse = await fetch(`${API_BASE}/api/scanner/${reportId}`);
      const report = await handleResponse<ScannerReportOut>(reportResponse);
      
      if (report.status === "done") {
        return report;
      } else if (report.status === "failed") {
        throw new APIException("Scanner failed to complete");
      }
      
      attempts++;
    }
    
    throw new APIException("Scanner timed out - please try again");
  } catch (error) {
    if (error instanceof APIException) throw error;
    throw new APIException("Network error: Unable to scan source");
  }
}

export function streamEvents(
  runId: number,
  onEvent: (e: SSEEnvelope) => void,
  onDone: () => void,
  onError?: (error: Error) => void
): () => void {
  if (MOCK_MODE) {
    let i = 0;
    const events = runEvents as SSEEnvelope[];
    const iv = setInterval(() => {
      if (i >= events.length) {
        clearInterval(iv);
        onDone();
        return;
      }
      onEvent(events[i]);
      i++;
    }, 400);
    return () => clearInterval(iv);
  }

  let isClosed = false;
  const es = new EventSource(`${API_BASE}/api/runs/${runId}/status`);

  es.onmessage = (msg) => {
    if (isClosed) return;

    try {
      const data = JSON.parse(msg.data) as SSEEnvelope;
      onEvent(data);

      if (data.type === "run_done" || data.type === "run_failed") {
        isClosed = true;
        es.close();
        onDone();
      }
    } catch (error) {
      console.error("Failed to parse SSE message:", error);
    }
  };

  es.onerror = (error) => {
    if (isClosed) return;

    isClosed = true;
    es.close();

    const apiError = new APIException("SSE connection error", undefined, "The event stream was interrupted");
    if (onError) {
      onError(apiError);
    } else {
      console.error("SSE error:", apiError);
    }
  };

  return () => {
    if (!isClosed) {
      isClosed = true;
      es.close();
    }
  };
}

export { APIException };
