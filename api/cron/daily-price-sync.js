import { handleSchedule } from '@vercel/schedules';
import { runDailyPriceSync } from '../../lib/price-sync-service.js';
import { isGeminiConfigured } from '../../lib/gemini-client.js';

export const maxDuration = 300;

/**
 * Função privada agendada via Vercel Schedules (Segundas e Quintas às 07:00 BRT).
 * Pesquisa preços de insumos nos mercados de SC & Confeitaria, audita com Gemini AI,
 * atualiza preços unitários, investimentos, ROIs e gera o Briefing Executivo.
 */
export const POST = handleSchedule(async (metadata) => {
  console.log(
    `[daily-price-sync] Iniciando execução ${metadata.executionId} (${metadata.name}) agendada para ${metadata.scheduledAt.toISOString()}`,
  );

  if (!isGeminiConfigured()) {
    console.error('[daily-price-sync] GEMINI_API_KEY ausente. Execução abortada.');
    return;
  }

  try {
    const result = await runDailyPriceSync({
      trigger: 'schedule',
      executionId: metadata.executionId,
      mode: 'apply',
    });

    if (result.skipped) {
      console.log(`[daily-price-sync] Execução ${metadata.executionId} ignorada: ${result.reason}`);
      return;
    }

    console.log(
      `[daily-price-sync] Concluído em ${result.sync.durationMs}ms | modelo=${result.sync.modelUsed} | atualizados=${result.sync.updatedCount}/${result.sync.totalScanned} | ROI ciclo: ${result.sync.beforeMetrics.roiCicloComprasPct}% -> ${result.sync.afterMetrics.roiCicloComprasPct}%`,
    );
  } catch (err) {
    console.error('[daily-price-sync] Erro na execução agendada:', err);
    throw err;
  }
});
