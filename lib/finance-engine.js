/**
 * Ana's Bakery — Motor Financeiro & ROI Server-Side (ESM)
 * Espelho exato de gestao-data.js para uso nas Vercel Functions e Vercel Schedules.
 */

export const DEFAULT_CONFIG = {
  margemMinima: 35,
  taxaIfoodBasico: 15.2,
  taxaIfoodEntrega: 26.2,
  custosIndiretosPadrao: 15,
};

export const DEFAULT_INGREDIENTS = [
  { id: 'leite', nome: 'Leite integral', categoria: 'Laticínios', preco: 5.50, quantidade: 1000, unidade: 'ml', obs: 'Caixa 1 L (Tirol/Piracanjuba - Fort/SC)' },
  { id: 'leite-condensado', nome: 'Leite condensado', categoria: 'Laticínios', preco: 6.90, quantidade: 395, unidade: 'g', obs: 'Cx 395 g (Piracanjuba/Tirol - Fort/SC)' },
  { id: 'creme-de-leite', nome: 'Creme de leite', categoria: 'Laticínios', preco: 3.50, quantidade: 200, unidade: 'g', obs: 'Cx 200 g (Piracanjuba/Tirol - Fort/SC)' },
  { id: 'mel', nome: 'Mel puro', categoria: 'Açúcares & Mel', preco: 38.00, quantidade: 500, unidade: 'g', obs: 'Pote 500 g (Sulmel/Pró-Apis - Fort/SC)' },
  { id: 'choc-po-50', nome: 'Chocolate em pó 50%', categoria: 'Chocolates & Cacau', preco: 36.00, quantidade: 500, unidade: 'g', obs: 'Pct 500 g (Sicao/Melken/Mavalério)' },
  { id: 'cacau-100', nome: 'Cacau em pó 100%', categoria: 'Chocolates & Cacau', preco: 45.00, quantidade: 200, unidade: 'g', obs: 'Pct 200 g (Garoto/Melken - Fort/SC)' },
  { id: 'choc-nobre', nome: 'Chocolate nobre Divine / barra', categoria: 'Chocolates & Cacau', preco: 55.00, quantidade: 500, unidade: 'g', obs: 'Barra 500 g (Divine / Harald Melken)' },
  { id: 'cobertura-frac', nome: 'Cobertura fracionada', categoria: 'Chocolates & Cacau', preco: 45.00, quantidade: 1000, unidade: 'g', obs: 'Barra 1 kg (Harald Top/Mavalério - Fort/SC)' },
  { id: 'leite-moca-lata', nome: 'Leite Moça Lata (p/ Doce de Leite)', categoria: 'Laticínios', preco: 12.50, quantidade: 395, unidade: 'g', obs: 'Lata 395 g integral (Fort/Bistek/Giassi SC)' },
  { id: 'farinha', nome: 'Farinha de trigo', categoria: 'Secos & Farinhas', preco: 6.00, quantidade: 1000, unidade: 'g', obs: 'Pct 1 kg (Dona Benta/Orquídea - Fort/SC)' },
  { id: 'acucar-refinado', nome: 'Açúcar refinado', categoria: 'Açúcares & Mel', preco: 4.50, quantidade: 1000, unidade: 'g', obs: 'Pct 1 kg (União/Caravelas - Fort/SC)' },
  { id: 'acucar-mascavo', nome: 'Açúcar mascavo', categoria: 'Açúcares & Mel', preco: 12.00, quantidade: 500, unidade: 'g', obs: 'Pct 500 g (DaColônia/Jasmine - SC)' },
  { id: 'manteiga', nome: 'Manteiga sem sal', categoria: 'Laticínios', preco: 13.50, quantidade: 200, unidade: 'g', obs: 'Tablete 200 g (Tirol/Aviação - Fort/SC)' },
  { id: 'margarina', nome: 'Margarina', categoria: 'Gorduras & Ovos', preco: 11.00, quantidade: 500, unidade: 'g', obs: 'Pote 500 g 80% lip. (Qualy - Fort/SC)' },
  { id: 'ovos', nome: 'Ovos', categoria: 'Gorduras & Ovos', preco: 16.00, quantidade: 20, unidade: 'un', obs: 'Bandeja 20 un (Mantiqueira/Lembeck - Fort/SC)' },
  { id: 'amido', nome: 'Amido de milho', categoria: 'Secos & Farinhas', preco: 7.00, quantidade: 200, unidade: 'g', obs: 'Cx 200 g (Maizena - Fort/SC)' },
  { id: 'casquinha', nome: 'Casquinha de sorvete', categoria: 'Biscoitos & Casquinhas', preco: 11.50, quantidade: 10, unidade: 'un', obs: 'Prop. 10 un (Marvi Doce/Wafer)' },
  { id: 'cafe-soluvel', nome: 'Café solúvel', categoria: 'Especiarias & Fermentos', preco: 30.00, quantidade: 100, unidade: 'g', obs: 'Vidro/Refil 100 g (Nescafé/3 Corações - SC)' },
  { id: 'canela', nome: 'Canela em pó', categoria: 'Especiarias & Fermentos', preco: 10.50, quantidade: 50, unidade: 'g', obs: 'Pct 50 g (Kitano/Quero - Fort/SC)' },
  { id: 'cravo', nome: 'Cravo-da-índia', categoria: 'Especiarias & Fermentos', preco: 21.00, quantidade: 40, unidade: 'g', obs: 'Pct 40 g (Kitano - Fort/SC)' },
  { id: 'noz-moscada', nome: 'Noz-moscada', categoria: 'Especiarias & Fermentos', preco: 9.50, quantidade: 20, unidade: 'g', obs: '20 g (Hikari/Marpa/Kitano - SC)' },
  { id: 'bicarbonato', nome: 'Bicarbonato de sódio', categoria: 'Especiarias & Fermentos', preco: 7.00, quantidade: 100, unidade: 'g', obs: 'Pct 100 g (Tell/Kitano - Delivery Fort)' },
  { id: 'fermento', nome: 'Fermento químico', categoria: 'Especiarias & Fermentos', preco: 6.00, quantidade: 100, unidade: 'g', obs: 'Pote 100 g (Royal/Dr. Oetker - Fort/SC)' },
  { id: 'emb-individual', nome: 'Embalagem individual + adesivo', categoria: 'Embalagens', preco: 0.75, quantidade: 1, unidade: 'un', obs: 'Saquinho PP/celofane + adesivo c/ frete' },
  { id: 'emb-familia', nome: 'Caixa/Embalagem tamanho família/gigante', categoria: 'Embalagens', preco: 7.50, quantidade: 1, unidade: 'un', obs: 'Caixa kraft c/ visor 20-25 cm + frete' },
  { id: 'granulado-gourmet', nome: 'Granulado gourmet', categoria: 'Chocolates & Cacau', preco: 30.00, quantidade: 500, unidade: 'g', obs: 'Pct 500 g (Dori/Mavalério; Melken 400g ~R$46)' },
  { id: 'baunilha', nome: 'Essência de baunilha', categoria: 'Especiarias & Fermentos', preco: 8.00, quantidade: 30, unidade: 'ml', obs: 'Frasco 30 ml (Arcólor/Mix/Dr. Oetker)' },
];

export const DEFAULT_EQUIPMENTS = [
  { id: 'eq-1', nome: 'Batedeira Planetária / Mixer', valor: 480.00, jaPago: false },
  { id: 'eq-2', nome: 'Balança Digital de Precisão (1 g)', valor: 45.00, jaPago: false },
  { id: 'eq-3', nome: 'Formas (Pão de Mel, Brownie, Assadeiras)', valor: 180.00, jaPago: false },
  { id: 'eq-4', nome: 'Espátulas de silicone, Bowls e Termômetro', valor: 120.00, jaPago: false },
  { id: 'eq-5', nome: 'Adesivos personalizados & Carimbo', valor: 95.00, jaPago: false },
  { id: 'eq-6', nome: 'Reserva MEI / Taxas iniciais', valor: 75.00, jaPago: false },
];

export const DEFAULT_ALREADY_SPENT = [
  { id: 'gasto-testes', nome: 'Ingredientes e testes para validar receitas', valor: 350.00 },
  { id: 'gasto-dominio', nome: 'Registro do domínio do site (anasbakery.com.br)', valor: 40.00 },
];

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

export function ceilToHalfReal(val) {
  return Math.ceil(Number(val) * 2) / 2;
}

export function getIngredientUnitCost(ingredient) {
  if (!ingredient || !ingredient.quantidade || ingredient.quantidade <= 0) return 0;
  return Number(ingredient.preco || 0) / Number(ingredient.quantidade);
}

export function calculateRecipeCost(recipeId, state, visited = new Set()) {
  if (visited.has(recipeId)) {
    return {
      custoInsumosDiretos: 0,
      custoEmbalagens: 0,
      custoSubreceitas: 0,
      custoIndiretos: 0,
      custoTotal: 0,
      custoUnitario: 0,
      breakdown: [],
    };
  }
  visited.add(recipeId);

  const recipe = (state.recipes || []).find((r) => r.id === recipeId);
  if (!recipe) {
    return {
      custoInsumosDiretos: 0,
      custoEmbalagens: 0,
      custoSubreceitas: 0,
      custoIndiretos: 0,
      custoTotal: 0,
      custoUnitario: 0,
      breakdown: [],
    };
  }

  let custoInsumosDiretos = 0;
  let custoEmbalagens = 0;
  let custoSubreceitas = 0;
  const breakdown = [];

  for (const item of recipe.itens || []) {
    if (item.tipo === 'insumo') {
      const ing = (state.ingredients || []).find((i) => i.id === item.refId);
      if (!ing) continue;
      const unitCost = getIngredientUnitCost(ing);
      const cost = unitCost * Number(item.quantidade || 0);
      const isEmbalagem = ing.categoria === 'Embalagens';
      if (isEmbalagem) custoEmbalagens += cost;
      else custoInsumosDiretos += cost;
      breakdown.push({
        tipo: 'insumo',
        refId: ing.id,
        nome: ing.nome,
        quantidade: Number(item.quantidade || 0),
        unidade: ing.unidade,
        custoUnitario: unitCost,
        custoTotal: cost,
        isEmbalagem,
      });
    } else if (item.tipo === 'subreceita') {
      const sub = (state.recipes || []).find((r) => r.id === item.refId);
      if (!sub) continue;
      const subCalc = calculateRecipeCost(sub.id, state, new Set(visited));
      const cost = subCalc.custoUnitario * Number(item.quantidade || 0);
      custoSubreceitas += cost;
      breakdown.push({
        tipo: 'subreceita',
        refId: sub.id,
        nome: sub.nome,
        quantidade: Number(item.quantidade || 0),
        unidade: sub.unidadeRendimento || 'un',
        custoUnitario: subCalc.custoUnitario,
        custoTotal: cost,
        isEmbalagem: false,
      });
    }
  }

  const pct = Number(recipe.custosIndiretosPct || 0);
  const baseIndiretos = custoInsumosDiretos > 0 ? custoInsumosDiretos : (custoInsumosDiretos + custoSubreceitas);
  const custoIndiretos = baseIndiretos * (pct / 100);
  const custoTotal = custoInsumosDiretos + custoEmbalagens + custoSubreceitas + custoIndiretos;
  const rendimento = Math.max(0.0001, Number(recipe.rendimento || 1));
  const custoUnitario = custoTotal / rendimento;

  return {
    custoInsumosDiretos,
    custoEmbalagens,
    custoSubreceitas,
    custoIndiretos,
    custoTotal,
    custoUnitario,
    breakdown,
  };
}

export function calculateChannelPricing(custoUnitario, precoDireto, config = DEFAULT_CONFIG) {
  const taxaBasico = Number(config.taxaIfoodBasico || 0) / 100;
  const taxaEntrega = Number(config.taxaIfoodEntrega || 0) / 100;
  const margemMin = Number(config.margemMinima || 0);

  const lucroDireto = precoDireto - custoUnitario;
  const margemDiretaPct = precoDireto > 0 ? (lucroDireto / precoDireto) * 100 : 0;
  const roiUnitarioPct = custoUnitario > 0 ? (lucroDireto / custoUnitario) * 100 : 0;

  const precoIfoodBasico = taxaBasico < 1 ? precoDireto / (1 - taxaBasico) : precoDireto;
  const taxaBasicoRS = precoIfoodBasico * taxaBasico;
  const liquidoBasico = precoIfoodBasico - taxaBasicoRS;
  const lucroBasico = liquidoBasico - custoUnitario;

  const precoIfoodEntrega = taxaEntrega < 1 ? precoDireto / (1 - taxaEntrega) : precoDireto;
  const taxaEntregaRS = precoIfoodEntrega * taxaEntrega;
  const liquidoEntrega = precoIfoodEntrega - taxaEntregaRS;
  const lucroEntrega = liquidoEntrega - custoUnitario;

  const margemFrac = margemMin / 100;
  const precoMinimoRecomendado = margemFrac < 1 ? custoUnitario / (1 - margemFrac) : custoUnitario * 2;

  let status = 'saudavel';
  if (lucroDireto <= 0) status = 'prejuizo';
  else if (margemDiretaPct < margemMin) status = 'baixa';

  return {
    custoUnitario,
    precoDireto,
    lucroDireto,
    margemDiretaPct,
    roiUnitarioPct,
    precoMinimoRecomendado,
    status,
    ifoodBasico: { preco: precoIfoodBasico, taxaRS: taxaBasicoRS, liquido: liquidoBasico, lucro: lucroBasico },
    ifoodEntrega: { preco: precoIfoodEntrega, taxaRS: taxaEntregaRS, liquido: liquidoEntrega, lucro: lucroEntrega },
  };
}

export function calculateInternalOrder(order, state) {
  let custoItens = 0;
  let somaCatalogoDireto = 0;
  const itensDetalhados = [];

  for (const item of order.itens || []) {
    const rec = (state.recipes || []).find((r) => r.id === item.recipeId);
    if (!rec) continue;
    const qtd = Math.max(1, Number(item.quantidade || 1));
    const calc = calculateRecipeCost(rec.id, state);
    const subCusto = calc.custoUnitario * qtd;
    const subCatalogo = Number(rec.precoVendaDireta || 0) * qtd;
    custoItens += subCusto;
    somaCatalogoDireto += subCatalogo;
    itensDetalhados.push({
      recipeId: rec.id,
      nome: rec.nome,
      quantidade: qtd,
      custoUnitario: calc.custoUnitario,
      custoSubtotal: subCusto,
      precoCatalogoUnit: Number(rec.precoVendaDireta || 0),
    });
  }

  const custoExtra = Math.max(0, Number(order.custoExtra || 0));
  const custoTotal = custoItens + custoExtra;
  const margemMin = Number(state.config?.margemMinima || 35);
  const margemAlvoSaudavel = Math.min(80, Math.max(margemMin + 15, 50));
  const precoMinimoMeta = margemMin < 100 ? custoTotal / (1 - margemMin / 100) : custoTotal * 2;
  const precoSugeridoBruto = margemAlvoSaudavel < 100 ? custoTotal / (1 - margemAlvoSaudavel / 100) : custoTotal * 2;
  const precoSugeridoSaudavel = custoTotal > 0 ? Math.ceil(precoSugeridoBruto) : 0;

  const temPrecoCustom = order.precoCobrado !== null && order.precoCobrado !== undefined && order.precoCobrado !== '';
  const precoFinal = temPrecoCustom ? Math.max(0, Number(order.precoCobrado)) : precoSugeridoSaudavel;
  const lucroLiquido = precoFinal - custoTotal;
  const margemRealPct = precoFinal > 0 ? (lucroLiquido / precoFinal) * 100 : 0;
  const sinalPago = Math.max(0, Number(order.sinalPago || 0));
  const saldoReceber = Math.max(0, precoFinal - sinalPago);

  let statusMargem = 'saudavel';
  if (lucroLiquido <= 0) statusMargem = 'prejuizo';
  else if (margemRealPct < margemMin) statusMargem = 'baixa';

  return {
    itensDetalhados,
    custoItens,
    custoExtra,
    custoTotal,
    somaCatalogoDireto,
    precoMinimoMeta,
    precoSugeridoSaudavel,
    precoFinal,
    lucroLiquido,
    margemRealPct,
    sinalPago,
    saldoReceber,
    statusMargem,
  };
}

export function getNormalizedMix(mix) {
  const d = Number(mix?.direto ?? 60);
  const b = Number(mix?.basico ?? 25);
  const e = Number(mix?.entrega ?? 15);
  const sum = d + b + e;
  if (sum <= 0) return { direto: 100, basico: 0, entrega: 0 };
  return {
    direto: (d / sum) * 100,
    basico: (b / sum) * 100,
    entrega: (e / sum) * 100,
  };
}

export function calculateFinancialSnapshot(state) {
  const config = { ...DEFAULT_CONFIG, ...(state.config || {}) };
  const mix = getNormalizedMix(state.mix);
  const ingredientTotals = new Map();
  let totalUnidadesProduzidas = 0;
  let custoIndiretoTotal = 0;

  function accumulateRecipe(recipeId, factor) {
    const recipe = (state.recipes || []).find((r) => r.id === recipeId);
    if (!recipe) return;
    const calc = calculateRecipeCost(recipeId, state);
    custoIndiretoTotal += calc.custoIndiretos * factor;

    for (const item of recipe.itens || []) {
      if (item.tipo === 'insumo') {
        ingredientTotals.set(item.refId, (ingredientTotals.get(item.refId) || 0) + Number(item.quantidade || 0) * factor);
      } else if (item.tipo === 'subreceita') {
        const sub = (state.recipes || []).find((r) => r.id === item.refId);
        if (!sub || !sub.rendimento) continue;
        accumulateRecipe(sub.id, (Number(item.quantidade || 0) * factor) / Number(sub.rendimento));
      }
    }
  }

  const products = [];
  for (const recipe of state.recipes || []) {
    if (recipe.tipo !== 'produto') continue;
    const fornadas = Math.max(0, Number(recipe.fornadasPlanejadas || 0));
    const unidades = fornadas * Number(recipe.rendimento || 1);
    const calc = calculateRecipeCost(recipe.id, state);
    const pricing = calculateChannelPricing(calc.custoUnitario, Number(recipe.precoVendaDireta || 0), config);
    if (fornadas > 0) {
      accumulateRecipe(recipe.id, fornadas);
      totalUnidadesProduzidas += unidades;
    }
    products.push({
      id: recipe.id,
      nome: recipe.nome,
      rendimento: Number(recipe.rendimento || 1),
      fornadas,
      unidades,
      custoUnitario: round2(calc.custoUnitario),
      custoTotalLote: round2(calc.custoTotal * fornadas),
      precoDireto: round2(pricing.precoDireto),
      lucroDireto: round2(pricing.lucroDireto),
      margemDiretaPct: round2(pricing.margemDiretaPct),
      roiUnitarioPct: round2(pricing.roiUnitarioPct),
      precoMinimoRecomendado: round2(pricing.precoMinimoRecomendado),
      precoIfoodBasico: round2(pricing.ifoodBasico.preco),
      precoIfoodEntrega: round2(pricing.ifoodEntrega.preco),
      status: pricing.status,
    });
  }

  const shoppingList = [];
  let investimentoCompraFechada = 0;
  let custoProporcionalConsumido = 0;

  for (const ing of state.ingredients || []) {
    const needed = ingredientTotals.get(ing.id) || 0;
    if (needed <= 0) continue;
    const qty = Math.max(0.0001, Number(ing.quantidade || 1));
    const packs = Math.ceil(needed / qty);
    const custoCompra = packs * Number(ing.preco || 0);
    const custoConsumido = getIngredientUnitCost(ing) * needed;
    investimentoCompraFechada += custoCompra;
    custoProporcionalConsumido += custoConsumido;
    shoppingList.push({
      id: ing.id,
      nome: ing.nome,
      categoria: ing.categoria,
      unidade: ing.unidade,
      quantidadeEmb: qty,
      precoEmb: round2(ing.preco),
      needed: round2(needed),
      packs,
      custoCompra: round2(custoCompra),
      custoConsumido: round2(custoConsumido),
      bestStore: ing.aiMeta?.lastStore || null,
      productUrl: ing.aiMeta?.productUrl || null,
    });
  }
  shoppingList.sort((a, b) => b.custoCompra - a.custoCompra);

  const pctD = mix.direto / 100;
  const pctB = mix.basico / 100;
  const pctE = mix.entrega / 100;
  let receitaBrutaMix = 0;
  let taxasAppMix = 0;
  let custoProducaoTotal = 0;

  for (const recipe of state.recipes || []) {
    if (recipe.tipo !== 'produto') continue;
    const fornadas = Math.max(0, Number(recipe.fornadasPlanejadas || 0));
    const unidades = fornadas * Number(recipe.rendimento || 1);
    if (unidades <= 0) continue;
    const calc = calculateRecipeCost(recipe.id, state);
    const p = calculateChannelPricing(calc.custoUnitario, Number(recipe.precoVendaDireta || 0), config);
    receitaBrutaMix += unidades * (pctD * p.precoDireto + pctB * p.ifoodBasico.preco + pctE * p.ifoodEntrega.preco);
    taxasAppMix += unidades * (pctB * p.ifoodBasico.taxaRS + pctE * p.ifoodEntrega.taxaRS);
    custoProducaoTotal += calc.custoTotal * fornadas;
  }

  const lucroLiquidoMix = receitaBrutaMix - taxasAppMix - custoProducaoTotal;
  const alreadySpent = Array.isArray(state.alreadySpent) ? state.alreadySpent : DEFAULT_ALREADY_SPENT;
  const equipments = Array.isArray(state.equipments) ? state.equipments : DEFAULT_EQUIPMENTS;

  const totalJaGastoItens = alreadySpent.reduce((acc, i) => acc + Number(i?.valor || 0), 0);
  const totalEquipamentosPagos = equipments.filter((e) => e?.jaPago).reduce((acc, e) => acc + Number(e?.valor || 0), 0);
  const totalEquipamentosAComprar = equipments.filter((e) => e && !e.jaPago).reduce((acc, e) => acc + Number(e?.valor || 0), 0);
  const totalJaInvestido = totalJaGastoItens + totalEquipamentosPagos;
  const totalAComprarGeral = totalEquipamentosAComprar + investimentoCompraFechada;
  const investimentoTotalInicial = totalJaInvestido + totalAComprarGeral;

  const roiCicloComprasPct = investimentoCompraFechada > 0 ? (lucroLiquidoMix / investimentoCompraFechada) * 100 : 0;
  const roiProducaoPct = custoProducaoTotal > 0 ? (lucroLiquidoMix / custoProducaoTotal) * 100 : 0;
  const roiInvestimentoTotalCicloPct = investimentoTotalInicial > 0 ? (lucroLiquidoMix / investimentoTotalInicial) * 100 : 0;
  const ciclosPorAno = state.periodo === 'Mensal' ? 12 : 52;
  const roiAnualizadoPct = roiInvestimentoTotalCicloPct * ciclosPorAno;
  const paybackCiclos = lucroLiquidoMix > 0 ? investimentoTotalInicial / lucroLiquidoMix : null;
  const paybackAComprarCiclos = lucroLiquidoMix > 0 ? totalAComprarGeral / lucroLiquidoMix : null;

  const margemMediaPct = products.length
    ? products.reduce((acc, p) => acc + p.margemDiretaPct, 0) / products.length
    : 0;
  const lowMarginCount = products.filter((p) => p.status !== 'saudavel').length;
  const cestaBaseTotal = (state.ingredients || []).reduce((acc, i) => acc + Number(i?.preco || 0), 0);

  const pedidosAtivos = Array.isArray(state.internalOrders)
    ? state.internalOrders.filter((o) => o && o.status !== 'cancelado' && o.status !== 'orcamento')
    : [];
  let faturamentoRealPedidos = 0;
  let lucroRealPedidos = 0;
  for (const ped of pedidosAtivos) {
    const c = calculateInternalOrder(ped, state);
    faturamentoRealPedidos += c.precoFinal;
    lucroRealPedidos += c.lucroLiquido;
  }
  const roiRealJaInvestidoPct = totalJaInvestido > 0 ? (lucroRealPedidos / totalJaInvestido) * 100 : 0;

  return {
    periodo: state.periodo || 'Semanal',
    cestaBaseTotal: round2(cestaBaseTotal),
    investimentoCompraFechada: round2(investimentoCompraFechada),
    custoProporcionalConsumido: round2(custoProporcionalConsumido),
    custoIndiretoTotal: round2(custoIndiretoTotal),
    custoProducaoTotal: round2(custoProducaoTotal),
    totalUnidadesProduzidas: Math.round(totalUnidadesProduzidas),
    receitaBrutaMix: round2(receitaBrutaMix),
    taxasAppMix: round2(taxasAppMix),
    lucroLiquidoMix: round2(lucroLiquidoMix),
    totalJaInvestido: round2(totalJaInvestido),
    totalEquipamentosAComprar: round2(totalEquipamentosAComprar),
    totalAComprarGeral: round2(totalAComprarGeral),
    investimentoTotalInicial: round2(investimentoTotalInicial),
    margemMediaPct: round2(margemMediaPct),
    lowMarginCount,
    roiCicloComprasPct: round2(roiCicloComprasPct),
    roiProducaoPct: round2(roiProducaoPct),
    roiInvestimentoTotalCicloPct: round2(roiInvestimentoTotalCicloPct),
    roiAnualizadoPct: round2(roiAnualizadoPct),
    paybackCiclos: paybackCiclos !== null ? round2(paybackCiclos) : null,
    paybackAComprarCiclos: paybackAComprarCiclos !== null ? round2(paybackAComprarCiclos) : null,
    faturamentoRealPedidos: round2(faturamentoRealPedidos),
    lucroRealPedidos: round2(lucroRealPedidos),
    roiRealJaInvestidoPct: round2(roiRealJaInvestidoPct),
    products,
    shoppingList,
  };
}
