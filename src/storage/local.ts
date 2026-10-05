import { z } from 'zod';
import type { Attempt, Mode } from '../domain/types';

export const STORAGE_KEY = 'shouyihuo.local.v1';
export const SCHEMA_VERSION = 1;
const modes = z.enum(['explore', 'guided', 'assessment']);
const cases = z.enum(['seal', 'inlet', 'supply']);
const count = z.number().int().nonnegative();
const component = z.object({ installed: z.boolean(), replaced: z.boolean() });
const evidence = z.object({ id: z.enum(['water', 'supply', 'drain', 'inlet', 'overflow']), text: z.string(), step: count });
export const attemptSchema = z.object({
  id: z.string().min(1), mode: modes, caseId: cases, startedAt: z.iso.datetime(), endedAt: z.iso.datetime().nullable(), status: z.enum(['active', 'completed']),
  supplyOpen: z.boolean(), isolatedConfirmed: z.boolean(), water: z.number().min(0).max(1), drainRemaining: z.number().min(0).max(2), lidOpen: z.boolean(),
  defects: z.object({ seal: z.boolean(), inlet: z.boolean() }), assembly: z.object({ inlet: component, drain: component }),
  evidence: z.object({ water: evidence.optional(), supply: evidence.optional(), drain: evidence.optional(), inlet: evidence.optional(), overflow: evidence.optional() }),
  diagnosis: cases.nullable(), diagnosisTries: count, firstDiagnosis: cases.nullable(),
  process: z.object({ isolated: z.boolean(), confirmed: z.boolean(), drained: z.boolean(), repaired: z.boolean(), assembled: z.boolean() }),
  logs: z.array(z.object({ step: count, text: z.string(), kind: z.enum(['info', 'success', 'error', 'safety']) })),
  safetyErrors: z.array(z.object({ code: z.string(), text: z.string(), step: count })),
  retest: z.object({ phase: z.enum(['idle', 'filling', 'holding', 'draining', 'refilling', 'passed', 'failed']), elapsed: z.number().nonnegative(), checks: z.object({ assembly: z.boolean(), supply: z.boolean(), stable: z.boolean(), cycle: z.boolean() }), message: z.string() }),
  feedback: z.string(), elapsed: z.number().nonnegative(), step: count
});
const storeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION), nickname: z.string().max(24),
  sessions: z.object({ explore: attemptSchema.optional(), guided: attemptSchema.optional(), assessment: attemptSchema.optional() }),
  records: z.array(attemptSchema)
}).superRefine((s, ctx) => {
  if (s.records.some(a => a.status !== 'completed' || a.mode === 'explore' || a.endedAt === null)) ctx.addIssue({ code: 'custom', message: '记录状态不一致' });
  if (Object.entries(s.sessions).some(([mode, a]) => a && (a.status !== 'active' || a.mode !== mode))) ctx.addIssue({ code: 'custom', message: '会话模式不一致' });
  if (new Set(s.records.map(a => a.id)).size !== s.records.length) ctx.addIssue({ code: 'custom', message: '记录编号重复' });
});
export interface LocalStore { schemaVersion: 1; nickname: string; sessions: Partial<Record<Mode, Attempt>>; records: Attempt[] }
export type StorageStatus = 'ok' | 'corrupt' | 'incompatible' | 'unavailable';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function emptyStore(): LocalStore { return { schemaVersion: 1, nickname: '', sessions: {}, records: [] }; }
export function parseStore(raw: string | null): { data: LocalStore; status: StorageStatus } {
  if (!raw) return { data: emptyStore(), status: 'ok' };
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === 'object' && 'schemaVersion' in json && json.schemaVersion !== SCHEMA_VERSION) return { data: emptyStore(), status: 'incompatible' };
    const result = storeSchema.safeParse(json);
    return result.success ? { data: result.data, status: 'ok' } : { data: emptyStore(), status: 'corrupt' };
  } catch { return { data: emptyStore(), status: 'corrupt' }; }
}
export function loadStore(storage: StoragePort) {
  try { return parseStore(storage.getItem(STORAGE_KEY)); }
  catch { return { data: emptyStore(), status: 'unavailable' as const }; }
}
export function saveStore(storage: StoragePort, data: LocalStore): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function clearStore(storage: StoragePort): boolean {
  try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}
export function archiveAttempt(data: LocalStore, a: Attempt): LocalStore {
  if (a.mode === 'explore' || a.status !== 'completed' || data.records.some(r => r.id === a.id)) return data;
  const sessions = { ...data.sessions };
  if (sessions[a.mode]?.id === a.id) delete sessions[a.mode];
  return { ...data, sessions, records: [a, ...data.records] };
}
