import { requireAuth, jsonResponse } from '../../lib/api-helpers.js';
import { isGeminiConfigured, generateStructuredJson } from '../../lib/gemini-client.js';
import {
  DEFAULT_CONFIG,
  calculateFinancialSnapshot,
  calculateRecipeCost,
  calculateChannelPricing,
  round2,
  ceilToHalfReal,
} from '../../lib/finance-engine.js';
import { fetchLiveMarketOffersForIngredients } from '../../lib/market-prices.js';
import { generateExecutiveBriefing } from '../../lib/price-sync-service.js';
import { readAiReportBlob, writeAiReportBlob } from '../../lib/blob-store.js';

export const maxDuration = 90;

const CREATE_RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    nome: { type: 'string' },
    tipo: { type: 'string', enum: ['produto', 'subreceita'] },
    rendimento: { type: 'number' },
    unidadeRendimento: { type: 'string' },
    pesoReferencia: { type: 'string' },
    custosIndiretosPct: { type: 'number' },
    precoVendaDireta: { type: 'number' },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['insumo', 'subreceita'] },
          refId: { type: 'string', description: 'ID exato de um insumo ou subreceita existente no cadastro da confeitaria' },
          quantidade: { type: 'number', description: 'Quantidade na mesma unidade do insumo/subreceita (g, ml ou un)' },
        },
        required: ['tipo', 'refId', 'quantidade'],
      },
    },
    novosInsumosSugeridos: {
      type: 'array',
      description: 'Somente se algum ingrediente essencial não existir no cadastro atual',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          categoria: { type: 'string' },
          precoEstimado: { type: 'number' },
          quantidadeEmb: { type: 'number' },
          unidade: { type: 'string', enum: ['g', 'ml', 'un'] },
          quantidadeNaReceita: { type: 'number' },
        },
        required: ['nome', 'categoria', 'precoEstimado', 'quantidadeEmb', 'unidade', 'quantidadeNaReceita'],
      },
    },
    passos: {
      type: 'array',
      items: { type: 'string' },
    },
    justificativaComercial: { type: 'string' },
  },
  required: [
    'nome',
    'tipo',
    'rendimento',
    'unidadeRendimento',
    'pesoReferencia',
    'custosIndiretosPct',
    'precoVendaDireta',
    'itens',
    'novosInsumosSugeridos',
    'passos',
    'justificativaComercial',
  ],
};

const OPTIMIZE_GOAL_SCHEMA = {
  type: 'object',
  properties: {
    resumoEstrategia: { type: 'string' },
    metaAtingivel: { type: 'boolean' },
    planoFornadas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          recipeId: { type: 'string' },
          nome: { type: 'string' },
          fornadasRecomendadas: { type: 'integer' },
          motivo: { type: 'string' },
        },
        required: ['recipeId', 'nome', 'fornadasRecomendadas', 'motivo'],
      },
    },
    dicasParaBaterMeta: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['resumoEstrategia', 'metaAtingivel', 'planoFornadas', 'dicasParaBaterMeta'],
};

const MARKETING_SCHEMA = {
  type: 'object',
  properties: {
    focoEstrategico: { type: 'string', description: 'Por que estes doces foram escolhidos (ROI/margem)' },
    whatsappStatus: { type: 'string', description: 'Mensagem pronta para WhatsApp / Lista de Transmissão com emojis e preços reais' },
    instagramLegenda: { type: 'string', description: 'Legenda pronta para Instagram com gancho, benefícios artesanais e CTA' },
    abordagemClientes: { type: 'string', description: 'Script curto de mensagem direta para clientes que já compraram' },
  },
  required: ['focoEstrategico', 'whatsappStatus', 'instagramLegenda', 'abordagemClientes'],
};

const RECEIPT_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    mercadoDetectado: { type: 'string' },
    dataCompra: { type: 'string' },
    itensEncontrados: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          textoCupom: { type: 'string' },
          matchedIngredientId: { type: 'string', description: 'ID exato do insumo correspondente no estoque da confeitaria, ou vazio "" se não corresponder a nenhum' },
          matchedIngredientName: { type: 'string' },
          precoPagoEmbalagem: { type: 'number', description: 'Preço unitário pago por 1 embalagem/unidade no cupom' },
          quantidadeComprada: { type: 'number' },
          precoNormalizadoParaCadastro: { type: 'number', description: 'Preço ajustado para a embalagem cadastrada no estoque' },
          confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          observacao: { type: 'string' },
        },
        required: [
          'textoCupom',
          'matchedIngredientId',
          'matchedIngredientName',
          'precoPagoEmbalagem',
          'quantidadeComprada',
          'precoNormalizadoParaCadastro',
          'confianca',
          'observacao',
        ],
      },
    },
    resumo: { type: 'string' },
  },
  required: ['mercadoDetectado', 'dataCompra', 'itensEncontrados', 'resumo'],
};

const IMPORT_RECIPES_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Resumo claro e objetivo em português do Brasil do que foi extraído, estruturado (insumos novos, sub-receitas e produtos) e precificado.',
    },
    novosInsumos: {
      type: 'array',
      description: 'Somente ingredientes ou embalagens essenciais que NÃO existem no cadastro atual. Usar tempIds sequenciais: new-ing-1, new-ing-2, ...',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'Identificador temporário sequencial: new-ing-1, new-ing-2, ...' },
          nome: { type: 'string' },
          categoria: {
            type: 'string',
            description: 'Categoria padrão: Laticínios, Chocolates & Cacau, Açúcares & Mel, Secos & Farinhas, Gorduras & Ovos, Especiarias & Fermentos, Frutas & Castanhas, Biscoitos & Casquinhas ou Embalagens',
          },
          preco: { type: 'number', description: 'Preço realista em R$ (Florianópolis/SC) para a embalagem informada em quantidade' },
          quantidade: { type: 'number', description: 'Tamanho da embalagem comprada na unidade informada (ex: 100, 500, 1000, 1)' },
          unidade: { type: 'string', enum: ['g', 'ml', 'un'] },
          obs: { type: 'string', description: 'Referência da embalagem/marca em Florianópolis/SC' },
        },
        required: ['tempId', 'nome', 'categoria', 'preco', 'quantidade', 'unidade', 'obs'],
      },
    },
    subreceitas: {
      type: 'array',
      description: 'Bases, massas, recheios ou coberturas reaproveitáveis. Usar tempIds sequenciais: new-sub-1, new-sub-2, ...',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'Identificador temporário sequencial: new-sub-1, new-sub-2, ...' },
          nome: { type: 'string' },
          rendimento: { type: 'number', description: 'Rendimento numérico total da sub-receita (ex: 2 para 2 panetones, ou 520 para 520 g de recheio)' },
          unidadeRendimento: { type: 'string', description: 'Unidade do rendimento: un, g, ml ou porções' },
          pesoReferencia: { type: 'string', description: 'Peso/rendimento descritivo (ex: 2 panetones ~540 g cada, ou ~520 g líquidos)' },
          custosIndiretosPct: { type: 'number', description: 'Percentual de gás/energia/água/perdas (ex: 15 ou 20)' },
          itens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['insumo', 'subreceita'] },
                refId: { type: 'string', description: 'ID exato de insumo/sub-receita existente OU tempId de novosInsumos/subreceitas' },
                quantidade: { type: 'number', description: 'Quantidade usada na mesma unidade do insumo ou unidadeRendimento da sub-receita' },
              },
              required: ['tipo', 'refId', 'quantidade'],
            },
          },
          passos: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['tempId', 'nome', 'rendimento', 'unidadeRendimento', 'pesoReferencia', 'custosIndiretosPct', 'itens', 'passos'],
      },
    },
    produtos: {
      type: 'array',
      description: 'Produtos finais prontos para venda (1 por sabor/variação). Usar tempIds sequenciais: new-prod-1, new-prod-2, ...',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'Identificador temporário sequencial: new-prod-1, new-prod-2, ...' },
          nome: { type: 'string' },
          rendimento: { type: 'number', description: 'Número de unidades vendáveis produzidas no lote desta ficha (ex: 2 ou 1)' },
          unidadeRendimento: { type: 'string', description: 'Normalmente "un"' },
          pesoReferencia: { type: 'string', description: 'Peso aproximado por unidade (ex: ~850 g / un)' },
          custosIndiretosPct: { type: 'number', description: 'Use 0 quando o produto apenas monta sub-receitas já cozidas/assadas; ou 15 se assa/cozinha direto sem sub-receita' },
          precoVendaDireta: { type: 'number', description: 'Preço sugerido de venda direta POR 1 UNIDADE em R$ (Florianópolis/SC) buscando atingir a margem alvo' },
          itens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['insumo', 'subreceita'] },
                refId: { type: 'string', description: 'ID exato de insumo/sub-receita existente OU tempId de novosInsumos/subreceitas' },
                quantidade: { type: 'number', description: 'Quantidade TOTAL consumida no lote de `rendimento` unidades (mesma unidade do insumo ou unidadeRendimento da sub-receita)' },
              },
              required: ['tipo', 'refId', 'quantidade'],
            },
          },
          passos: {
            type: 'array',
            items: { type: 'string' },
          },
          justificativaComercial: {
            type: 'string',
            description: 'Curta justificativa comercial de posicionamento e preço para Florianópolis/SC',
          },
        },
        required: [
          'tempId',
          'nome',
          'rendimento',
          'unidadeRendimento',
          'pesoReferencia',
          'custosIndiretosPct',
          'precoVendaDireta',
          'itens',
          'passos',
          'justificativaComercial',
        ],
      },
    },
  },
  required: ['summary', 'novosInsumos', 'subreceitas', 'produtos'],
};

const PT_STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'sem', 'e', 'a', 'o', 'as', 'os', 'um', 'uma',
  'tipo', 'p', 'c', 's', 'ou', 'ao', 'aos',
]);

function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePackageSizeFromTitle(title, expectedUnit) {
  if (!title) return null;

  if (expectedUnit === 'g') {
    const kgMatch = title.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|quilos?)\b/i);
    if (kgMatch) {
      const val = Number(kgMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 0) return round2(val * 1000);
    }
    const gMatch = title.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramas?)\b/i);
    if (gMatch) {
      const val = Number(gMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 0) return round2(val);
    }
    return null;
  }

  if (expectedUnit === 'ml') {
    const mlMatch = title.match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
    if (mlMatch) {
      const val = Number(mlMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 0) return round2(val);
    }
    const lMatch = title.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litros?)\b/i);
    if (lMatch) {
      const val = Number(lMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 0) return round2(val * 1000);
    }
    return null;
  }

  if (expectedUnit === 'un') {
    const unMatch = title.match(/(\d+)\s*(?:un|und|unid|unidades?)\b/i)
      || title.match(/\bc\/\s*(\d+)\b/i)
      || title.match(/\bcom\s+(\d+)\s*(?:un|und|unid|unidades?|formas?|pecas?|peças?|folhas?)\b/i);
    if (unMatch) {
      const val = Number(unMatch[1]);
      if (Number.isFinite(val) && val > 0) return val;
    }
    return null;
  }

  return null;
}

function selectReasonableLiveQuote(ing, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const ingNorm = normalizeSearchText(ing.nome);
  const ingTokens = ingNorm
    .split(' ')
    .filter((t) => t.length >= 2 && !PT_STOPWORDS.has(t) && !/^\d+$/.test(t));
  if (ingTokens.length === 0) return null;

  const estPrice = Math.max(0.1, Number(ing.preco || 1));
  const estQty = Math.max(0.1, Number(ing.quantidade || 1));
  const estUnitCost = estPrice / estQty;
  const allowBulk = /\b(kit|caixa|pack|fardo)\b/i.test(ing.nome || '');
  const isEmbalagem = /embalag/i.test(ing.categoria || '');

  let best = null;
  let bestScore = -Infinity;

  for (const cand of candidates) {
    const price = Number(cand?.price || 0);
    if (!Number.isFinite(price) || price <= 0) continue;

    const title = String(cand?.title || '').trim();
    if (!title) continue;
    if (!allowBulk && /\b(fardo|display|caixa fechada|pack\s*c\/|kit\s+com\s+\d+|\d+\s*x\s*\d+)\b/i.test(title)) {
      continue;
    }

    const titleNorm = normalizeSearchText(title);
    const titleWords = new Set(titleNorm.split(' '));
    let matchedCount = 0;
    let matchedLongToken = false;

    for (const tok of ingTokens) {
      const hit = titleWords.has(tok) || (tok.length >= 4 && titleNorm.includes(tok));
      if (hit) {
        matchedCount += 1;
        if (tok.length >= 4) matchedLongToken = true;
      }
    }

    const overlapRatio = matchedCount / ingTokens.length;
    if (matchedCount === 0) continue;
    if (ingTokens.length >= 2 && (overlapRatio < 0.5 || !matchedLongToken)) continue;

    const parsedQty = parsePackageSizeFromTitle(title, ing.unidade);
    let finalPrice = round2(price);
    let finalQty = estQty;
    let packCloseness = 0;

    if (parsedQty && parsedQty > 0) {
      const packRatio = parsedQty / estQty;
      const candUnitCost = price / parsedQty;
      const unitCostRatio = candUnitCost / estUnitCost;

      if (ing.unidade === 'un') {
        const minPack = isEmbalagem ? 0.5 : 0.4;
        const maxPack = isEmbalagem ? 2.0 : 2.5;
        const minUnit = isEmbalagem ? 0.35 : 0.3;
        if (packRatio < minPack || packRatio > maxPack) continue;
        if (unitCostRatio < minUnit || unitCostRatio > 2.5) continue;
      } else {
        if (packRatio < 0.35 || packRatio > 3.0) continue;
        if (unitCostRatio < 0.25 || unitCostRatio > 3.0) continue;
      }

      finalQty = parsedQty;
      finalPrice = round2(price);
      packCloseness = 1 / (1 + Math.abs(Math.log(packRatio)));
    } else {
      const priceRatio = price / estPrice;
      if (overlapRatio < 0.65 || priceRatio < 0.4 || priceRatio > 2.2) continue;
      finalQty = estQty;
      finalPrice = round2(price);
      packCloseness = 0.45;
    }

    const unitNorm = finalPrice / Math.max(0.1, finalQty);
    const score = overlapRatio * 4 + packCloseness * 3 - Math.min(2, unitNorm / Math.max(0.0001, estUnitCost)) * 0.4;

    if (score > bestScore) {
      bestScore = score;
      best = {
        preco: finalPrice,
        quantidade: finalQty,
        liveQuote: {
          store: String(cand.store || 'Mercado SC'),
          title,
          price: round2(price),
          url: String(cand.url || ''),
        },
      };
    }
  }

  return best;
}

function sanitizeRecipeItems(rawItems, { validIngIds, validSubIds, ingTempIdMap, subTempIdMap, selfTempId = null }) {
  const merged = new Map();

  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const qty = Number(raw?.quantidade);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const rawRef = String(raw?.refId || '').trim();
    if (!rawRef) continue;

    const mappedIng = ingTempIdMap.get(rawRef) || rawRef;
    const mappedSub = subTempIdMap.get(rawRef) || rawRef;
    const declaredTipo = raw?.tipo === 'subreceita' ? 'subreceita' : 'insumo';

    let finalTipo = null;
    let finalRefId = null;

    if (declaredTipo === 'insumo' && validIngIds.has(mappedIng)) {
      finalTipo = 'insumo';
      finalRefId = mappedIng;
    } else if (declaredTipo === 'subreceita' && validSubIds.has(mappedSub) && mappedSub !== selfTempId) {
      finalTipo = 'subreceita';
      finalRefId = mappedSub;
    } else if (validIngIds.has(mappedIng)) {
      finalTipo = 'insumo';
      finalRefId = mappedIng;
    } else if (validSubIds.has(mappedSub) && mappedSub !== selfTempId) {
      finalTipo = 'subreceita';
      finalRefId = mappedSub;
    } else {
      continue;
    }

    const key = `${finalTipo}::${finalRefId}`;
    const prev = merged.get(key);
    if (prev) {
      prev.quantidade = Math.round((prev.quantidade + qty) * 1000) / 1000;
    } else {
      merged.set(key, {
        tipo: finalTipo,
        refId: finalRefId,
        quantidade: Math.round(qty * 1000) / 1000,
      });
    }
  }

  return Array.from(merged.values());
}

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isGeminiConfigured()) {
    return jsonResponse({ error: 'GEMINI_API_KEY não configurada no servidor.' }, 503);
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '');
    const state = body?.state;

    if (!state || !Array.isArray(state.ingredients) || !Array.isArray(state.recipes)) {
      return jsonResponse({ error: 'Estado financeiro inválido.' }, 400);
    }

    // 1. Atualizar Briefing Executivo & Nota de Saúde
    if (action === 'briefing') {
      const snapshot = calculateFinancialSnapshot(state);
      const briefing = await generateExecutiveBriefing(state, snapshot, null);
      const report = await readAiReportBlob();
      await writeAiReportBlob({ ...report, lastBriefing: briefing });
      return jsonResponse({ ok: true, briefing, snapshot });
    }

    // 2. Criador de Ficha Técnica com IA usando insumos reais do estoque
    if (action === 'create_recipe') {
      const idea = String(body?.idea || '').trim();
      const targetMargin = Math.max(20, Math.min(80, Number(body?.targetMargin || state.config?.margemMinima || 45)));
      if (!idea) {
        return jsonResponse({ error: 'Descreva a ideia do doce ou receita para a IA criar a ficha técnica.' }, 400);
      }

      const inventory = state.ingredients.map((i) => ({
        id: i.id,
        nome: i.nome,
        categoria: i.categoria,
        preco: i.preco,
        quantidadeEmb: i.quantidade,
        unidade: i.unidade,
      }));
      const subrecipes = state.recipes
        .filter((r) => r.tipo === 'subreceita')
        .map((r) => ({ id: r.id, nome: r.nome, rendimento: r.rendimento, unidade: r.unidadeRendimento }));

      const systemInstruction = [
        'Você é uma chef confeiteira e engenheira de alimentos especialista em fichas técnicas da Ana\'s Bakery (Florianópolis/SC).',
        'Crie uma ficha técnica realista, deliciosa e lucrativa em português do Brasil.',
        'USE PRIORITARIAMENTE os IDs exatos dos insumos e sub-receitas já cadastrados no estoque fornecido!',
        'NUNCA invente um refId que não exista nas listas fornecidas. Se precisar de um ingrediente novo que não está no estoque, liste-o em novosInsumosSugeridos.',
        'Lembre-se de incluir emb-individual (ou emb-familia) na quantidade correspondente ao rendimento quando for produto final!',
        `Calcule precoVendaDireta realista para Florianópolis buscando margem líquida próxima de ${targetMargin}%.`,
      ].join('\n');

      const prompt = `Ideia solicitada: "${idea}"\nMargem alvo: ${targetMargin}%\n\nInsumos disponíveis:\n${JSON.stringify(inventory)}\n\nSub-receitas disponíveis:\n${JSON.stringify(subrecipes)}`;

      const res = await generateStructuredJson({
        prompt,
        systemInstruction,
        schema: CREATE_RECIPE_SCHEMA,
        temperature: 0.35,
      });

      // Valida refIds para garantir integridade 100% no frontend
      const validIngIds = new Set(state.ingredients.map((i) => i.id));
      const validSubIds = new Set(state.recipes.filter((r) => r.tipo === 'subreceita').map((r) => r.id));
      const cleanRecipe = {
        ...res.json,
        itens: (res.json.itens || []).filter((it) => (
          (it.tipo === 'insumo' && validIngIds.has(it.refId)) ||
          (it.tipo === 'subreceita' && validSubIds.has(it.refId))
        ) && Number(it.quantidade) > 0),
      };

      return jsonResponse({ ok: true, model: res.model, recipe: cleanRecipe });
    }

    // 2B. Importador & Precificador de Receitas via Texto Livre / WhatsApp (IA + Motor Determinístico)
    if (action === 'import_recipes') {
      const rawText = String(body?.rawText || '').trim();
      if (!rawText) {
        return jsonResponse({ error: 'Cole o texto da receita ou conversa do WhatsApp para a IA analisar e precificar.' }, 400);
      }

      const config = { ...DEFAULT_CONFIG, ...(state.config || {}) };
      const defaultTargetMargin = Math.max(45, Number(config.margemMinima || 35));
      const rawMargin = body?.targetMargin !== undefined && body?.targetMargin !== null && body?.targetMargin !== ''
        ? Number(body.targetMargin)
        : defaultTargetMargin;
      const targetMargin = Math.max(20, Math.min(80, Number.isFinite(rawMargin) ? rawMargin : defaultTargetMargin));
      const livePriceNewIngredients = Boolean(body?.livePriceNewIngredients);

      const inventory = state.ingredients.map((i) => ({
        id: i.id,
        nome: i.nome,
        categoria: i.categoria,
        preco: i.preco,
        quantidadeEmb: i.quantidade,
        unidade: i.unidade,
      }));
      const existingSubrecipes = state.recipes
        .filter((r) => r.tipo === 'subreceita')
        .map((r) => ({
          id: r.id,
          nome: r.nome,
          rendimento: r.rendimento,
          unidadeRendimento: r.unidadeRendimento || 'un',
          pesoReferencia: r.pesoReferencia || '',
        }));

      const systemInstruction = [
        'Você é uma chef confeiteira, engenheira de alimentos e especialista em precificação da Ana\'s Bakery (Florianópolis/SC).',
        'Sua tarefa é ler qualquer texto livre de receita ou histórico de conversa do WhatsApp (ignorando horários, nomes de remetentes e conversas paralelas) e estruturar fichas técnicas completas e prontas para importar em português do Brasil.',
        '',
        'REGRAS DE CONVERSÃO CULINÁRIA DETERMINÍSTICA:',
        '- 1 lata ou caixa de leite condensado = 395 g (se for leite condensado cozido na lata/pressão para doce de leite, prefira `leite-moca-lata` se existir no estoque; senão `leite-condensado`).',
        '- 1 caixa de creme de leite = 200 g.',
        '- 1 colher (sopa) = ~15 g ou 15 ml (margarina/manteiga ~20 g; leite em pó / chocolate em pó / cacau ~15 g).',
        '- 1 colher (chá) = ~5 g ou 5 ml (mel ~7 g; café solúvel ~2 g; sal ~5 g; essências ~5 ml; lecitina ~5 g).',
        '- 1 xícara (chá) = ~120 g farinha, ~180 g açúcar, ~240 ml líquidos.',
        '- N gemas = N ovos inteiros no custo (use o insumo `ovos` em `un`).',
        '- Raspas de 1 laranja = 1 un de laranja (ou 1 un de limão).',
        '- Água (fria/morna/fervente) = NÃO cadastre como insumo E NUNCA substitua água por leite ou outro líquido em `itens`! Descreva a água APENAS nos `passos` (o custo entra em `custosIndiretosPct`).',
        '',
        'REUSO DO ESTOQUE E NOVOS INSUMOS:',
        '- REUTILIZE PRIORITARIAMENTE os IDs exatos de `Insumos cadastrados` e `Sub-receitas cadastradas` sempre que houver correspondência clara (ex.: "leite em pó" -> reutilize `leite-ninho` se existir no estoque)!',
        '- Somente crie entradas em `novosInsumos` para ingredientes ou embalagens que realmente NÃO existem no cadastro fornecido (ex.: fermento biológico seco, essência de panetone, lecitina de soja, forma/embalagem específica).',
        '- Atribua tempIds sequenciais em `novosInsumos`: `new-ing-1`, `new-ing-2`, ... com embalagens comerciais usuais e preços realistas dos mercados locais de Florianópolis/SC (Fort Atacadista Campeche/Jardim Atlântico, Bistek, Hiper Select, Hippo e Angeloni).',
        '- NUNCA invente um `refId` que não exista no cadastro atual nem nos `tempId` criados em `novosInsumos`/`subreceitas`.',
        '',
        'ESTRUTURA DE BASES, RECHEIOS E PRODUTOS FINAIS:',
        '- Se o texto descrever massa base + múltiplos recheios/sabores (ex.: Panetone com 4 recheios), junte pré-fermento/esponja + massa em uma sub-receita da massa (`new-sub-1`), crie uma sub-receita para cada recheio/cobertura composta (`new-sub-2`, ...) e crie UM produto final (`new-prod-1`, `new-prod-2`, ...) para CADA sabor/variação referenciando as respectivas sub-receitas! Coberturas de 1 único ingrediente (ex.: 100 g de `cobertura-frac`) podem ir direto como item `insumo` no produto final.',
        '- Inclua SEMPRE embalagem apropriada em todo produto final: reutilize uma embalagem existente no estoque (`emb-individual`, `emb-familia`, `emb-tortinha`, `emb-panetone`, etc. SE existir na lista) ou crie a embalagem adequada em `novosInsumos` (categoria `Embalagens`, `quantidade: 1`, `unidade: "un"`).',
        '- Use `custosIndiretosPct` de 15 a 20 nas sub-receitas que vão ao fogo/forno/pressão, e `0` nos produtos finais que apenas montam sub-receitas já cozidas/assadas (ou 15 se o produto assa/cozinha direto sem sub-receita).',
        '',
        'REGRA CRÍTICA DE UNIDADES E QUANTIDADES (MOTOR DE CUSTO):',
        '- O custo de cada item `subreceita` é calculado como `(custoTotalSubreceita / rendimentoSubreceita) * item.quantidade`. Portanto, `item.quantidade` DEVE estar na MESMA unidade de `unidadeRendimento` da sub-receita!',
        '- Exemplo: se um recheio tem `rendimento: 520` e `unidadeRendimento: "g"`, um produto que usa o recheio inteiro deve colocar `quantidade: 520` (NUNCA `1`!). Se a massa tem `rendimento: 2` e `unidadeRendimento: "un"`, um produto de `rendimento: 2` usa `quantidade: 2` (e de `rendimento: 1` usa `quantidade: 1`).',
        '- Em `produtos`, cada `item.quantidade` representa o consumo TOTAL do lote de `rendimento` unidades (ex.: se `rendimento: 2`, coloque 2 embalagens, 2 unidades de massa e a cobertura total dos 2 panetones).',
        `- \`precoVendaDireta\` é SEMPRE o preço sugerido de venda direta POR 1 UNIDADE vendável em Florianópolis/SC (não do lote inteiro), buscando atingir pelo menos ${targetMargin}% de margem líquida.`,
      ].join('\n');

      const prompt = [
        `Margem líquida alvo desejada: ${targetMargin}%`,
        `Configurações atuais da confeitaria: ${JSON.stringify(config)}`,
        '',
        'TEXTO / CONVERSA COLADA PELO USUÁRIO:',
        rawText.slice(0, 24000),
        '',
        `Insumos cadastrados no estoque (${inventory.length}):`,
        JSON.stringify(inventory),
        '',
        `Sub-receitas já cadastradas (${existingSubrecipes.length}):`,
        JSON.stringify(existingSubrecipes),
      ].join('\n');

      const res = await generateStructuredJson({
        prompt,
        systemInstruction,
        schema: IMPORT_RECIPES_SCHEMA,
        tier: 'copilot',
        temperature: 0.2,
      });

      const aiData = res.json || {};
      const existingIngIds = new Set(state.ingredients.map((i) => i.id));
      const existingSubIds = new Set(state.recipes.filter((r) => r.tipo === 'subreceita').map((r) => r.id));

      // 1) Sanitiza novosInsumos e cria mapa de tempId -> tempId sequencial
      const ingTempIdMap = new Map();
      const novosInsumos = [];
      for (const raw of Array.isArray(aiData.novosInsumos) ? aiData.novosInsumos : []) {
        const nome = String(raw?.nome || '').trim();
        if (!nome) continue;

        let unidade = String(raw?.unidade || 'g').trim().toLowerCase();
        let quantidade = Number(raw?.quantidade);
        if (unidade === 'kg') {
          unidade = 'g';
          quantidade = Number.isFinite(quantidade) && quantidade > 0 ? quantidade * 1000 : 1000;
        } else if (unidade === 'l' || unidade === 'lt') {
          unidade = 'ml';
          quantidade = Number.isFinite(quantidade) && quantidade > 0 ? quantidade * 1000 : 1000;
        } else if (!['g', 'ml', 'un'].includes(unidade)) {
          unidade = 'g';
        }
        if (!Number.isFinite(quantidade) || quantidade <= 0) {
          quantidade = unidade === 'un' ? 1 : 100;
        }

        const preco = round2(Math.max(0.05, Number.isFinite(Number(raw?.preco)) && Number(raw.preco) > 0 ? Number(raw.preco) : 10));
        const tempId = `new-ing-${novosInsumos.length + 1}`;
        const rawTempId = String(raw?.tempId || '').trim();
        if (rawTempId) ingTempIdMap.set(rawTempId, tempId);
        ingTempIdMap.set(tempId, tempId);

        novosInsumos.push({
          tempId,
          nome,
          categoria: String(raw?.categoria || 'Outros').trim() || 'Outros',
          preco,
          quantidade: Math.max(0.1, round2(quantidade)),
          unidade,
          obs: String(raw?.obs || 'Estimativa IA (Florianópolis/SC)').trim(),
          liveQuote: null,
        });
      }

      // 2) Opcional: refina preços de novosInsumos ao vivo nos mercados SC (nunca falha o import)
      if (livePriceNewIngredients && novosInsumos.length > 0) {
        try {
          const toFetch = novosInsumos.slice(0, 15).map((ing) => ({
            id: ing.tempId,
            nome: ing.nome,
            categoria: ing.categoria,
            preco: ing.preco,
            quantidade: ing.quantidade,
            unidade: ing.unidade,
            obs: ing.obs,
          }));
          const marketRows = await fetchLiveMarketOffersForIngredients(toFetch);
          const byId = new Map(marketRows.map((row) => [row.ingredientId, row]));

          for (const ing of novosInsumos) {
            const row = byId.get(ing.tempId);
            if (!row || !Array.isArray(row.candidates) || row.candidates.length === 0) continue;
            const matched = selectReasonableLiveQuote(ing, row.candidates);
            if (matched) {
              ing.preco = matched.preco;
              ing.quantidade = matched.quantidade;
              ing.liveQuote = matched.liveQuote;
            }
          }
        } catch (liveErr) {
          console.warn('[api/ai/tools] Cotação ao vivo opcional falhou no import_recipes:', liveErr?.message || liveErr);
        }
      }

      const validIngIds = new Set([...existingIngIds, ...novosInsumos.map((i) => i.tempId)]);

      // 3) Sanitiza subreceitas em 2 passagens para garantir 0 refIds inválidos
      const subTempIdMap = new Map();
      const rawSubs = [];
      for (const raw of Array.isArray(aiData.subreceitas) ? aiData.subreceitas : []) {
        const nome = String(raw?.nome || '').trim();
        if (!nome) continue;
        const tempId = `new-sub-${rawSubs.length + 1}`;
        const rawTempId = String(raw?.tempId || '').trim();
        if (rawTempId) subTempIdMap.set(rawTempId, tempId);
        subTempIdMap.set(tempId, tempId);
        rawSubs.push({ raw, tempId, nome });
      }

      const provisionalSubIds = new Set([...existingSubIds, ...rawSubs.map((s) => s.tempId)]);
      let cleanSubreceitas = rawSubs
        .map(({ raw, tempId, nome }) => {
          const itens = sanitizeRecipeItems(raw?.itens, {
            validIngIds,
            validSubIds: provisionalSubIds,
            ingTempIdMap,
            subTempIdMap,
            selfTempId: tempId,
          });
          const rendimento = Math.max(0.1, Number.isFinite(Number(raw?.rendimento)) && Number(raw.rendimento) > 0 ? Number(raw.rendimento) : 1);
          const rawIndPct = Number(raw?.custosIndiretosPct);
          const custosIndiretosPct = Math.max(0, Math.min(100, Number.isFinite(rawIndPct) ? rawIndPct : Number(config.custosIndiretosPadrao || 15)));
          const passos = (Array.isArray(raw?.passos) ? raw.passos : [])
            .map((p) => String(p || '').trim())
            .filter(Boolean);

          return {
            tempId,
            nome,
            tipo: 'subreceita',
            rendimento: Math.round(rendimento * 1000) / 1000,
            unidadeRendimento: String(raw?.unidadeRendimento || 'un').trim() || 'un',
            pesoReferencia: String(raw?.pesoReferencia || '').trim(),
            custosIndiretosPct,
            itens,
            passos,
          };
        })
        .filter((s) => s.itens.length > 0);

      // Revalida referências caso alguma sub-receita vazia tenha sido removida
      const validSubIds = new Set([...existingSubIds, ...cleanSubreceitas.map((s) => s.tempId)]);
      cleanSubreceitas = cleanSubreceitas
        .map((s) => ({
          ...s,
          itens: s.itens.filter((it) => it.tipo === 'insumo' || validSubIds.has(it.refId)),
        }))
        .filter((s) => s.itens.length > 0);

      const finalValidSubIds = new Set([...existingSubIds, ...cleanSubreceitas.map((s) => s.tempId)]);

      // 4) Sanitiza produtos finais
      const cleanProdutos = [];
      for (const raw of Array.isArray(aiData.produtos) ? aiData.produtos : []) {
        const nome = String(raw?.nome || '').trim();
        if (!nome) continue;

        const itens = sanitizeRecipeItems(raw?.itens, {
          validIngIds,
          validSubIds: finalValidSubIds,
          ingTempIdMap,
          subTempIdMap,
          selfTempId: null,
        });
        if (itens.length === 0) continue;

        const tempId = `new-prod-${cleanProdutos.length + 1}`;
        const rendimento = Math.max(0.1, Number.isFinite(Number(raw?.rendimento)) && Number(raw.rendimento) > 0 ? Number(raw.rendimento) : 1);
        const rawIndPct = Number(raw?.custosIndiretosPct);
        const custosIndiretosPct = Math.max(0, Math.min(100, Number.isFinite(rawIndPct) ? rawIndPct : 0));
        const rawPrice = Number(raw?.precoVendaDireta);
        const precoVendaDireta = Number.isFinite(rawPrice) && rawPrice > 0 ? round2(rawPrice) : 0;
        const passos = (Array.isArray(raw?.passos) ? raw.passos : [])
          .map((p) => String(p || '').trim())
          .filter(Boolean);

        cleanProdutos.push({
          tempId,
          nome,
          tipo: 'produto',
          rendimento: Math.round(rendimento * 1000) / 1000,
          unidadeRendimento: String(raw?.unidadeRendimento || 'un').trim() || 'un',
          pesoReferencia: String(raw?.pesoReferencia || '').trim(),
          custosIndiretosPct,
          precoVendaDireta,
          fornadasPlanejadas: 0,
          itens,
          passos,
          justificativaComercial: String(raw?.justificativaComercial || '').trim(),
        });
      }

      // 5) Monta estado temporário mesclado e calcula custos & precificação 100% determinísticos no servidor
      const tempState = {
        ...state,
        config,
        ingredients: [
          ...state.ingredients,
          ...novosInsumos.map((ing) => ({
            id: ing.tempId,
            nome: ing.nome,
            categoria: ing.categoria,
            preco: ing.preco,
            quantidade: ing.quantidade,
            unidade: ing.unidade,
            obs: ing.obs,
          })),
        ],
        recipes: [
          ...state.recipes,
          ...cleanSubreceitas.map((sub) => ({
            id: sub.tempId,
            nome: sub.nome,
            tipo: 'subreceita',
            rendimento: sub.rendimento,
            unidadeRendimento: sub.unidadeRendimento,
            pesoReferencia: sub.pesoReferencia,
            custosIndiretosPct: sub.custosIndiretosPct,
            itens: sub.itens,
            passos: sub.passos,
          })),
          ...cleanProdutos.map((prod) => ({
            id: prod.tempId,
            nome: prod.nome,
            tipo: 'produto',
            rendimento: prod.rendimento,
            unidadeRendimento: prod.unidadeRendimento,
            pesoReferencia: prod.pesoReferencia,
            custosIndiretosPct: prod.custosIndiretosPct,
            precoVendaDireta: prod.precoVendaDireta,
            fornadasPlanejadas: 0,
            itens: prod.itens,
            passos: prod.passos,
          })),
        ],
      };

      const pricedSubreceitas = cleanSubreceitas.map((sub) => {
        const calc = calculateRecipeCost(sub.tempId, tempState);
        const custoUnitario = calc.custoUnitario > 0 && calc.custoUnitario < 1
          ? Math.round((calc.custoUnitario + Number.EPSILON) * 10000) / 10000
          : round2(calc.custoUnitario);
        return {
          ...sub,
          custoTotal: round2(calc.custoTotal),
          custoUnitario,
        };
      });

      const pricedProdutos = cleanProdutos.map((prod) => {
        const calc = calculateRecipeCost(prod.tempId, tempState);
        const custoUnitario = calc.custoUnitario;
        const targetMarginPrice = targetMargin < 100
          ? custoUnitario / (1 - targetMargin / 100)
          : custoUnitario * 2;

        let precoVendaDireta = round2(prod.precoVendaDireta);
        if (custoUnitario > 0 && (!Number.isFinite(precoVendaDireta) || precoVendaDireta < targetMarginPrice)) {
          precoVendaDireta = round2(ceilToHalfReal(targetMarginPrice));
        }

        const pricing = calculateChannelPricing(custoUnitario, precoVendaDireta, config);
        return {
          ...prod,
          precoVendaDireta,
          pricingPreview: {
            custoTotalLote: round2(calc.custoTotal),
            custoUnitario: round2(calc.custoUnitario),
            precoDireto: round2(pricing.precoDireto),
            lucroDireto: round2(pricing.lucroDireto),
            margemDiretaPct: round2(pricing.margemDiretaPct),
            roiUnitarioPct: round2(pricing.roiUnitarioPct),
            precoMinimoRecomendado: round2(pricing.precoMinimoRecomendado),
            precoIfoodBasico: round2(pricing.ifoodBasico.preco),
            precoIfoodEntrega: round2(pricing.ifoodEntrega.preco),
            status: pricing.status,
          },
        };
      });

      const summary = String(aiData.summary || '').trim()
        || `Estruturados ${novosInsumos.length} novo(s) insumo(s), ${pricedSubreceitas.length} sub-receita(s) e ${pricedProdutos.length} produto(s) com precificação calculada para margem alvo de ${targetMargin}%.`;

      return jsonResponse({
        ok: true,
        model: res.model,
        summary,
        novosInsumos,
        subreceitas: pricedSubreceitas,
        produtos: pricedProdutos,
      });
    }

    // 3. Otimizador de Meta de Lucro & ROI (Plano de Fornadas IA)
    if (action === 'optimize_goal') {
      const targetProfit = Math.max(100, Number(body?.targetProfit || 1500));
      const periodo = body?.periodo === 'Mensal' ? 'Mensal' : (body?.periodo === 'Semanal' ? 'Semanal' : state.periodo || 'Semanal');
      const maxUnits = Math.max(10, Number(body?.maxUnits || (periodo === 'Mensal' ? 400 : 120)));

      const snapshot = calculateFinancialSnapshot({ ...state, periodo });
      const productsInfo = snapshot.products.map((p) => ({
        recipeId: p.id,
        nome: p.nome,
        rendimentoPorFornada: p.rendimento,
        fornadasAtuais: p.fornadas,
        custoUnitario: p.custoUnitario,
        precoDireto: p.precoDireto,
        lucroUnitarioDireto: p.lucroDireto,
        margemPct: p.margemDiretaPct,
        roiUnitarioPct: p.roiUnitarioPct,
      }));

      const systemInstruction = [
        'Você é especialista em planejamento de produção e maximização de ROI para confeitarias artesanais.',
        'Monte um plano realista de fornadas (números inteiros >= 0) para atingir a meta de lucro líquido respeitando o teto de unidades produzidas no período.',
        'Priorize produtos com maior ROI unitário e lucro absoluto, mantendo variedade comercial saudável (ex: carro-chefe Pão de Mel + itens de giro alto como Cookies/Brownies/Brigadeiros).',
        'Retorne TODOS os recipeId fornecidos em planoFornadas.',
      ].join('\n');

      const prompt = JSON.stringify({
        periodo,
        metaLucroLiquidoRS: targetProfit,
        limiteMaximoUnidadesPeriodo: maxUnits,
        investimentoTotalInicialRS: snapshot.investimentoTotalInicial,
        mixCanais: state.mix,
        produtos: productsInfo,
      });

      const res = await generateStructuredJson({
        prompt,
        systemInstruction,
        schema: OPTIMIZE_GOAL_SCHEMA,
        temperature: 0.25,
      });

      return jsonResponse({ ok: true, model: res.model, periodo, plan: res.json });
    }

    // 4. Gerador de Campanhas de Venda (WhatsApp / Instagram)
    if (action === 'marketing_copy') {
      const occasion = String(body?.occasion || 'Vendas da semana / pronta-entrega em Florianópolis').trim();
      const snapshot = calculateFinancialSnapshot(state);
      const topByRoi = [...snapshot.products]
        .sort((a, b) => b.roiUnitarioPct - a.roiUnitarioPct)
        .slice(0, 5)
        .map((p) => ({
          nome: p.nome,
          precoDireto: p.precoDireto,
          margemPct: p.margemDiretaPct,
          roiUnitPct: p.roiUnitarioPct,
        }));

      const systemInstruction = [
        'Você é estrategista de marketing e vendas de confeitaria artesanal premium para a Ana\'s Bakery (Florianópolis / Campeche - SC).',
        'Crie textos irresistíveis, naturais, acolhedores e persuasivos em português do Brasil, destacando o sabor artesanal e os preços exatos fornecidos.',
        'Nunca invente preços; use exatamente os valores em R$ fornecidos.',
      ].join('\n');

      const prompt = JSON.stringify({
        ocasiaoOuTema: occasion,
        produtosMaisLucrativos: topByRoi,
        comboAtual: state.combo || null,
      });

      const res = await generateStructuredJson({
        prompt,
        systemInstruction,
        schema: MARKETING_SCHEMA,
        temperature: 0.65,
      });

      return jsonResponse({ ok: true, model: res.model, copy: res.json });
    }

    // 5. Leitor de Nota Fiscal / Cupom de Mercado (Gemini Vision Multimodal!)
    if (action === 'scan_receipt') {
      const imageBase64 = String(body?.imageBase64 || '').trim();
      const imageMimeType = String(body?.imageMimeType || 'image/jpeg').trim();

      if (!imageBase64) {
        return jsonResponse({ error: 'Envie a imagem do cupom ou nota fiscal.' }, 400);
      }
      if (imageBase64.length > 5_500_000) {
        return jsonResponse({ error: 'Imagem muito grande. Envie uma foto de até 4 MB.' }, 413);
      }

      const inventory = state.ingredients.map((i) => ({
        id: i.id,
        nome: i.nome,
        quantidadeEmb: i.quantidade,
        unidade: i.unidade,
        precoAtual: i.preco,
        obs: i.obs,
      }));

      const systemInstruction = [
        'Você é um assistente de leitura de cupons fiscais (NFC-e / notas de supermercado) da Ana\'s Bakery.',
        'Extraia cada item alimentício ou embalagem visível na imagem do cupom fiscal.',
        'Faça o cruzamento com a lista de insumos cadastrados da confeitaria e informe o matchedIngredientId EXATO quando houver correspondência clara.',
        'Se o cupom mostrar o preço de 1 embalagem diferente do peso cadastrado (ex: comprou 1kg por R$ 55,90 e o cadastro é 500g), calcule precoNormalizadoParaCadastro proporcionalmente.',
        'Se um item do cupom não existir no estoque da confeitaria, retorne matchedIngredientId = "".',
      ].join('\n');

      const prompt = `Leia esta foto de nota/cupom fiscal e cruze com os insumos cadastrados da Ana's Bakery:\n${JSON.stringify(inventory)}`;

      const res = await generateStructuredJson({
        prompt,
        systemInstruction,
        schema: RECEIPT_SCAN_SCHEMA,
        imageBase64,
        imageMimeType,
        temperature: 0.1,
      });

      const validMap = new Map(state.ingredients.map((i) => [i.id, i]));
      const items = (res.json.itensEncontrados || []).map((it) => {
        const matchedIng = validMap.get(it.matchedIngredientId);
        return {
          ...it,
          matchedIngredientId: matchedIng ? matchedIng.id : '',
          matchedIngredientName: matchedIng ? matchedIng.nome : (it.matchedIngredientName || ''),
          oldPrice: matchedIng ? round2(matchedIng.preco) : null,
          precoNormalizadoParaCadastro: round2(it.precoNormalizadoParaCadastro || it.precoPagoEmbalagem || 0),
        };
      });

      return jsonResponse({
        ok: true,
        model: res.model,
        receipt: {
          mercadoDetectado: res.json.mercadoDetectado || 'Supermercado',
          dataCompra: res.json.dataCompra || '',
          resumo: res.json.resumo || '',
          itensEncontrados: items,
        },
      });
    }

    return jsonResponse({ error: `Ação de IA desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error('[api/ai/tools] Erro na ferramenta IA:', err);
    return jsonResponse({ error: err?.message || 'Erro ao executar ferramenta de IA.' }, 500);
  }
}
