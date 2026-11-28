/**
 * Ana's Bakery — Orquestrador Diário de Pesquisa de Preços, ROI & Briefing IA
 * Usado tanto pelo Vercel Schedule diário (07h BRT) quanto pelo botão manual no painel.
 */

import {
  DEFAULT_CONFIG,
  DEFAULT_INGREDIENTS,
  DEFAULT_EQUIPMENTS,
  DEFAULT_ALREADY_SPENT,
  clone,
  round2,
  ceilToHalfReal,
  calculateRecipeCost,
  calculateChannelPricing,
  calculateFinancialSnapshot,
} from './finance-engine.js';
import {
  readGestaoStateBlob,
  writeGestaoStateBlob,
  readAiReportBlob,
  writeAiReportBlob,
} from './blob-store.js';
import { generateStructuredJson } from './gemini-client.js';
import {
  MARKET_STORES,
  fetchLiveMarketOffersForIngredients,
  fetchLiveMarketOffersForEquipments,
} from './market-prices.js';

const PRICE_MATCH_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ingredientId: { type: 'string' },
          matched: { type: 'boolean', description: 'true se encontrou oferta legítima compatível; false se todas as ofertas forem irrelevantes ou outro produto' },
          selectedOfferIndex: { type: 'integer', description: 'Índice 0-based da melhor oferta em candidates, ou -1 se nenhuma servir' },
          foundPackQty: { type: 'number', description: 'Peso/volume/unidades reais da embalagem do produto escolhido na mesma unidade do insumo (ex: 395, 1000, 20)' },
          foundPackPrice: { type: 'number', description: 'Preço real da embalagem anunciada na oferta escolhida em R$' },
          normalizedPrice: { type: 'number', description: 'Preço proporcional calculado exatamente para a quantidade cadastrada do insumo (quantidadeCadastrada / foundPackQty * foundPackPrice)' },
          confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          reason: { type: 'string', description: 'Explicação curta em PT-BR (máx 120 chars) citando marca/embalagem e por que foi escolhida ou descartada' },
        },
        required: [
          'ingredientId',
          'matched',
          'selectedOfferIndex',
          'foundPackQty',
          'foundPackPrice',
          'normalizedPrice',
          'confidence',
          'reason',
        ],
      },
    },
  },
  required: ['items'],
};

const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    healthScore: { type: 'integer', description: 'Nota de 0 a 100 da saúde financeira e rentabilidade da confeitaria' },
    headline: { type: 'string', description: 'Manchete executiva curta e direta (máx 110 chars)' },
    inflationSummary: { type: 'string', description: 'Resumo em 2 frases sobre a variação de preços de insumos e o impacto no ROI e investimento' },
    topActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          detalhe: { type: 'string' },
          impactoEstimado: { type: 'string' },
          prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
        required: ['titulo', 'detalhe', 'impactoEstimado', 'prioridade'],
      },
    },
    opportunityOfTheDay: { type: 'string', description: 'Qual produto ou combo priorizar hoje pelo maior ROI e margem' },
    buyingTip: { type: 'string', description: 'Dica prática de compras sem carro entre Fort Atacadista Campeche (rancho Tapera), Centro (Ed. Constância Nandi) e Estreito (Rua Liberato Bittencourt)' },
  },
  required: ['healthScore', 'headline', 'inflationSummary', 'topActions', 'opportunityOfTheDay', 'buyingTip'],
};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function evaluateBatchWithGemini(batchRows, { preferFortRancho = true, fortTolerancePct = 8 } = {}) {
  const payload = batchRows.map((row) => ({
    ingredientId: row.ingredientId,
    nome: row.nome,
    categoria: row.categoria,
    quantidadeCadastrada: row.quantidade,
    unidade: row.unidade,
    precoAtualRS: row.precoAtual,
    referenciaObs: row.obs,
    candidates: row.candidates.map((c, idx) => ({
      idx,
      store: c.store,
      hubLabel: c.hubLabel,
      isPreferredFort: Boolean(c.isPreferred),
      title: c.title,
      brand: c.brand,
      price: c.price,
    })),
  }));

  const fortRule = preferFortRancho
    ? `3. PREFERÊNCIA DE ROTA (SEM CARRO — RANCHO NO FORT ATACADISTA): Se o Fort Atacadista Campeche (preferência #1) ou Fort Jardim Atlântico tiver produto legítimo equivalente com preço normalizado até ${fortTolerancePct}% acima do menor preço de outro mercado, ESCOLHA O FORT ATACADISTA para concentrar o rancho em uma única ida! Só escolha um mercado do Centro (Hiper Select, Hippo, Angeloni Centro) ou Estreito (Angeloni Capoeiras, Bistek Abraão) ou Bistek Costeira se o Fort não tiver oferta legítima compatível OU se a economia lá for maior que ${fortTolerancePct}% (compensando trazer na mochila na volta do trabalho).`
    : '3. PREFERÊNCIA DE MERCADO: Compare todos os mercados próximos (Tapera/Campeche, Centro e Estreito) e escolha o menor preço normalizado legítimo entre eles.';

  const systemInstruction = [
    'Você é o auditor de compras e precificação da Ana\'s Bakery, confeitaria artesanal em Florianópolis/SC.',
    'CONTEXTO GEOGRÁFICO REAL DO CASAL (SEM CARRO): Moram na Tapera (CEP 88049-332, onde os mais próximos são Fort Atacadista Campeche, Bistek Costeira e Hiper Select Rio Tavares); ele trabalha no Centro (Ed. Constância Nandi, Rua Trajano 265, perto de Hiper Select Centro, Hippo Centro e Angeloni Centro); ela trabalha na Rua Gen. Liberato Bittencourt no Estreito (perto de Fort Jardim Atlântico, Angeloni Capoeiras e Bistek Abraão).',
    'Sua tarefa é analisar ofertas reais coletadas hoje apenas nesses mercados acessíveis e escolher a melhor oferta legítima para cada insumo.',
    'REGRAS CRÍTICAS DE QUALIDADE:',
    '1. REJEITE itens errados: nunca escolha guardanapo, bala, pó para pudim, café Melitta no lugar de mel, sal refinado no lugar de açúcar, bandeja descartável no lugar de ovos, achocolatado com açúcar (Nescau/Toddy) no lugar de chocolate 50%/100%, produto zero açúcar/diet/sem lactose caro, ou cobertura fracionada no lugar de chocolate nobre (e vice-versa).',
    '2. Se nenhum candidato for compatível e legítimo, marque matched=false, selectedOfferIndex=-1, confidence="baixa", normalizedPrice=precoAtualRS.',
    fortRule,
    '4. NORMALIZAÇÃO EXATA: se a embalagem encontrada tiver peso/quantidade diferente (ex: pacote 1kg = 1000g quando o cadastrado é 500g, ou bandeja 30 un quando o cadastrado é 20 un, ou pacote 8g quando o cadastrado é 20g, ou Nutella 375g quando cadastrado é 650g), informe foundPackQty na MESMA unidade do insumo e calcule normalizedPrice = round((quantidadeCadastrada / foundPackQty) * foundPackPrice, 2).',
    '5. Quando comparar produtos equivalentes dentro do mesmo mercado preferido, escolha o de menor preço normalizado mantendo qualidade de confeitaria.',
  ].join('\n');

  const prompt = `Analise os insumos abaixo e suas ofertas reais coletadas hoje (${new Date().toLocaleDateString('pt-BR')}) nos mercados próximos:\n${JSON.stringify(payload)}`;

  const res = await generateStructuredJson({
    prompt,
    systemInstruction,
    schema: PRICE_MATCH_SCHEMA,
    temperature: 0.1,
    tier: 'fast',
  });

  return {
    model: res.model,
    items: Array.isArray(res.json?.items) ? res.json.items : [],
  };
}

export async function generateExecutiveBriefing(state, snapshot, syncSummary = null) {
  const topProducts = [...snapshot.products]
    .sort((a, b) => b.roiUnitarioPct - a.roiUnitarioPct)
    .map((p) => ({
      nome: p.nome,
      custo: p.custoUnitario,
      precoDireto: p.precoDireto,
      margemPct: p.margemDiretaPct,
      roiUnitPct: p.roiUnitarioPct,
      fornadas: p.fornadas,
      status: p.status,
    }));

  const contextPayload = {
    data: new Date().toLocaleDateString('pt-BR'),
    periodo: snapshot.periodo,
    metricas: {
      cestaBaseRS: snapshot.cestaBaseTotal,
      investimentoComprasRS: snapshot.investimentoCompraFechada,
      investimentoTotalGeralRS: snapshot.investimentoTotalInicial,
      jaInvestidoRS: snapshot.totalJaInvestido,
      faltaComprarRS: snapshot.totalAComprarGeral,
      receitaProjetadaRS: snapshot.receitaBrutaMix,
      lucroProjetadoRS: snapshot.lucroLiquidoMix,
      margemMediaPct: snapshot.margemMediaPct,
      roiCicloComprasPct: snapshot.roiCicloComprasPct,
      roiInvestimentoTotalCicloPct: snapshot.roiInvestimentoTotalCicloPct,
      roiAnualizadoPct: snapshot.roiAnualizadoPct,
      paybackCiclos: snapshot.paybackCiclos,
      alertasMargem: snapshot.lowMarginCount,
      lucroRealPedidosRS: snapshot.lucroRealPedidos,
      roiRealJaInvestidoPct: snapshot.roiRealJaInvestidoPct,
    },
    produtos: topProducts,
    variacaoSyncHoje: syncSummary
      ? {
          insumosAtualizados: syncSummary.updatedCount,
          economiaOuAltaCestaRS: round2(syncSummary.afterCesta - syncSummary.beforeCesta),
          deltaRoiCicloPct: round2(syncSummary.afterRoi - syncSummary.beforeRoi),
          maioresAltas: syncSummary.biggestIncreases,
          maioresQuedas: syncSummary.biggestDrops,
          produtosReajustados: syncSummary.priceAdjustmentsCount,
        }
      : null,
  };

  const systemInstruction = [
    'Você é a Diretora Financeira (CFO) com IA da Ana\'s Bakery, confeitaria artesanal em Florianópolis/SC.',
    'O casal mora na Tapera (CEP 88049-332) sem carro, faz o rancho principal no Fort Atacadista Campeche (SC-405), e trabalha no Centro (Ed. Constância Nandi / Rua Trajano) e no Estreito (Rua Gen. Liberato Bittencourt).',
    'Fale em português do Brasil, de forma objetiva, calorosa, prática e orientada a lucro, economia de deslocamento e ROI real.',
    'Sempre cite números exatos em R$ e % extraídos do JSON fornecido. Nunca invente valores.',
    'Traga exatamente 3 ações concretas em topActions ordenadas da maior para a menor prioridade.',
  ].join('\n');

  const prompt = `Gere o Briefing Executivo Diário com base nos números atualizados da confeitaria:\n${JSON.stringify(contextPayload)}`;

  const res = await generateStructuredJson({
    prompt,
    systemInstruction,
    schema: BRIEFING_SCHEMA,
    temperature: 0.35,
  });

  return {
    generatedAt: new Date().toISOString(),
    model: res.model,
    ...res.json,
  };
}

function buildShoppingRouteByStore(snapshot) {
  const storeMetaByName = new Map(MARKET_STORES.map((s) => [s.name, s]));
  const byStore = new Map();
  for (const item of snapshot.shoppingList || []) {
    const storeName = item.bestStore || 'Embalagens / Fornecedor Manual';
    const meta = storeMetaByName.get(storeName);
    if (!byStore.has(storeName)) {
      byStore.set(storeName, {
        store: storeName,
        storeId: item.storeId || meta?.id || null,
        hubLabel: item.storeHubLabel || meta?.hubLabel || (item.bestStore ? '📍 Mercado local' : '📦 Compra manual / online'),
        address: meta?.address || '',
        isPreferred: Boolean(item.isPreferredStore ?? meta?.isPreferred),
        priority: meta?.priority ?? 99,
        totalRS: 0,
        itemsCount: 0,
        items: [],
      });
    }
    const bucket = byStore.get(storeName);
    bucket.totalRS = round2(bucket.totalRS + item.custoCompra);
    bucket.itemsCount += 1;
    bucket.items.push({
      id: item.id,
      nome: item.nome,
      packs: item.packs,
      custoCompra: item.custoCompra,
      productUrl: item.productUrl,
    });
  }
  return [...byStore.values()].sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.totalRS - a.totalRS;
  });
}

/**
 * Executa a pesquisa de preços nos mercados próximos (Tapera CEP 88049-332, Centro & Estreito) + auditoria IA + atualização de ROIs.
 */
export async function runDailyPriceSync({
  trigger = 'manual',
  executionId = null,
  mode = 'apply', // 'apply' | 'preview'
  stateOverride = null,
  ingredientIds = null,
  includeEquipments = null,
} = {}) {
  const startedAt = Date.now();
  const report = await readAiReportBlob();

  // Idempotência para Vercel Schedules (evita rodar duas vezes no mesmo executionId)
  if (executionId && report.lastExecutionId === executionId && report.lastSync) {
    return {
      skipped: true,
      reason: 'executionId já processado',
      sync: report.lastSync,
      report,
    };
  }

  // Carrega estado atual (do payload do usuário se enviado, senão do Vercel Blob)
  let baseState = stateOverride;
  if (!baseState) {
    const cloud = await readGestaoStateBlob();
    baseState = cloud.exists && cloud.data ? cloud.data : null;
  }

  if (!baseState || !Array.isArray(baseState.ingredients) || !Array.isArray(baseState.recipes)) {
    throw new Error('Estado da gestão ainda não inicializado na nuvem. Abra o painel /gestao uma vez para sincronizar os dados iniciais.');
  }

  const workingState = clone(baseState);
  workingState.config = { ...DEFAULT_CONFIG, ...(workingState.config || {}) };

  const settings = report.settings;
  const shouldApply = mode === 'apply' && (trigger === 'manual' || settings.autoApplyPrices !== false);
  const shouldProtectMargins = Boolean(settings.autoProtectMargins);
  const maxAutoChangePct = Number(settings.maxAutoChangePct || 55);
  const preferFortRancho = settings.preferFortRancho !== false;
  const fortTolerancePct = Number(settings.fortTolerancePct ?? 8);
  const enabledStoreIds = Array.isArray(settings.enabledStoreIds) && settings.enabledStoreIds.length
    ? settings.enabledStoreIds
    : null;
  const checkEquipments = includeEquipments !== null ? Boolean(includeEquipments) : Boolean(settings.includeEquipmentsCheck);

  // Snapshot ANTES da atualização
  const beforeSnapshot = calculateFinancialSnapshot(workingState);

  // Filtra insumos alvo (todos por padrão, ou subconjunto específico)
  const targetIngredients = Array.isArray(ingredientIds) && ingredientIds.length
    ? workingState.ingredients.filter((i) => ingredientIds.includes(i.id))
    : workingState.ingredients;

  // 1. Coleta ofertas ao vivo em paralelo apenas nos mercados acessíveis (Tapera 88049-332, Centro & Estreito)
  const rawOfferRows = await fetchLiveMarketOffersForIngredients(targetIngredients, { enabledStoreIds });
  const rawRowMap = new Map(rawOfferRows.map((r) => [r.ingredientId, r]));

  // 2. Envia apenas insumos com candidatos reais em lotes compactos (até 14 insumos/lote) para o Gemini auditar & normalizar
  const rowsToEvaluate = rawOfferRows.filter((r) => !r.skipSupermarket && Array.isArray(r.candidates) && r.candidates.length > 0);
  const batches = chunkArray(rowsToEvaluate, 14);
  const aiDecisions = new Map();
  let modelUsed = null;

  for (const batch of batches) {
    const { model, items } = await evaluateBatchWithGemini(batch, { preferFortRancho, fortTolerancePct });
    if (!modelUsed) modelUsed = model;
    for (const item of items) {
      if (item && item.ingredientId) {
        aiDecisions.set(item.ingredientId, item);
      }
    }
  }

  // Guarda snapshot para 1-click Rollback antes de mutar workingState
  const rollbackSnapshot = {
    savedAt: new Date().toISOString(),
    ingredients: clone(workingState.ingredients),
    recipePrices: workingState.recipes
      .filter((r) => r.tipo === 'produto')
      .map((r) => ({ id: r.id, precoVendaDireta: r.precoVendaDireta })),
  };

  // 3. Processa decisões da IA com validação matemática e guardrails
  const ingredientUpdates = [];
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const ing of targetIngredients) {
    const rawRow = rawRowMap.get(ing.id);
    const decision = aiDecisions.get(ing.id);
    const oldPrice = round2(ing.preco);
    const candidates = rawRow?.candidates || [];

    const offerIdx = Number.isInteger(decision?.selectedOfferIndex) ? decision.selectedOfferIndex : -1;
    const chosenOffer = offerIdx >= 0 && offerIdx < candidates.length ? candidates[offerIdx] : null;

    let newPrice = oldPrice;
    let deltaPct = 0;
    let applied = false;
    let skippedReason = null;
    let confidence = decision?.confidence || 'baixa';

    if (rawRow?.skipSupermarket) {
      confidence = 'alta';
      skippedReason = rawRow.skipReason || 'Item artesanal/personalizado — mantido preço manual cadastrado.';
    } else if (decision?.matched && chosenOffer && chosenOffer.price > 0) {
      // Verificação matemática determinística para impedir erro aritmético de LLM
      const foundQty = Number(decision.foundPackQty || 0);
      const foundPrice = Number(chosenOffer.price);
      if (foundQty > 0 && Number(ing.quantidade) > 0) {
        newPrice = round2((Number(ing.quantidade) / foundQty) * foundPrice);
      } else if (Number(decision.normalizedPrice) > 0) {
        newPrice = round2(decision.normalizedPrice);
      } else {
        newPrice = round2(foundPrice);
      }

      if (oldPrice > 0) {
        deltaPct = round2(((newPrice - oldPrice) / oldPrice) * 100);
      }

      const absDelta = Math.abs(deltaPct);
      const isTrusted = confidence === 'alta' || confidence === 'media';
      const withinGuardrail = oldPrice <= 0 || absDelta <= maxAutoChangePct;
      const eligibleForUpdate = isTrusted && withinGuardrail && newPrice > 0;

      if (eligibleForUpdate) {
        // Aplica em workingState tanto em 'apply' quanto em 'preview' (em preview, não grava no Blob)
        // para que afterMetrics mostre o impacto real projetado nos custos, investimentos e ROIs!
        ing.preco = newPrice;
        applied = shouldApply;
        if (Math.abs(newPrice - oldPrice) >= 0.01) updatedCount += 1;
      } else if (!isTrusted) {
        skippedReason = 'Confiança baixa — mantido preço atual para sua revisão.';
      } else if (!withinGuardrail) {
        skippedReason = `Variação de ${deltaPct > 0 ? '+' : ''}${deltaPct}% excedeu trava de segurança (${maxAutoChangePct}%) — revise e aplique manualmente se confirmar.`;
      }

      ing.aiMeta = {
        lastCheckedAt: nowIso,
        storeId: chosenOffer.storeId,
        lastStore: chosenOffer.store,
        storeHub: chosenOffer.hub,
        storeHubLabel: chosenOffer.hubLabel,
        storeAddress: chosenOffer.address,
        isPreferred: Boolean(chosenOffer.isPreferred),
        matchedProduct: chosenOffer.title,
        productUrl: chosenOffer.url,
        foundPackPrice: round2(chosenOffer.price),
        foundPackQty: foundQty || ing.quantidade,
        suggestedPrice: newPrice,
        previousPrice: oldPrice,
        deltaPct,
        confidence,
        applied,
      };
    } else {
      confidence = 'baixa';
      skippedReason = decision?.reason || 'Sem oferta compatível nos mercados próximos hoje — preço atual preservado.';
    }

    ingredientUpdates.push({
      ingredientId: ing.id,
      nome: ing.nome,
      categoria: ing.categoria,
      quantidade: ing.quantidade,
      unidade: ing.unidade,
      oldPrice,
      newPrice,
      deltaRS: round2(newPrice - oldPrice),
      deltaPct,
      matched: Boolean(!rawRow?.skipSupermarket && decision?.matched && chosenOffer),
      skipSupermarket: Boolean(rawRow?.skipSupermarket),
      applied,
      confidence,
      storeId: chosenOffer?.storeId || null,
      store: chosenOffer?.store || null,
      storeHub: chosenOffer?.hub || null,
      storeHubLabel: chosenOffer?.hubLabel || null,
      storeAddress: chosenOffer?.address || null,
      isPreferred: Boolean(chosenOffer?.isPreferred),
      matchedProduct: chosenOffer?.title || null,
      productUrl: chosenOffer?.url || null,
      foundPackPrice: chosenOffer ? round2(chosenOffer.price) : null,
      foundPackQty: Number(decision?.foundPackQty || 0) || null,
      reason: skippedReason || decision?.reason || '',
      topOffers: candidates.slice(0, 4).map((c) => ({
        storeId: c.storeId,
        store: c.store,
        hubLabel: c.hubLabel,
        isPreferred: Boolean(c.isPreferred),
        title: c.title,
        price: c.price,
        url: c.url,
      })),
    });
  }

  // 4. Proteção de Margem & Atualização de Preços Unitários dos Produtos Finais
  const priceAdjustments = [];
  const margemMin = Number(workingState.config.margemMinima || 35);

  for (const rec of workingState.recipes) {
    if (rec.tipo !== 'produto') continue;
    const oldDirect = round2(rec.precoVendaDireta);
    const calcAfter = calculateRecipeCost(rec.id, workingState);
    const pricingAfter = calculateChannelPricing(calcAfter.custoUnitario, oldDirect, workingState.config);

    if (pricingAfter.status !== 'saudavel') {
      const recommendedDirect = ceilToHalfReal(pricingAfter.precoMinimoRecomendado);
      const pricingProtected = calculateChannelPricing(calcAfter.custoUnitario, recommendedDirect, workingState.config);
      let appliedPrice = false;
      if (shouldProtectMargins && recommendedDirect > oldDirect) {
        rec.precoVendaDireta = recommendedDirect;
        appliedPrice = shouldApply;
      }
      priceAdjustments.push({
        recipeId: rec.id,
        nome: rec.nome,
        custoUnitario: round2(calcAfter.custoUnitario),
        oldDirect,
        recommendedDirect,
        newIfoodBasico: round2(pricingProtected.ifoodBasico.preco),
        newIfoodEntrega: round2(pricingProtected.ifoodEntrega.preco),
        oldMarginPct: round2(pricingAfter.margemDiretaPct),
        newMarginPct: round2(pricingProtected.margemDiretaPct),
        applied: appliedPrice,
      });
    }
  }

  // 5. Opcional: Pesquisa de equipamentos pendentes (investimentos fixos a comprar)
  let equipmentQuotes = [];
  if (checkEquipments && Array.isArray(workingState.equipments)) {
    const eqOffers = await fetchLiveMarketOffersForEquipments(workingState.equipments);
    equipmentQuotes = eqOffers
      .filter((e) => e.candidates.length > 0)
      .map((e) => ({
        equipmentId: e.equipmentId,
        nome: e.nome,
        valorAtual: round2(e.valorAtual),
        melhorOferta: e.candidates[0],
        alternativas: e.candidates.slice(1, 3),
      }));
  }

  // 6. Recalcula TODOS os ROIs, investimentos, break-even e roteiro de compras DEPOIS da atualização
  const afterSnapshot = calculateFinancialSnapshot(workingState);
  const shoppingRouteByStore = buildShoppingRouteByStore(afterSnapshot);

  const validChanges = ingredientUpdates.filter(
    (u) => u.matched && u.confidence !== 'baixa' && Math.abs(u.deltaPct) <= maxAutoChangePct && Math.abs(u.deltaRS) >= 0.05,
  );
  const biggestIncreases = [...validChanges]
    .filter((u) => u.deltaPct > 0)
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 3)
    .map((u) => `${u.nome} (+${u.deltaPct}%, R$${u.oldPrice}→R$${u.newPrice})`);
  const biggestDrops = [...validChanges]
    .filter((u) => u.deltaPct < 0)
    .sort((a, b) => a.deltaPct - b.deltaPct)
    .slice(0, 3)
    .map((u) => `${u.nome} (${u.deltaPct}%, R$${u.oldPrice}→R$${u.newPrice})`);

  // 7. Gera Briefing Executivo Diário da IA com os números reais antes/depois
  let executiveBriefing = report.lastBriefing;
  try {
    executiveBriefing = await generateExecutiveBriefing(workingState, afterSnapshot, {
      updatedCount,
      beforeCesta: beforeSnapshot.cestaBaseTotal,
      afterCesta: afterSnapshot.cestaBaseTotal,
      beforeRoi: beforeSnapshot.roiCicloComprasPct,
      afterRoi: afterSnapshot.roiCicloComprasPct,
      biggestIncreases,
      biggestDrops,
      priceAdjustmentsCount: priceAdjustments.length,
    });
  } catch (err) {
    console.error('[price-sync] Falha ao gerar briefing executivo (mantendo sync):', err);
  }

  const syncRecord = {
    id: `sync-${Date.now()}`,
    syncedAt: nowIso,
    trigger,
    mode,
    applied: shouldApply,
    executionId,
    modelUsed: modelUsed || 'gemini-3.5-flash-lite',
    durationMs: Date.now() - startedAt,
    totalScanned: targetIngredients.length,
    matchedCount: ingredientUpdates.filter((u) => u.matched).length,
    updatedCount,
    activeStoresCount: enabledStoreIds ? enabledStoreIds.length : MARKET_STORES.length,
    preferFortRancho,
    fortTolerancePct,
    beforeMetrics: {
      cestaBaseTotal: beforeSnapshot.cestaBaseTotal,
      investimentoCompraFechada: beforeSnapshot.investimentoCompraFechada,
      investimentoTotalInicial: beforeSnapshot.investimentoTotalInicial,
      totalAComprarGeral: beforeSnapshot.totalAComprarGeral,
      lucroLiquidoMix: beforeSnapshot.lucroLiquidoMix,
      margemMediaPct: beforeSnapshot.margemMediaPct,
      roiCicloComprasPct: beforeSnapshot.roiCicloComprasPct,
      roiInvestimentoTotalCicloPct: beforeSnapshot.roiInvestimentoTotalCicloPct,
      roiAnualizadoPct: beforeSnapshot.roiAnualizadoPct,
      paybackCiclos: beforeSnapshot.paybackCiclos,
    },
    afterMetrics: {
      cestaBaseTotal: afterSnapshot.cestaBaseTotal,
      investimentoCompraFechada: afterSnapshot.investimentoCompraFechada,
      investimentoTotalInicial: afterSnapshot.investimentoTotalInicial,
      totalAComprarGeral: afterSnapshot.totalAComprarGeral,
      lucroLiquidoMix: afterSnapshot.lucroLiquidoMix,
      margemMediaPct: afterSnapshot.margemMediaPct,
      roiCicloComprasPct: afterSnapshot.roiCicloComprasPct,
      roiInvestimentoTotalCicloPct: afterSnapshot.roiInvestimentoTotalCicloPct,
      roiAnualizadoPct: afterSnapshot.roiAnualizadoPct,
      paybackCiclos: afterSnapshot.paybackCiclos,
    },
    ingredientUpdates,
    priceAdjustments,
    equipmentQuotes,
    shoppingRouteByStore,
  };

  // 8. Persiste estado atualizado + histórico diário no Vercel Blob (quando mode === 'apply')
  let stateUpdatedAt = null;
  let savedReport = report;

  if (shouldApply) {
    stateUpdatedAt = await writeGestaoStateBlob(workingState);

    const dateKey = nowIso.slice(0, 10);
    const historyEntry = {
      date: dateKey,
      syncedAt: nowIso,
      cestaBaseTotal: afterSnapshot.cestaBaseTotal,
      investimentoCompraFechada: afterSnapshot.investimentoCompraFechada,
      investimentoTotalInicial: afterSnapshot.investimentoTotalInicial,
      lucroLiquidoMix: afterSnapshot.lucroLiquidoMix,
      margemMediaPct: afterSnapshot.margemMediaPct,
      roiCicloComprasPct: afterSnapshot.roiCicloComprasPct,
      roiInvestimentoTotalCicloPct: afterSnapshot.roiInvestimentoTotalCicloPct,
      paybackCiclos: afterSnapshot.paybackCiclos,
      updatedCount,
    };

    const nextHistory = [...(report.history || []).filter((h) => h.date !== dateKey), historyEntry].slice(-90);
    savedReport = await writeAiReportBlob({
      ...report,
      lastExecutionId: executionId || report.lastExecutionId,
      lastSync: syncRecord,
      lastBriefing: executiveBriefing,
      history: nextHistory,
      previousStateSnapshot: rollbackSnapshot,
    });
  } else {
    // Mesmo em preview, atualiza o briefing se não houver nenhum ainda
    savedReport = {
      ...report,
      lastBriefing: executiveBriefing,
    };
  }

  return {
    skipped: false,
    applied: shouldApply,
    stateUpdatedAt,
    updatedState: shouldApply ? workingState : null,
    sync: syncRecord,
    briefing: executiveBriefing,
    report: {
      settings: savedReport.settings,
      history: savedReport.history,
      hasRollback: Boolean(savedReport.previousStateSnapshot),
      lastSync: savedReport.lastSync,
      lastBriefing: savedReport.lastBriefing,
    },
  };
}
