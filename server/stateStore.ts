import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface PersistedPlatformState {
  version: number;
  updatedAt: string;
  role?: 'borrower' | 'provider' | 'epc';
  jurisdiction?: string;
  activeProjectId?: string;
  workspaceProjectIds?: string[];
  projects?: Record<string, unknown>;
  capitalProviders?: unknown[];
  epcContractors?: unknown[];
  engagements?: Record<string, unknown>;
  mandate?: unknown;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'platform-state.json');

export function computeDocumentAuditHash(record: {
  referenceCode?: string;
  docKind?: string;
  signatory?: string;
  counterpartyRep?: string;
  executedAt?: string;
}): string {
  const payload = [
    record.referenceCode || '',
    record.docKind || '',
    record.signatory || '',
    record.counterpartyRep || '',
    record.executedAt || '',
  ].join('|');
  return 'sha256:' + crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export async function loadPlatformState(): Promise<PersistedPlatformState | null> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as PersistedPlatformState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePlatformState(
  incoming: Partial<PersistedPlatformState>
): Promise<PersistedPlatformState> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = (await loadPlatformState()) || {
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  // Auto-stamp SHA-256 verification digest onto any executed Deal Room documents
  const mergedEngagements =
    incoming.engagements !== undefined ? incoming.engagements : existing.engagements;

  if (mergedEngagements && typeof mergedEngagements === 'object') {
    for (const engVal of Object.values(mergedEngagements)) {
      if (engVal && typeof engVal === 'object' && 'executedDocs' in engVal) {
        const docs = (engVal as { executedDocs?: Record<string, Record<string, unknown>> })
          .executedDocs;
        if (docs && typeof docs === 'object') {
          for (const docRec of Object.values(docs)) {
            if (docRec && typeof docRec === 'object' && !docRec.auditHash) {
              docRec.auditHash = computeDocumentAuditHash({
                referenceCode: String(docRec.referenceCode || ''),
                docKind: String(docRec.docKind || ''),
                signatory: String(docRec.signatory || ''),
                counterpartyRep: String(docRec.counterpartyRep || ''),
                executedAt: String(docRec.executedAt || ''),
              });
            }
          }
        }
      }
    }
  }

  const nextState: PersistedPlatformState = {
    ...existing,
    ...incoming,
    engagements: mergedEngagements,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const tmpFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(nextState, null, 2), 'utf8');
  await fs.rename(tmpFile, STATE_FILE);
  return nextState;
}
