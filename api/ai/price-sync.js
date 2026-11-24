import { requireAuth, jsonResponse } from '../../lib/api-helpers.js';
import { isGeminiConfigured } from '../../lib/gemini-client.js';
import { runDailyPriceSync } from '../../lib/price-sync-service.js';

export const maxDuration = 120;

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isGeminiConfigured()) {
    return jsonResponse({ error: 'GEMINI_API_KEY não configurada no servidor.' }, 503);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === 'preview' ? 'preview' : 'apply';
    const stateOverride = body?.state && Array.isArray(body.state.ingredients) && Array.isArray(body.state.recipes)
      ? body.state
      : null;
    const ingredientIds = Array.isArray(body?.ingredientIds) && body.ingredientIds.length
      ? body.ingredientIds
      : null;
    const includeEquipments = body?.includeEquipments !== undefined ? Boolean(body.includeEquipments) : null;

    const result = await runDailyPriceSync({
      trigger: 'manual',
      mode,
      stateOverride,
      ingredientIds,
      includeEquipments,
    });

    return jsonResponse({
      ok: true,
      applied: result.applied,
      stateUpdatedAt: result.stateUpdatedAt,
      updatedState: result.updatedState,
      sync: result.sync,
      briefing: result.briefing,
      report: result.report,
    });
  } catch (err) {
    console.error('[api/ai/price-sync] Erro ao sincronizar preços:', err);
    return jsonResponse(
      { error: err?.message || 'Falha ao pesquisar preços e recalcular ROIs com IA.' },
      500,
    );
  }
}
