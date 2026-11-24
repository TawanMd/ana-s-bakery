import { requireAuth, jsonResponse } from '../../lib/api-helpers.js';
import { isGeminiConfigured, generateTextResponse } from '../../lib/gemini-client.js';
import { calculateFinancialSnapshot } from '../../lib/finance-engine.js';
import { readAiReportBlob } from '../../lib/blob-store.js';

export const maxDuration = 60;

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isGeminiConfigured()) {
    return jsonResponse({ error: 'GEMINI_API_KEY não configurada no servidor.' }, 503);
  }

  try {
    const body = await request.json();
    const message = String(body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const state = body?.state;

    if (!message) {
      return jsonResponse({ error: 'Digite uma pergunta para o Consultor IA.' }, 400);
    }
    if (!state || !Array.isArray(state.ingredients) || !Array.isArray(state.recipes)) {
      return jsonResponse({ error: 'Contexto financeiro inválido.' }, 400);
    }

    const snapshot = calculateFinancialSnapshot(state);
    const aiReport = await readAiReportBlob();

    const compactContext = {
      confeitaria: "Ana's Bakery (Florianópolis / SC)",
      dataHoje: new Date().toLocaleDateString('pt-BR'),
      configuracao: state.config,
      mixCanais: state.mix,
      resumoFinanceiro: {
        periodo: snapshot.periodo,
        cestaInsumosRS: snapshot.cestaBaseTotal,
        investimentoComprasFechadasRS: snapshot.investimentoCompraFechada,
        jaInvestidoRS: snapshot.totalJaInvestido,
        equipamentosFaltaComprarRS: snapshot.totalEquipamentosAComprar,
        totalFaltaComprarRS: snapshot.totalAComprarGeral,
        investimentoTotalInicialRS: snapshot.investimentoTotalInicial,
        receitaProjetadaRS: snapshot.receitaBrutaMix,
        taxasIfoodRS: snapshot.taxasAppMix,
        custoProducaoRS: snapshot.custoProducaoTotal,
        lucroLiquidoProjetadoRS: snapshot.lucroLiquidoMix,
        margemMediaDiretaPct: snapshot.margemMediaPct,
        roiCicloComprasPct: snapshot.roiCicloComprasPct,
        roiInvestimentoTotalCicloPct: snapshot.roiInvestimentoTotalCicloPct,
        roiAnualizadoPct: snapshot.roiAnualizadoPct,
        paybackCiclos: snapshot.paybackCiclos,
        lucroRealPedidosRS: snapshot.lucroRealPedidos,
        roiRealJaInvestidoPct: snapshot.roiRealJaInvestidoPct,
      },
      produtos: snapshot.products,
      insumosPrincipais: (state.ingredients || []).map((i) => ({
        nome: i.nome,
        preco: i.preco,
        qtd: `${i.quantidade}${i.unidade}`,
        lojaIA: i.aiMeta?.lastStore || null,
        deltaPct: i.aiMeta?.deltaPct ?? null,
      })),
      equipamentos: state.equipments || [],
      comboAtual: state.combo || null,
      ultimoSyncDiario: aiReport.lastSync
        ? {
            quando: aiReport.lastSync.syncedAt,
            atualizados: aiReport.lastSync.updatedCount,
            roiAntes: aiReport.lastSync.beforeMetrics?.roiCicloComprasPct,
            roiDepois: aiReport.lastSync.afterMetrics?.roiCicloComprasPct,
          }
        : null,
    };

    const systemInstruction = [
      'Você é a Ana\'s CFO, consultora financeira e estrategista de confeitaria artesanal da Ana\'s Bakery em Florianópolis/SC.',
      'Responda sempre em português do Brasil, de forma prática, calorosa, direta e embasada EXCLUSIVAMENTE nos dados reais do painel abaixo.',
      'Use negrito, listas curtas e números exatos em R$ e % (formato brasileiro com vírgula).',
      'Sempre conecte suas recomendações a lucro líquido, margem, capital de giro, ROI e payback.',
      'Quando fizer sentido, sugira ajustes concretos em preços diretos, iFood, fornadas planejadas, combos ou mercados de Florianópolis.',
      '',
      'DADOS ATUAIS DO PAINEL:',
      JSON.stringify(compactContext),
    ].join('\n');

    const transcript = history
      .map((m) => `${m.role === 'user' ? 'Equipe Ana' : 'Consultora IA'}: ${String(m.text || '').slice(0, 800)}`)
      .join('\n');

    const prompt = transcript
      ? `Histórico recente da conversa:\n${transcript}\n\nNova pergunta da Equipe Ana:\n${message}`
      : message;

    const res = await generateTextResponse({
      prompt,
      systemInstruction,
      temperature: 0.45,
    });

    return jsonResponse({
      ok: true,
      reply: res.text,
      model: res.model,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/ai/assistant] Erro no chat IA:', err);
    return jsonResponse({ error: err?.message || 'Falha ao consultar a IA.' }, 500);
  }
}
