import { requireAuth, jsonResponse } from '../../lib/api-helpers.js';
import { isGeminiConfigured, generateStructuredJson } from '../../lib/gemini-client.js';
import { calculateFinancialSnapshot, round2 } from '../../lib/finance-engine.js';
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
