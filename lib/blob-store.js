import { get, put } from '@vercel/blob';

export const STATE_BLOB_PATH = 'gestao/state.json';
export const AI_REPORT_BLOB_PATH = 'gestao/ai-report.json';

export const DEFAULT_LOCAL_STORE_IDS = [
  'fort-campeche',
  'bistek-costeira',
  'hiperselect',
  'hippo-centro',
  'angeloni-centro',
  'fort-jardim-atlantico',
  'angeloni-capoeiras',
  'bistek-abraao',
];

const VALID_LOCAL_STORE_SET = new Set(DEFAULT_LOCAL_STORE_IDS);

export const DEFAULT_AI_SETTINGS = {
  autoApplyPrices: true,
  autoProtectMargins: true,
  includeEquipmentsCheck: false,
  maxAutoChangePct: 55,
  preferFortRancho: true,
  fortTolerancePct: 8,
  enabledStoreIds: [...DEFAULT_LOCAL_STORE_IDS],
  region: 'Florianópolis / SC — Tapera (88049-332), Centro & Estreito',
};

export function normalizeAiSettings(rawSettings) {
  const incoming = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const merged = { ...DEFAULT_AI_SETTINGS, ...incoming };
  const filteredStores = Array.isArray(incoming.enabledStoreIds)
    ? incoming.enabledStoreIds.filter((id) => VALID_LOCAL_STORE_SET.has(id))
    : [];
  merged.enabledStoreIds = filteredStores.length > 0 ? filteredStores : [...DEFAULT_LOCAL_STORE_IDS];
  merged.preferFortRancho = incoming.preferFortRancho !== undefined ? Boolean(incoming.preferFortRancho) : true;
  const tol = Number(incoming.fortTolerancePct);
  merged.fortTolerancePct = Number.isFinite(tol) ? Math.max(0, Math.min(30, tol)) : 8;
  merged.region = DEFAULT_AI_SETTINGS.region;
  return merged;
}

export function normalizeAiReport(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    settings: normalizeAiSettings(base.settings),
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
