export type Mode = 'explore' | 'guided' | 'assessment';
export type CaseId = 'seal' | 'inlet' | 'supply';
export type PartId = 'tank' | 'lid' | 'supply' | 'pipe' | 'inlet' | 'float' | 'drain' | 'overflow' | 'water';
export type ComponentId = 'inlet' | 'drain';
export type EvidenceId = 'water' | 'supply' | 'drain' | 'inlet' | 'overflow';
export type RetestPhase = 'idle' | 'filling' | 'holding' | 'draining' | 'refilling' | 'passed' | 'failed';
export interface Evidence { id: EvidenceId; text: string; step: number }
export interface LogEntry { step: number; text: string; kind: 'info' | 'success' | 'error' | 'safety' }
export interface SafetyError { code: string; text: string; step: number }
export interface Retest {
  phase: RetestPhase;
  elapsed: number;
  checks: { assembly: boolean; supply: boolean; stable: boolean; cycle: boolean };
  message: string;
}
export interface Attempt {
  id: string; mode: Mode; caseId: CaseId; startedAt: string; endedAt: string | null;
  status: 'active' | 'completed';
  supplyOpen: boolean; isolatedConfirmed: boolean; water: number; drainRemaining: number; lidOpen: boolean;
  defects: { seal: boolean; inlet: boolean };
  assembly: Record<ComponentId, { installed: boolean; replaced: boolean }>;
  evidence: Partial<Record<EvidenceId, Evidence>>;
  diagnosis: CaseId | null; diagnosisTries: number; firstDiagnosis: CaseId | null;
  process: { isolated: boolean; confirmed: boolean; drained: boolean; repaired: boolean; assembled: boolean };
  logs: LogEntry[]; safetyErrors: SafetyError[]; retest: Retest; feedback: string;
  elapsed: number; step: number;
}
export type Event =
  | { type: 'TICK'; dt: number }
  | { type: 'OBSERVE'; part: PartId }
  | { type: 'CHECK_WATER' }
  | { type: 'CHECK_SUPPLY' }
  | { type: 'SET_SUPPLY'; open: boolean }
  | { type: 'TOGGLE_LID' }
  | { type: 'DRAIN' }
  | { type: 'REMOVE'; component: ComponentId }
  | { type: 'REPLACE'; component: ComponentId }
  | { type: 'ASSEMBLE'; component: ComponentId }
  | { type: 'DIAGNOSE'; diagnosis: CaseId }
  | { type: 'RETEST' }
  | { type: 'FINISH'; at: string };
export interface ScoreItem { label: string; earned: number; possible: number; reason: string }
export interface Score { total: number; passed: boolean; sections: { title: string; earned: number; possible: number; items: ScoreItem[] }[]; reasons: string[] }
