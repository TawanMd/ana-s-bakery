/**
 * Ana's Bakery — Coletor de Preços ao Vivo (Florianópolis/SC & Confeitaria BR)
 * Consulta catálogos públicos VTEX em tempo real (Giassi SC, Bistek SC,
 * Angeloni SC, Atacadão e Loja Santo Antônio Confeitaria).
 */

export const MARKET_STORES = [
  {
    id: 'giassi',
    name: 'Giassi SC',
    region: 'Florianópolis / SC',
    baseUrl: 'https://www.giassi.com.br',
    specialty: 'supermercado',
  },
  {
    id: 'bistek',
    name: 'Bistek SC',
    region: 'Florianópolis / SC',
    baseUrl: 'https://www.bistek.com.br',
    specialty: 'supermercado',
  },
  {
    id: 'angeloni',
    name: 'Angeloni SC',
    region: 'Florianópolis / SC',
    baseUrl: 'https://www.angeloni.com.br/super',
    specialty: 'supermercado',
  },
  {
    id: 'atacadao',
    name: 'Atacadão',
    region: 'Atacarejo BR',
    baseUrl: 'https://www.atacadao.com.br',
    specialty: 'atacado',
  },
  {
    id: 'lojasantoantonio',
    name: 'Loja Santo Antônio',
    region: 'Confeitaria BR',
    baseUrl: 'https://www.lojasantoantonio.com.br',
    specialty: 'confeitaria',
  },
];

// Queries otimizadas por ID conhecido para máxima precisão de busca nos catálogos SC
const CUSTOM_SEARCH_HINTS = {
  'leite': { query: 'leite integral 1l', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'leite-condensado': { query: 'leite condensado 395g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'creme-de-leite': { query: 'creme de leite 200g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'mel': { query: 'mel puro 500g', stores: ['giassi', 'bistek', 'angeloni'] },
  'choc-po-50': { query: 'chocolate em po 50 cacau 500g', stores: ['lojasantoantonio', 'giassi', 'angeloni'] },
  'cacau-100': { query: 'cacau em po 100 200g', stores: ['lojasantoantonio', 'giassi', 'bistek', 'angeloni'] },
  'choc-nobre': { query: 'chocolate barra melken 500g', stores: ['lojasantoantonio', 'giassi', 'angeloni'] },
  'cobertura-frac': { query: 'cobertura fracionada harald 1kg', stores: ['lojasantoantonio', 'giassi', 'bistek'] },
  'leite-moca-lata': { query: 'leite condensado moca lata 395g', stores: ['giassi', 'bistek', 'angeloni', 'lojasantoantonio'] },
  'farinha': { query: 'farinha de trigo 1kg', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'acucar-refinado': { query: 'acucar refinado 1kg', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'acucar-mascavo': { query: 'acucar mascavo 500g', stores: ['giassi', 'bistek', 'angeloni'] },
  'manteiga': { query: 'manteiga sem sal 200g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'margarina': { query: 'margarina qualy 500g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'ovos': { query: 'ovos bandeja 20 unidades', stores: ['giassi', 'bistek', 'angeloni'] },
  'amido': { query: 'amido de milho maizena 200g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'casquinha': { query: 'casquinha sorvete marvi', stores: ['lojasantoantonio', 'giassi', 'bistek'] },
  'cafe-soluvel': { query: 'cafe soluvel 100g', stores: ['giassi', 'bistek', 'angeloni'] },
  'canela': { query: 'canela em po kitano', stores: ['giassi', 'bistek', 'angeloni'] },
  'cravo': { query: 'cravo da india kitano', stores: ['giassi', 'bistek', 'angeloni'] },
  'noz-moscada': { query: 'noz moscada po', stores: ['giassi', 'bistek', 'angeloni'] },
  'bicarbonato': { query: 'bicarbonato de sodio 100g', stores: ['giassi', 'bistek', 'angeloni'] },
  'fermento': { query: 'fermento quimico royal 100g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'emb-individual': { query: 'saco celofane transparente 100 unidades', stores: ['lojasantoantonio'] },
  'emb-familia': { query: 'caixa kraft visor bolo', stores: ['lojasantoantonio'] },
  'granulado-gourmet': { query: 'granulado chocolate 500g', stores: ['lojasantoantonio', 'giassi', 'bistek'] },
  'baunilha': { query: 'essencia baunilha 30ml', stores: ['lojasantoantonio', 'giassi', 'bistek', 'angeloni'] },
  'leite-ninho': { query: 'leite em po ninho 380g', stores: ['giassi', 'bistek', 'angeloni', 'atacadao'] },
  'creme-avela': { query: 'creme de avela nutella 650g', stores: ['giassi', 'bistek', 'angeloni', 'lojasantoantonio'] },
};

function sanitizeQuery(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchPlanForIngredient(ing) {
  const preset = CUSTOM_SEARCH_HINTS[ing.id];
  if (preset) return preset;

  const isConfeitaria = /chocolate|cacau|embalag|confeit|biscoit|casquinha|granulado|baunilha/i.test(
    `${ing.categoria || ''} ${ing.nome || ''}`,
  );
  const unitHint = ing.quantidade && ing.unidade
    ? `${ing.quantidade}${ing.unidade === 'un' ? '' : ing.unidade}`
    : '';
  const query = sanitizeQuery(`${ing.nome} ${unitHint}`).slice(0, 60);
  const stores = isConfeitaria
    ? ['lojasantoantonio', 'giassi', 'bistek', 'angeloni']
    : ['giassi', 'bistek', 'angeloni', 'atacadao'];

  return { query, stores };
}

async function fetchVtexStoreOffers(store, query, maxItems = 4) {
  const endpoint = `${store.baseUrl}/api/catalog_system/pub/products/search/${encodeURIComponent(query)}?_from=0&_to=${maxItems - 1}`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AnasBakeryPriceBot/1.0)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok && res.status !== 206) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const offers = [];
    for (const p of data) {
      const item = Array.isArray(p.items) ? p.items[0] : null;
      const seller = item && Array.isArray(item.sellers) ? item.sellers[0] : null;
      const offer = seller?.commertialOffer;
      const price = Number(offer?.Price || 0);
      if (!offer || !offer.IsAvailable || !Number.isFinite(price) || price <= 0) continue;

      offers.push({
        storeId: store.id,
        store: store.name,
        region: store.region,
        title: String(p.productName || item?.name || '').trim().slice(0, 120),
        brand: String(p.brand || '').trim().slice(0, 40),
        price: Math.round(price * 100) / 100,
        listPrice: Number(offer.ListPrice || price),
        url: typeof p.link === 'string' && p.link.startsWith('http') ? p.link : store.baseUrl,
      });
    }
    return offers;
  } catch {
    return [];
  }
}

async function runWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Busca ofertas reais ao vivo para uma lista de insumos nos mercados de SC & Confeitaria.
 */
export async function fetchLiveMarketOffersForIngredients(ingredients) {
  const storeMap = new Map(MARKET_STORES.map((s) => [s.id, s]));

  const rows = await runWithConcurrency(ingredients, 6, async (ing) => {
    const plan = buildSearchPlanForIngredient(ing);
    const targetStores = plan.stores.map((id) => storeMap.get(id)).filter(Boolean);

    const storeResults = await Promise.all(
      targetStores.map((st) => fetchVtexStoreOffers(st, plan.query, 4)),
    );
    const allOffers = storeResults.flat();

    // Se a query específica com peso não retornou nada, faz 1 fallback com o nome limpo do insumo
    if (allOffers.length === 0) {
      const fallbackQuery = sanitizeQuery(ing.nome).split(' ').slice(0, 3).join(' ');
      if (fallbackQuery && fallbackQuery.toLowerCase() !== plan.query.toLowerCase()) {
        const fallbackResults = await Promise.all(
          targetStores.slice(0, 2).map((st) => fetchVtexStoreOffers(st, fallbackQuery, 3)),
        );
        allOffers.push(...fallbackResults.flat());
      }
    }

    // Deduplica por loja + título e mantém até 10 candidatos relevantes ordenados por preço
    const seen = new Set();
    const deduped = [];
    for (const o of allOffers) {
      const key = `${o.storeId}::${o.title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(o);
    }
    deduped.sort((a, b) => a.price - b.price);

    return {
      ingredientId: ing.id,
      nome: ing.nome,
      categoria: ing.categoria,
      precoAtual: Number(ing.preco || 0),
      quantidade: Number(ing.quantidade || 1),
      unidade: ing.unidade,
      obs: ing.obs || '',
      searchQuery: plan.query,
      candidates: deduped.slice(0, 10),
    };
  });

  return rows;
}

/**
 * Busca preços referenciais para equipamentos pendentes (não pagos) na Loja Santo Antônio / Giassi.
 */
export async function fetchLiveMarketOffersForEquipments(equipments) {
  const pending = (equipments || []).filter((e) => e && !e.jaPago && !/mei|taxa|imposto|registro/i.test(e.nome || ''));
  const lsa = MARKET_STORES.find((s) => s.id === 'lojasantoantonio');
  const angeloni = MARKET_STORES.find((s) => s.id === 'angeloni');

  return runWithConcurrency(pending, 4, async (eq) => {
    const query = sanitizeQuery(eq.nome).split(' ').slice(0, 4).join(' ');
    if (!query) return { equipmentId: eq.id, nome: eq.nome, valorAtual: Number(eq.valor || 0), candidates: [] };
    const [r1, r2] = await Promise.all([
      lsa ? fetchVtexStoreOffers(lsa, query, 3) : [],
      angeloni ? fetchVtexStoreOffers(angeloni, query, 2) : [],
    ]);
    return {
      equipmentId: eq.id,
      nome: eq.nome,
      valorAtual: Number(eq.valor || 0),
      candidates: [...r1, ...r2].slice(0, 5),
    };
  });
}
