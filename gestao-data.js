/**
 * Ana's Bakery — Dados Iniciais & Motor de Cálculo Financeiro
 * Florianópolis / SC
 */

const STORAGE_KEY = 'anas_bakery_finance_v1';

const DEFAULT_CONFIG = {
  margemMinima: 35,          // % margem líquida mínima desejada
  taxaIfoodBasico: 15.2,     // % Plano Básico iFood
  taxaIfoodEntrega: 26.2,    // % Plano Entrega iFood
  custosIndiretosPadrao: 15, // % Gás, energia, água e perdas
};

const DEFAULT_INGREDIENTS = [
  { id: 'leite', nome: 'Leite integral', categoria: 'Laticínios', preco: 5.50, quantidade: 1000, unidade: 'ml', obs: 'Caixa 1 L (Tirol/Piracanjuba - Fort/SC)' },
  { id: 'leite-condensado', nome: 'Leite condensado', categoria: 'Laticínios', preco: 6.90, quantidade: 395, unidade: 'g', obs: 'Cx 395 g (Piracanjuba/Tirol - Fort/SC)' },
  { id: 'creme-de-leite', nome: 'Creme de leite', categoria: 'Laticínios', preco: 3.50, quantidade: 200, unidade: 'g', obs: 'Cx 200 g (Piracanjuba/Tirol - Fort/SC)' },
  { id: 'mel', nome: 'Mel puro', categoria: 'Açúcares & Mel', preco: 38.00, quantidade: 500, unidade: 'g', obs: 'Pote 500 g (Sulmel/Pró-Apis - Fort/SC)' },
  { id: 'choc-po-50', nome: 'Chocolate em pó 50%', categoria: 'Chocolates & Cacau', preco: 36.00, quantidade: 500, unidade: 'g', obs: 'Pct 500 g (Sicao/Melken/Mavalério)' },
  { id: 'cacau-100', nome: 'Cacau em pó 100%', categoria: 'Chocolates & Cacau', preco: 45.00, quantidade: 200, unidade: 'g', obs: 'Pct 200 g (Garoto/Melken - Fort/SC)' },
  { id: 'choc-nobre', nome: 'Chocolate nobre barra / gotas', categoria: 'Chocolates & Cacau', preco: 55.00, quantidade: 500, unidade: 'g', obs: 'Barra 500 g (Harald Melken/Sicao)' },
  { id: 'cobertura-frac', nome: 'Cobertura fracionada', categoria: 'Chocolates & Cacau', preco: 45.00, quantidade: 1000, unidade: 'g', obs: 'Barra 1 kg (Harald Top/Mavalério - Fort/SC)' },
  { id: 'doce-leite', nome: 'Doce de leite pastoso', categoria: 'Laticínios', preco: 38.00, quantidade: 1000, unidade: 'g', obs: '1 kg (Itambé/Frimesa/Tirol - SC)' },
  { id: 'farinha', nome: 'Farinha de trigo', categoria: 'Secos & Farinhas', preco: 6.00, quantidade: 1000, unidade: 'g', obs: 'Pct 1 kg (Dona Benta/Orquídea - Fort/SC)' },
  { id: 'acucar-refinado', nome: 'Açúcar refinado', categoria: 'Açúcares & Mel', preco: 4.50, quantidade: 1000, unidade: 'g', obs: 'Pct 1 kg (União/Caravelas - Fort/SC)' },
  { id: 'acucar-mascavo', nome: 'Açúcar mascavo', categoria: 'Açúcares & Mel', preco: 12.00, quantidade: 500, unidade: 'g', obs: 'Pct 500 g (DaColônia/Jasmine - SC)' },
  { id: 'manteiga', nome: 'Manteiga sem sal', categoria: 'Laticínios', preco: 13.50, quantidade: 200, unidade: 'g', obs: 'Tablete 200 g (Tirol/Aviação - Fort/SC)' },
  { id: 'margarina', nome: 'Margarina', categoria: 'Gorduras & Ovos', preco: 11.00, quantidade: 500, unidade: 'g', obs: 'Pote 500 g 80% lip. (Qualy - Fort/SC)' },
  { id: 'ovos', nome: 'Ovos', categoria: 'Gorduras & Ovos', preco: 16.00, quantidade: 20, unidade: 'un', obs: 'Bandeja 20 un (Mantiqueira/Lembeck - Fort/SC)' },
  { id: 'amido', nome: 'Amido de milho', categoria: 'Secos & Farinhas', preco: 7.00, quantidade: 200, unidade: 'g', obs: 'Cx 200 g (Maizena - Fort/SC)' },
  { id: 'bolacha-maria', nome: 'Bolacha Maria/Maisena', categoria: 'Biscoitos & Casquinhas', preco: 8.50, quantidade: 45, unidade: 'un', obs: 'Pct 350 g ~45 un (Isabela/Marilan - SC)' },
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

const DEFAULT_RECIPES = [
  // SUB-RECEITAS
  {
    id: 'sub-massa-pao-mel',
    nome: 'Massa Pão de Mel',
    tipo: 'subreceita',
    rendimento: 16,
    unidadeRendimento: 'porções',
    pesoReferencia: '16 porções (~1.340 g)',
    custosIndiretosPct: 15,
    itens: [
      { tipo: 'insumo', refId: 'leite', quantidade: 480 },
      { tipo: 'insumo', refId: 'cravo', quantidade: 1.5 },
      { tipo: 'insumo', refId: 'choc-po-50', quantidade: 100 },
      { tipo: 'insumo', refId: 'mel', quantidade: 200 },
      { tipo: 'insumo', refId: 'bicarbonato', quantidade: 8 },
      { tipo: 'insumo', refId: 'noz-moscada', quantidade: 2 },
      { tipo: 'insumo', refId: 'canela', quantidade: 8 },
      { tipo: 'insumo', refId: 'farinha', quantidade: 360 },
      { tipo: 'insumo', refId: 'acucar-refinado', quantidade: 180 },
      { tipo: 'insumo', refId: 'fermento', quantidade: 4 },
    ],
  },
  {
    id: 'sub-brigadeiro-cafe',
    nome: 'Recheio Brigadeiro de Café',
    tipo: 'subreceita',
    rendimento: 820,
    unidadeRendimento: 'g',
    pesoReferencia: '~820 g líquidos',
    custosIndiretosPct: 15,
    itens: [
      { tipo: 'insumo', refId: 'leite-condensado', quantidade: 790 },
      { tipo: 'insumo', refId: 'creme-de-leite', quantidade: 200 },
      { tipo: 'insumo', refId: 'margarina', quantidade: 5 },
      { tipo: 'insumo', refId: 'cafe-soluvel', quantidade: 4 },
    ],
  },

  // PRODUTOS FINAIS
  {
    id: 'prod-pao-mel-ind',
    nome: 'Pão de Mel Individual (Sem Cobertura)',
    tipo: 'produto',
    rendimento: 1,
    unidadeRendimento: 'un',
    pesoReferencia: '~130 g / un',
    custosIndiretosPct: 0, // Massa e recheio já incluem +15% de cozimento
    precoVendaDireta: 10.00,
    fornadasPlanejadas: 32,
    itens: [
      { tipo: 'subreceita', refId: 'sub-massa-pao-mel', quantidade: 1 },
      { tipo: 'subreceita', refId: 'sub-brigadeiro-cafe', quantidade: 25 },
      { tipo: 'insumo', refId: 'doce-leite', quantidade: 20 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 1 },
    ],
  },
  {
    id: 'prod-pao-mel-gigante',
    nome: 'Pão de Mel Gigante / Família (~8 porções)',
    tipo: 'produto',
    rendimento: 1,
    unidadeRendimento: 'un',
    pesoReferencia: '~1.030 g / caixa',
    custosIndiretosPct: 0,
    precoVendaDireta: 65.00,
    fornadasPlanejadas: 4,
    itens: [
      { tipo: 'subreceita', refId: 'sub-massa-pao-mel', quantidade: 8 },
      { tipo: 'subreceita', refId: 'sub-brigadeiro-cafe', quantidade: 200 },
      { tipo: 'insumo', refId: 'doce-leite', quantidade: 160 },
      { tipo: 'insumo', refId: 'emb-familia', quantidade: 1 },
    ],
  },
  {
    id: 'prod-brigadeiro-gourmet',
    nome: 'Brigadeiro Gourmet (20 g)',
    tipo: 'produto',
    rendimento: 20,
    unidadeRendimento: 'un',
    pesoReferencia: '20 g / un (20 un)',
    custosIndiretosPct: 15,
    precoVendaDireta: 4.50,
    fornadasPlanejadas: 3,
    itens: [
      { tipo: 'insumo', refId: 'leite-condensado', quantidade: 395 },
      { tipo: 'insumo', refId: 'creme-de-leite', quantidade: 100 },
      { tipo: 'insumo', refId: 'cacau-100', quantidade: 25 },
      { tipo: 'insumo', refId: 'manteiga', quantidade: 15 },
      { tipo: 'insumo', refId: 'granulado-gourmet', quantidade: 80 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 20 },
    ],
  },
  {
    id: 'prod-alfajor',
    nome: 'Alfajor Artesanal (65 g)',
    tipo: 'produto',
    rendimento: 15,
    unidadeRendimento: 'un',
    pesoReferencia: '65 g / un (15 un)',
    custosIndiretosPct: 15,
    precoVendaDireta: 8.50,
    fornadasPlanejadas: 2,
    itens: [
      { tipo: 'insumo', refId: 'bolacha-maria', quantidade: 30 },
      { tipo: 'insumo', refId: 'doce-leite', quantidade: 400 },
      { tipo: 'insumo', refId: 'cobertura-frac', quantidade: 350 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 15 },
    ],
  },
  {
    id: 'prod-cone-trufado',
    nome: 'Cone Recheado Trufado (110 g)',
    tipo: 'produto',
    rendimento: 10,
    unidadeRendimento: 'un',
    pesoReferencia: '110 g / un (10 un)',
    custosIndiretosPct: 15,
    precoVendaDireta: 14.00,
    fornadasPlanejadas: 3,
    itens: [
      { tipo: 'insumo', refId: 'casquinha', quantidade: 10 },
      { tipo: 'insumo', refId: 'cobertura-frac', quantidade: 250 },
      { tipo: 'insumo', refId: 'leite-condensado', quantidade: 395 },
      { tipo: 'insumo', refId: 'creme-de-leite', quantidade: 200 },
      { tipo: 'insumo', refId: 'choc-nobre', quantidade: 80 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 10 },
    ],
  },
  {
    id: 'prod-cookie-ny',
    nome: 'Cookie NY Style (90 g)',
    tipo: 'produto',
    rendimento: 10,
    unidadeRendimento: 'un',
    pesoReferencia: '90 g / un (10 un)',
    custosIndiretosPct: 15,
    precoVendaDireta: 14.00,
    fornadasPlanejadas: 4,
    itens: [
      { tipo: 'insumo', refId: 'manteiga', quantidade: 150 },
      { tipo: 'insumo', refId: 'acucar-mascavo', quantidade: 150 },
      { tipo: 'insumo', refId: 'acucar-refinado', quantidade: 80 },
      { tipo: 'insumo', refId: 'ovos', quantidade: 1 },
      { tipo: 'insumo', refId: 'farinha', quantidade: 280 },
      { tipo: 'insumo', refId: 'choc-nobre', quantidade: 250 },
      { tipo: 'insumo', refId: 'fermento', quantidade: 5 },
      { tipo: 'insumo', refId: 'baunilha', quantidade: 5 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 10 },
    ],
  },
  {
    id: 'prod-brownie-fudgy',
    nome: 'Brownie Fudgy (80 g)',
    tipo: 'produto',
    rendimento: 12,
    unidadeRendimento: 'un',
    pesoReferencia: '80 g / un (12 un)',
    custosIndiretosPct: 15,
    precoVendaDireta: 12.00,
    fornadasPlanejadas: 3,
    itens: [
      { tipo: 'insumo', refId: 'choc-nobre', quantidade: 250 },
      { tipo: 'insumo', refId: 'manteiga', quantidade: 150 },
      { tipo: 'insumo', refId: 'ovos', quantidade: 3 },
      { tipo: 'insumo', refId: 'acucar-refinado', quantidade: 200 },
      { tipo: 'insumo', refId: 'farinha', quantidade: 100 },
      { tipo: 'insumo', refId: 'cacau-100', quantidade: 30 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 12 },
    ],
  },
];

const DEFAULT_EQUIPMENTS = [
  { id: 'eq-1', nome: 'Batedeira Planetária / Mixer', valor: 480.00, jaPago: false },
  { id: 'eq-2', nome: 'Balança Digital de Precisão (1 g)', valor: 45.00, jaPago: false },
  { id: 'eq-3', nome: 'Formas (Pão de Mel, Brownie, Assadeiras)', valor: 180.00, jaPago: false },
  { id: 'eq-4', nome: 'Espátulas de silicone, Bowls e Termômetro', valor: 120.00, jaPago: false },
  { id: 'eq-5', nome: 'Adesivos personalizados & Carimbo', valor: 95.00, jaPago: false },
  { id: 'eq-6', nome: 'Reserva MEI / Taxas iniciais', valor: 75.00, jaPago: false },
];

const DEFAULT_ALREADY_SPENT = [
  { id: 'gasto-testes', nome: 'Ingredientes e testes para validar receitas', valor: 350.00 },
  { id: 'gasto-dominio', nome: 'Registro do domínio do site (anasbakery.com.br)', valor: 40.00 },
];

const DEFAULT_COMBO = {
  nome: 'Caixa Degustação Ana\'s Bakery',
  descontoPct: 5,
  incluirEmbalagemFamilia: true,
  itens: [
    { recipeId: 'prod-cookie-ny', quantidade: 1 },
    { recipeId: 'prod-cone-trufado', quantidade: 1 },
    { recipeId: 'prod-brigadeiro-gourmet', quantidade: 2 },
  ],
};

// ======================== FUNÇÕES DE FORMATAÇÃO ========================

function formatNum(value, decimals = 2) {
  const num = Number.isFinite(value) ? value : 0;
  const dec = Math.max(0, Math.min(20, Math.trunc(Number.isFinite(decimals) ? decimals : 2)));
  const fixed = Math.abs(num).toFixed(dec);
  const isNeg = num < 0 && Number(fixed) !== 0;
  const [intPart, decPart] = fixed.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = dec > 0 ? `${intFormatted},${decPart}` : intFormatted;
  return isNeg ? `-${formatted}` : formatted;
}

function formatBRL(value, decimals = 2) {
  const num = Number.isFinite(value) ? value : 0;
  const dec = Math.max(0, Math.min(20, Math.trunc(Number.isFinite(decimals) ? decimals : 2)));
  const fixed = Math.abs(num).toFixed(dec);
  const isNeg = num < 0 && Number(fixed) !== 0;
  const formatted = formatNum(Math.abs(num), dec);
  return `${isNeg ? '-' : ''}R$ ${formatted}`;
}

// ======================== MOTOR DE CÁLCULO ========================

function getIngredientUnitCost(ingredient) {
  if (!ingredient || !ingredient.quantidade || ingredient.quantidade <= 0) return 0;
  return ingredient.preco / ingredient.quantidade;
}

/**
 * Calcula o custo detalhado de uma receita (sub-receita ou produto final).
 * Usa memoização e proteção contra ciclos.
 */
function calculateRecipeCost(recipeId, state, visited = new Set()) {
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

  const recipe = state.recipes.find((r) => r.id === recipeId);
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

  for (const item of recipe.itens) {
    if (item.tipo === 'insumo') {
      const ing = state.ingredients.find((i) => i.id === item.refId);
      if (!ing) continue;
      const unitCost = getIngredientUnitCost(ing);
      const cost = unitCost * item.quantidade;
      const isEmbalagem = ing.categoria === 'Embalagens';
      if (isEmbalagem) {
        custoEmbalagens += cost;
      } else {
        custoInsumosDiretos += cost;
      }
      breakdown.push({
        tipo: 'insumo',
        nome: ing.nome,
        quantidade: item.quantidade,
        unidade: ing.unidade,
        custoUnitario: unitCost,
        custoTotal: cost,
        isEmbalagem,
      });
    } else if (item.tipo === 'subreceita') {
      const sub = state.recipes.find((r) => r.id === item.refId);
      if (!sub) continue;
      const subCalc = calculateRecipeCost(sub.id, state, new Set(visited));
      const cost = subCalc.custoUnitario * item.quantidade;
      custoSubreceitas += cost;
      breakdown.push({
        tipo: 'subreceita',
        nome: sub.nome,
        quantidade: item.quantidade,
        unidade: sub.unidadeRendimento || 'un',
        custoUnitario: subCalc.custoUnitario,
        custoTotal: cost,
        isEmbalagem: false,
      });
    }
  }

  // Custos indiretos (Gás, Energia, Água e Perdas) incidem sobre o preparo direto (insumos diretos sem embalagem,
  // ou caso não haja insumos diretos, sobre o subtotal se configurado)
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

/**
 * Calcula precificação multi-canal para um produto final.
 */
function calculateChannelPricing(custoUnitario, precoDireto, config) {
  const taxaBasico = Number(config.taxaIfoodBasico || 0) / 100;
  const taxaEntrega = Number(config.taxaIfoodEntrega || 0) / 100;
  const margemMin = Number(config.margemMinima || 0);

  const lucroDireto = precoDireto - custoUnitario;
  const margemDiretaPct = precoDireto > 0 ? (lucroDireto / precoDireto) * 100 : 0;

  // Preço no iFood para receber exatamente o mesmo líquido da venda direta:
  // precoIfood * (1 - taxa) = precoDireto  =>  precoIfood = precoDireto / (1 - taxa)
  const precoIfoodBasico = taxaBasico < 1 ? precoDireto / (1 - taxaBasico) : precoDireto;
  const taxaBasicoRS = precoIfoodBasico * taxaBasico;
  const liquidoBasico = precoIfoodBasico - taxaBasicoRS;
  const lucroBasico = liquidoBasico - custoUnitario;

  const precoIfoodEntrega = taxaEntrega < 1 ? precoDireto / (1 - taxaEntrega) : precoDireto;
  const taxaEntregaRS = precoIfoodEntrega * taxaEntrega;
  const liquidoEntrega = precoIfoodEntrega - taxaEntregaRS;
  const lucroEntrega = liquidoEntrega - custoUnitario;

  // Preço mínimo sugerido para atingir a margem mínima desejada:
  // (preco - custo) / preco = margemMin/100  =>  preco = custo / (1 - margemMin/100)
  const margemFrac = margemMin / 100;
  const precoMinimoRecomendado = margemFrac < 1 ? custoUnitario / (1 - margemFrac) : custoUnitario * 2;

  let status = 'saudavel';
  if (lucroDireto <= 0) {
    status = 'prejuizo';
  } else if (margemDiretaPct < margemMin) {
    status = 'baixa';
  }

  return {
    custoUnitario,
    precoDireto,
    lucroDireto,
    margemDiretaPct,
    precoMinimoRecomendado,
    status,
    ifoodBasico: {
      preco: precoIfoodBasico,
      taxaRS: taxaBasicoRS,
      liquido: liquidoBasico,
      lucro: lucroBasico,
    },
    ifoodEntrega: {
      preco: precoIfoodEntrega,
      taxaRS: taxaEntregaRS,
      liquido: liquidoEntrega,
      lucro: lucroEntrega,
    },
  };
}

/**
 * Explode todas as fornadas planejadas em uma lista de compras agrupada por insumo.
 */
function calculateShoppingListAndProjection(state, mix) {
  const ingredientTotals = new Map(); // refId -> quantidade total necessária
  let totalUnidadesProduzidas = 0;
  let custoIndiretoTotal = 0;
  let receitaBrutaDireta100 = 0;

  function accumulateRecipe(recipeId, factor) {
    const recipe = state.recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const calc = calculateRecipeCost(recipeId, state);
    custoIndiretoTotal += calc.custoIndiretos * factor;

    for (const item of recipe.itens) {
      if (item.tipo === 'insumo') {
        const prev = ingredientTotals.get(item.refId) || 0;
        ingredientTotals.set(item.refId, prev + item.quantidade * factor);
      } else if (item.tipo === 'subreceita') {
        const sub = state.recipes.find((r) => r.id === item.refId);
        if (!sub || !sub.rendimento) continue;
        const subFactor = (item.quantidade * factor) / sub.rendimento;
        accumulateRecipe(sub.id, subFactor);
      }
    }
  }

  const productSummaries = [];

  for (const recipe of state.recipes) {
    if (recipe.tipo !== 'produto') continue;
    const fornadas = Math.max(0, Number(recipe.fornadasPlanejadas || 0));
    const unidades = fornadas * Number(recipe.rendimento || 1);
    const calc = calculateRecipeCost(recipe.id, state);
    const pricing = calculateChannelPricing(calc.custoUnitario, Number(recipe.precoVendaDireta || 0), state.config);

    if (fornadas > 0) {
      accumulateRecipe(recipe.id, fornadas);
      totalUnidadesProduzidas += unidades;
      receitaBrutaDireta100 += unidades * pricing.precoDireto;
    }

    productSummaries.push({
      recipe,
      fornadas,
      unidades,
      custoUnitario: calc.custoUnitario,
      custoTotalLote: calc.custoTotal * fornadas,
      pricing,
    });
  }

  // Consolida lista de compras
  const shoppingList = [];
  let investimentoCompraFechada = 0;
  let custoProporcionalConsumido = 0;

  for (const ing of state.ingredients) {
    const needed = ingredientTotals.get(ing.id) || 0;
    if (needed <= 0) continue;
    const packs = Math.ceil(needed / ing.quantidade);
    const custoCompra = packs * ing.preco;
    const custoConsumido = getIngredientUnitCost(ing) * needed;
    investimentoCompraFechada += custoCompra;
    custoProporcionalConsumido += custoConsumido;

    shoppingList.push({
      ingredient: ing,
      needed,
      packs,
      custoCompra,
      custoConsumido,
      sobra: packs * ing.quantidade - needed,
    });
  }

  shoppingList.sort((a, b) => b.custoCompra - a.custoCompra);

  // Projeção com Mix de Canais (pctDireto, pctBasico, pctEntrega)
  const safeMix = mix || {};
  const pctD = (safeMix.direto || 0) / 100;
  const pctB = (safeMix.basico || 0) / 100;
  const pctE = (safeMix.entrega || 0) / 100;

  let receitaBrutaMix = 0;
  let taxasAppMix = 0;
  let custoProducaoTotal = 0;

  for (const p of productSummaries) {
    if (p.unidades <= 0) continue;
    const uD = p.unidades * pctD;
    const uB = p.unidades * pctB;
    const uE = p.unidades * pctE;

    const revD = uD * p.pricing.precoDireto;
    const revB = uB * p.pricing.ifoodBasico.preco;
    const revE = uE * p.pricing.ifoodEntrega.preco;

    receitaBrutaMix += revD + revB + revE;
    taxasAppMix += uB * p.pricing.ifoodBasico.taxaRS + uE * p.pricing.ifoodEntrega.taxaRS;
    custoProducaoTotal += p.custoTotalLote;
  }

  const lucroLiquidoMix = receitaBrutaMix - taxasAppMix - custoProducaoTotal;

  // Já Investido vs O que Temos que Comprar e Break-even
  const alreadySpent = Array.isArray(state.alreadySpent) ? state.alreadySpent : [];
  const equipments = Array.isArray(state.equipments) ? state.equipments : [];

  const totalJaGastoItens = alreadySpent.reduce((acc, item) => acc + Number((item && item.valor) || 0), 0);
  const totalEquipamentosPagos = equipments
    .filter((eq) => eq && eq.jaPago === true)
    .reduce((acc, eq) => acc + Number(eq.valor || 0), 0);
  const totalEquipamentosAComprar = equipments
    .filter((eq) => eq && !eq.jaPago)
    .reduce((acc, eq) => acc + Number(eq.valor || 0), 0);

  const totalJaInvestido = totalJaGastoItens + totalEquipamentosPagos;
  const totalAComprarGeral = totalEquipamentosAComprar + investimentoCompraFechada;
  const totalEquipamentos = totalEquipamentosPagos + totalEquipamentosAComprar;
  const investimentoTotalInicial = totalJaInvestido + totalAComprarGeral;

  // Margem de contribuição média ponderada por unidade vendida no mix atual
  const lucroMedioPorUnidade = totalUnidadesProduzidas > 0 ? lucroLiquidoMix / totalUnidadesProduzidas : 0;

  return {
    shoppingList,
    investimentoCompraFechada,
    custoProporcionalConsumido,
    custoIndiretoTotal,
    custoProducaoTotal,
    totalUnidadesProduzidas,
    receitaBrutaMix,
    taxasAppMix,
    lucroLiquidoMix,
    totalJaGastoItens,
    totalEquipamentosPagos,
    totalEquipamentosAComprar,
    totalJaInvestido,
    totalAComprarGeral,
    totalEquipamentos,
    investimentoTotalInicial,
    lucroMedioPorUnidade,
    productSummaries,
  };
}

const DEFAULT_INTERNAL_ORDERS = [
  {
    id: 'ped-pao-mel-gigante-1',
    cliente: 'Cliente Presencial — Pedido #01',
    contato: 'Presencial',
    dataEntrega: '',
    status: 'orcamento',
    itens: [
      { recipeId: 'prod-pao-mel-gigante', quantidade: 1 },
    ],
    custoExtra: 0,
    precoCobrado: null,
    sinalPago: 0,
    observacoes: 'Encomenda presencial de Pão de Mel Gigante (~8 porções). Sem taxa de aplicativo.',
  },
];

/**
 * Calcula custos, preço mínimo, preço sugerido saudável e lucro real de um pedido interno presencial.
 */
function calculateInternalOrder(order, state) {
  let custoItens = 0;
  let somaCatalogoDireto = 0;
  const itensDetalhados = [];

  for (const item of (order.itens || [])) {
    const rec = state.recipes.find((r) => r.id === item.recipeId);
    if (!rec) continue;
    const qtd = Math.max(1, Number(item.quantidade || 1));
    const calc = calculateRecipeCost(rec.id, state);
    const subCusto = calc.custoUnitario * qtd;
    const subCatalogo = Number(rec.precoVendaDireta || 0) * qtd;
    custoItens += subCusto;
    somaCatalogoDireto += subCatalogo;
    itensDetalhados.push({
      recipe: rec,
      quantidade: qtd,
      custoUnitario: calc.custoUnitario,
      custoSubtotal: subCusto,
      precoCatalogoUnit: Number(rec.precoVendaDireta || 0),
    });
  }

  const custoExtra = Math.max(0, Number(order.custoExtra || 0));
  const custoTotal = custoItens + custoExtra;

  const margemMin = Number(state.config.margemMinima || 35);
  const margemAlvoSaudavel = Math.min(80, Math.max(margemMin + 15, 50)); // Ex: 50% margem saudável em encomenda presencial
  const margemMinFrac = margemMin / 100;
  const margemAlvoFrac = margemAlvoSaudavel / 100;

  const precoMinimoMeta = margemMinFrac < 1 ? custoTotal / (1 - margemMinFrac) : custoTotal * 2;
  const precoSugeridoBruto = margemAlvoFrac < 1 ? custoTotal / (1 - margemAlvoFrac) : custoTotal * 2;
  // Arredonda para cima no próximo múltiplo de R$ 1,00 (comercial limpo) garantindo >= margemAlvoSaudavel
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
    margemMin,
    margemAlvoSaudavel,
    precoMinimoMeta,
    precoSugeridoSaudavel,
    precoFinal,
    temPrecoCustom,
    lucroLiquido,
    margemRealPct,
    sinalPago,
    saldoReceber,
    statusMargem,
  };
}
