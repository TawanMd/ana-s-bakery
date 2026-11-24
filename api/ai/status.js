import { requireAuth, jsonResponse } from '../../lib/api-helpers.js';
import {
  readAiReportBlob,
  writeAiReportBlob,
  readGestaoStateBlob,
  writeGestaoStateBlob,
  DEFAULT_AI_SETTINGS,
} from '../../lib/blob-store.js';
import { isGeminiConfigured, COPILOT_MODELS, FAST_BATCH_MODELS } from '../../lib/gemini-client.js';
import { MARKET_STORES } from '../../lib/market-prices.js';

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const report = await readAiReportBlob();
    return jsonResponse({
      configured: isGeminiConfigured(),
      models: COPILOT_MODELS,
      copilotModels: COPILOT_MODELS,
      fastModels: FAST_BATCH_MODELS,
      stores: MARKET_STORES.map((s) => ({ id: s.id, name: s.name, region: s.region, specialty: s.specialty })),
      schedule: {
        name: 'daily-price-sync',
        cron: '0 7 * * 1,4',
        timezone: 'America/Sao_Paulo',
        humanLabel: 'Segundas e Quintas às 07:00 (Brasília)',
      },
      settings: report.settings,
      lastSync: report.lastSync,
      lastBriefing: report.lastBriefing,
      history: report.history,
      hasRollback: Boolean(report.previousStateSnapshot),
      rollbackSavedAt: report.previousStateSnapshot?.savedAt || null,
      updatedAt: report.updatedAt,
    });
  } catch (err) {
    console.error('[api/ai/status] Erro no GET:', err);
    return jsonResponse({ error: 'Falha ao carregar status da IA.' }, 500);
  }
}

export async function PUT(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const report = await readAiReportBlob();

    // Ação de desfazer (rollback) do último sync aplicado pela IA
    if (body?.action === 'rollback') {
      const snap = report.previousStateSnapshot;
      if (!snap || !Array.isArray(snap.ingredients)) {
        return jsonResponse({ error: 'Não há snapshot anterior disponível para desfazer.' }, 400);
      }

      const cloud = await readGestaoStateBlob();
      const baseState = body.state || cloud.data;
      if (!baseState || !Array.isArray(baseState.ingredients) || !Array.isArray(baseState.recipes)) {
        return jsonResponse({ error: 'Estado atual indisponível para rollback.' }, 400);
      }

      const restoredState = {
        ...baseState,
        ingredients: snap.ingredients,
        recipes: baseState.recipes.map((rec) => {
          const prevPrice = (snap.recipePrices || []).find((p) => p.id === rec.id);
          return prevPrice ? { ...rec, precoVendaDireta: prevPrice.precoVendaDireta } : rec;
        }),
      };

      const stateUpdatedAt = await writeGestaoStateBlob(restoredState);
      const nextReport = await writeAiReportBlob({
        ...report,
        previousStateSnapshot: null,
      });

      return jsonResponse({
        ok: true,
        restoredState,
        stateUpdatedAt,
        hasRollback: false,
        updatedAt: nextReport.updatedAt,
      });
    }

    // Atualização das configurações de automação da IA
    const incoming = body?.settings || {};
    const nextSettings = {
      ...DEFAULT_AI_SETTINGS,
      ...report.settings,
      autoApplyPrices: incoming.autoApplyPrices !== undefined ? Boolean(incoming.autoApplyPrices) : report.settings.autoApplyPrices,
      autoProtectMargins: incoming.autoProtectMargins !== undefined ? Boolean(incoming.autoProtectMargins) : report.settings.autoProtectMargins,
      includeEquipmentsCheck: incoming.includeEquipmentsCheck !== undefined ? Boolean(incoming.includeEquipmentsCheck) : report.settings.includeEquipmentsCheck,
      maxAutoChangePct: incoming.maxAutoChangePct !== undefined
        ? Math.max(10, Math.min(200, Number(incoming.maxAutoChangePct) || 55))
        : report.settings.maxAutoChangePct,
    };

    const saved = await writeAiReportBlob({
      ...report,
      settings: nextSettings,
    });

    return jsonResponse({
      ok: true,
      settings: saved.settings,
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    console.error('[api/ai/status] Erro no PUT:', err);
    return jsonResponse({ error: 'Falha ao atualizar configurações da IA.' }, 500);
  }
}
