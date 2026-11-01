// Generated from backend contracts/api_schema.py
// Keep in sync with backend Pydantic models

// ---------- SSE envelope ----------
export interface SSEEnvelope {
  seq: number;
  ts: string; // ISO datetime
  type: string;
  payload: Record<string, any>;
}

// ---------- event types ----------
export type EventType =
  | "search_query"
  | "source_fetched"
  | "claim_extracted"
  | "mapping_progress"
  | "conflict_found"
  | "gap_probe"
  | "finding_finalized"
  | "stage_done"
  | "run_done"
  | "run_failed"
  | "scanner_claim_extracted"
  | "scanner_check"
  | "scanner_verdict"
  | "scanner_done"
  | "scanner_failed";

// ---------- analyze ----------
export interface AnalyzeRequest {
  topic: string;
  question?: string;
  domain?: string;
  urls?: string[];
  attachments?: string[];
}

export interface AnalyzeResponse {
  run_id: number;
  status: "queued";
}

// ---------- sources ----------
export interface SourceOut {
  id: number;
  url?: string;
  title?: string;
  page_date?: string;
  tier?: string;
  words?: number;
  active: boolean;
}

// ---------- slots / matrix ----------
export interface SlotOut {
  id: number;
  key: string;
  label?: string;
  definition?: string;
  is_core: boolean;
  mapped_count: number;
  state?: string; // evidential state
}

export interface EvidenceOut {
  id: number;
  source_id?: number;
  quote?: string;
  span_start?: number;
  span_end?: number;
  url?: string;
}

export type FindingKind = "GAP" | "CONFLICT" | "STALE" | "SYSTEM";

export interface FindingOut {
  id: number;
  slot_id?: number;
  slot_key?: string;
  kind: FindingKind;
  state: string;
  detail: Record<string, any>;
  evidence: EvidenceOut[];
}

export interface MatrixResponse {
  run_id: number;
  status: string;
  slots: SlotOut[];
  findings: FindingOut[];
}

// ---------- evidence ----------
export interface EvidenceDetailResponse {
  finding_id: number;
  chain: EvidenceOut[];
  detail: Record<string, any>;
}

// ---------- rerun ----------
export interface RerunRequest {
  disabled_source_ids: number[];
}

export interface RerunResponse {
  run_id: number;
  status: string;
}

// ---------- checklist ----------
export interface ChecklistItemOut {
  id: number;
  finding_id?: number;
  prompt: string;
  target_hint?: string;
  done: boolean;
}

export interface ChecklistDoneResponse {
  item_id: number;
  done: boolean;
}

// ---------- scanner ----------
export interface ScannerRequest {
  url: string;
}

export type ScannerStance = "REFUTED" | "UNSUPPORTED" | "UNDATED" | "CORROBORATED";

export interface ScannerFindingOut {
  id: number;
  claim: string;
  quote?: string;
  span_start?: number;
  span_end?: number;
  stance: ScannerStance;
  evidence: Record<string, any>;
}

export interface ScannerReportOut {
  id: number;
  url: string;
  status: string;
  findings: ScannerFindingOut[];
}

// ---------- history ----------
export interface RunSummary {
  id: number;
  topic: string;
  domain?: string;
  created_at?: string; // ISO datetime
  status: string;
}

export interface RunsListResponse {
  runs: RunSummary[];
}

// ---------- evals ----------
export interface EvalCase {
  id: string;
  description?: string;
  topic?: string;
  kind: string;
  passed: boolean;
  detail?: string;
  confidence?: number;
  found?: string[];
}

export interface EvalSummary {
  passed: number;
  total: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  avg_confidence?: number;
  by_kind?: Record<string, { total: number; passed: number; accuracy: number }>;
}

export interface EvalMetadata {
  dataset_version?: string;
  last_run?: string;
  model_version?: string;
  test_environment?: string;
}

export interface EvalsResponse {
  cases: EvalCase[];
  summary: EvalSummary;
  metadata?: EvalMetadata;
}

// ---------- health ----------
export interface HealthResponse {
  status: string;
  version: string;
}

// ---------- API Error ----------
export interface APIError {
  message: string;
  detail?: string;
  status?: number;
}
