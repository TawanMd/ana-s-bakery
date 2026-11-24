import { get, put } from '@vercel/blob';

export const STATE_BLOB_PATH = 'gestao/state.json';
export const AI_REPORT_BLOB_PATH = 'gestao/ai-report.json';

export const DEFAULT_AI_SETTINGS = {
  autoApplyPrices: true,
  autoProtectMargins: true,
  includeEquipmentsCheck: false,
  maxAutoChangePct: 55,
  region: 'Florianópolis / SC',
};

export function normalizeAiReport(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    settings: { ...DEFAULT_AI_SETTINGS, ...(base.settings || {}) },
    lastExecutionId: base.lastExecutionId || null,
    lastSync: base.lastSync || null,
    lastBriefing: base.lastBriefing || null,
    history: Array.isArray(base.history) ? base.history.slice(-90) : [],
    previousStateSnapshot: base.previousStateSnapshot || null,
    updatedAt: base.updatedAt || null,
  };
}

export async function readGestaoStateBlob() {
  try {
    const result = await get(STATE_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { exists: false, data: null, updatedAt: null };
    }
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return {
      exists: true,
      data: parsed.data || null,
      updatedAt: parsed.updatedAt || null,
    };
  } catch (err) {
    console.error('[blob-store] Erro ao ler gestao/state.json:', err);
    return { exists: false, data: null, updatedAt: null };
  }
}

export async function writeGestaoStateBlob(data) {
  const updatedAt = new Date().toISOString();
  await put(
    STATE_BLOB_PATH,
    JSON.stringify({ data, updatedAt }),
    {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    },
  );
  return updatedAt;
}

export async function readAiReportBlob() {
  try {
    const result = await get(AI_REPORT_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return normalizeAiReport(null);
    }
    const text = await new Response(result.stream).text();
    return normalizeAiReport(JSON.parse(text));
  } catch (err) {
    console.error('[blob-store] Erro ao ler gestao/ai-report.json:', err);
    return normalizeAiReport(null);
  }
}

export async function writeAiReportBlob(report) {
  const normalized = normalizeAiReport(report);
  normalized.updatedAt = new Date().toISOString();
  await put(
    AI_REPORT_BLOB_PATH,
    JSON.stringify(normalized),
    {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    },
  );
  return normalized;
}
