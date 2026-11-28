/**
 * Ana's Bakery — Coletor Local de Preços ao Vivo (Florianópolis / SC)
 *
 * Seleciona exclusivamente os mercados acessíveis na rotina sem carro do casal:
 *  1) Casa — Tapera da Base (CEP 88049-332): Fort Atacadista Campeche (Preferência #1 / Rancho),
 *     Bistek Costeira / Sul da Ilha e Hiper Select (Rio Tavares / Centro).
 *  2) Trabalho Centro — Ed. Constância Nandi (Rua Trajano, 265 - CEP 88010-010):
 *     Hiper Select Centro (230m), Hippo Centro (250m) e Angeloni Centro.
 *  3) Trabalho Estreito — Rua Gen. Liberato Bittencourt (CEP 88070-800):
 *     Fort Atacadista Jardim Atlântico, Angeloni Capoeiras e Bistek Abraão.
 */

export const SHOPPING_HUBS = [
  {
    id: 'casa',
    label: '🏠 Casa • Tapera (CEP 88049-332)',
    shortLabel: '🏠 Casa (Tapera)',
    address: 'Tapera da Base, Florianópolis - SC (CEP 88049-332)',
    note: 'Os 3 mercados mais próximos de casa com catálogo online ao vivo (preferência: Fort Atacadista Campeche para o rancho). Brasil Atacadista (SC-405) atende apenas via televendas WhatsApp.',
  },
  {
    id: 'trabalho-centro',
    label: '🏢 Trabalho Centro • Ed. Constância Nandi',
    shortLabel: '🏢 Centro (Trajano)',
    address: 'Rua Trajano, 265 - Centro, Florianópolis - SC (CEP 88010-010)',
    note: 'Mercados a poucos minutos a pé do Ed. Constância Nandi para trazer itens avulsos ou ofertas na volta do trabalho.',
  },
  {
    id: 'trabalho-estreito',
    label: '🏢 Trabalho Estreito • Rua Liberato Bittencourt',
    shortLabel: '🏢 Estreito (Bittencourt)',
    address: 'Rua Gen. Liberato Bittencourt - Estreito, Florianópolis - SC (CEP 88070-800)',
    note: 'Fort Jardim Atlântico, Angeloni Capoeiras e Bistek Abraão na região continental. Nota: o Supermercado Imperatriz (Rua Liberato Bittencourt, 410) não publica catálogo web; use "Ler Nota Fiscal" quando comprar lá.',
  },
];

export const MARKET_STORES = [
  // POLO 1: CASA — TAPERA DA BASE (CEP 88049-332) — 3 MAIS PRÓXIMOS
  {
    id: 'fort-campeche',
    name: 'Fort Atacadista Campeche',
    shortName: 'Fort Campeche',
    platform: 'osuper',
    hub: 'casa',
    hubs: ['casa'],
    hubLabel: '🏠 Casa (Rancho SC-405)',
    address: 'Rod. SC-405, nº 3007 — Campeche',
    distanceHint: 'Mais próximo da Tapera • Loja do rancho',
    isPreferred: true,
    priority: 1,
    baseUrl: 'https://www.fortatacadista.com.br',
    apiUrl: 'https://api.fortatacadista.com.br/graphql',
    origin: 'https://www.fortatacadista.com.br',
    sitemapUrl: 'https://www.fortatacadista.com.br/sitemap.xml',
    storeId: '1636',
    specialty: 'atacarejo',
  },
  {
    id: 'bistek-costeira',
    name: 'Bistek Costeira / Sul',
    shortName: 'Bistek Costeira',
    platform: 'vtex',
    hub: 'casa',
    hubs: ['casa'],
    hubLabel: '🏠 Casa / Rota Sul-Centro',
    address: 'Rua João Câncio Jacques, 49 — Costeira (atende CEP 88049-332)',
    distanceHint: 'Rota direta Tapera ↔ Centro',
    isPreferred: false,
    priority: 2,
    baseUrl: 'https://www.bistek.com.br',
    postalCode: '88049332',
    specialty: 'supermercado',
  },
  {
    id: 'hiperselect',
    name: 'Hiper Select (Rio Tavares & Centro)',
    shortName: 'Hiper Select',
    platform: 'osuper',
    hub: 'casa',
    hubs: ['casa', 'trabalho-centro'],
    hubLabel: '🏠 Rio Tavares & 🏢 Centro (230m)',
    address: 'Rod. Dr. Antônio L. M. Gonzaga, 2797 (Rio Tavares) • Rua Deodoro, 281 (Centro)',
    distanceHint: 'Perto de casa no Sul e a ~230m a pé do Ed. Constância Nandi',
    isPreferred: false,
    priority: 2,
    baseUrl: 'https://www.hiperselect.com.br',
    apiUrl: 'https://api.hiperselect.com.br/graphql',
    origin: 'https://www.hiperselect.com.br',
    sitemapUrl: 'https://www.hiperselect.com.br/sitemap.xml',
    storeId: '1573',
    specialty: 'supermercado',
  },

  // POLO 2: TRABALHO CENTRO — ED. CONSTÂNCIA NANDI (RUA TRAJANO, 265)
  {
    id: 'hippo-centro',
    name: 'Hippo Supermercados Centro',
    shortName: 'Hippo Centro',
    platform: 'osuper',
    hub: 'trabalho-centro',
    hubs: ['trabalho-centro'],
    hubLabel: '🏢 Centro (250m do Constância Nandi)',
    address: 'Rua Almirante Alvim, 555 / Praça XV — Centro',
    distanceHint: 'A poucos minutos a pé da Rua Trajano',
    isPreferred: false,
    priority: 3,
    baseUrl: 'https://hipposupermercados.com.br',
    apiUrl: 'https://api.hipposupermercados.com.br/graphql',
    origin: 'https://hipposupermercados.com.br',
    sitemapUrl: 'https://hipposupermercados.com.br/sitemap.xml',
    storeId: '1387',
    specialty: 'supermercado',
  },
  {
    id: 'angeloni-centro',
    name: 'Angeloni Centro',
    shortName: 'Angeloni Centro',
    platform: 'vtex',
    hub: 'trabalho-centro',
    hubs: ['trabalho-centro'],
    hubLabel: '🏢 Centro (Esteves Jr / Hoepcke)',
    address: 'Rua Esteves Júnior, 307 / Rua Hoepcke — Centro (CEP 88010-010)',
    distanceHint: 'Região central a pé / fácil acesso',
    isPreferred: false,
    priority: 3,
    baseUrl: 'https://www.angeloni.com.br/super',
    postalCode: '88010010',
    specialty: 'supermercado',
  },

  // POLO 3: TRABALHO ESTREITO — RUA GEN. LIBERATO BITTENCOURT (CEP 88070-800)
  {
    id: 'fort-jardim-atlantico',
    name: 'Fort Atacadista Jardim Atlântico',
    shortName: 'Fort Jd. Atlântico',
    platform: 'osuper',
    hub: 'trabalho-estreito',
    hubs: ['trabalho-estreito'],
    hubLabel: '🏢 Estreito (Fort Continente)',
    address: 'Rua Elesbão Pinto da Luz, 1183 — Jardim Atlântico / Estreito',
    distanceHint: 'Fort Atacadista próximo à Rua Liberato Bittencourt',
    isPreferred: true,
    priority: 2,
    baseUrl: 'https://www.fortatacadista.com.br',
    apiUrl: 'https://api.fortatacadista.com.br/graphql',
    origin: 'https://www.fortatacadista.com.br',
    sitemapUrl: 'https://www.fortatacadista.com.br/sitemap.xml',
    storeId: '1669',
    specialty: 'atacarejo',
  },
  {
    id: 'angeloni-capoeiras',
    name: 'Angeloni Capoeiras',
    shortName: 'Angeloni Capoeiras',
    platform: 'vtex',
    hub: 'trabalho-estreito',
    hubs: ['trabalho-estreito'],
    hubLabel: '🏢 Estreito / Capoeiras',
    address: 'Av. Gov. Ivo Silveira, 2445 — Capoeiras (atende CEP 88070-800)',
    distanceHint: 'Próximo ao Estreito / Liberato Bittencourt',
    isPreferred: false,
    priority: 3,
    baseUrl: 'https://www.angeloni.com.br/super',
    postalCode: '88070800',
    specialty: 'supermercado',
  },
  {
    id: 'bistek-abraao',
    name: 'Bistek Abraão',
    shortName: 'Bistek Abraão',
    platform: 'vtex',
    hub: 'trabalho-estreito',
    hubs: ['trabalho-estreito'],
    hubLabel: '🏢 Estreito / Abraão',
    address: 'Av. Patrício Caldeira de Andrada, 442 — Abraão (atende CEP 88070-800)',
    distanceHint: 'Próximo ao Estreito / Liberato Bittencourt',
    isPreferred: false,
    priority: 3,
    baseUrl: 'https://www.bistek.com.br',
    postalCode: '88070800',
    specialty: 'supermercado',
  },
];

// Palavras negativas globais para impedir que itens de limpeza/perfumaria/pet entrem na busca de cozinha
const GLOBAL_NEGATIVE_WORDS = [
  'limpador',
  'desinfetante',
  'detergente',
  'amaciante',
  'sabonete',
  'shampoo',
  'condicionador',
  'hidratante',
  'difusor',
  'incenso',
  'perfume',
  'sandalia',
  'havaianas',
  'racao',
  'carmed',
  'protetor',
  'esponja',
  'alvejante',
  'desodorante',
  'creme-dental',
  'cremedental',
  'aromatizante',
  'vela',
  'amoniaco',
  'agua-sanitaria',
];

/**
 * Especificação cirúrgica por ID de insumo:
 *  - vtexQuery: termo para busca VTEX
 *  - tokenGroups: lista de conjuntos de tokens alternativos para match exato no sitemap OSuper
 *  - prefer: tokens que dão prioridade (ex: '395g', '1kg', '500g')
 *  - exclude: palavras negativas específicas daquele insumo
 *  - skipSupermarket: true para embalagens personalizadas de doceria (mantém preço manual)
 */
const INGREDIENT_SEARCH_SPECS = {
  'leite': {
    vtexQuery: 'leite integral 1l',
    tokenGroups: [['leite', 'integral', '1l'], ['leite', 'uht', 'integral'], ['leite', 'integral', 'litro']],
    prefer: ['1l', '1litro', 'litro', 'tirol', 'piracanjuba', 'italac', 'elegê', 'elege'],
    exclude: ['condensado', 'creme', 'po', 'fermentado', 'bebida', 'achocolatado', 'vegetal', 'soja', 'amendoa', 'aveia', 'coco', 'manteiga', 'doce', 'iogurte', 'queijo', 'zero', 'lactose'],
  },
  'leite-condensado': {
    vtexQuery: 'leite condensado 395g',
    tokenGroups: [['leite', 'condensado', '395g'], ['leite', 'condensado', '395'], ['leite', 'condensado']],
    prefer: ['395g', '395', 'italac', 'piracanjuba', 'tirol', 'moca'],
    exclude: ['pudim', 'sobremesa', 'sorvete', 'carmed', 'balm', 'chocolate', 'bombom', 'bolo', 'zero', 'diet', 'mistura', 'bag', '25kg', '2kg'],
  },
  'creme-de-leite': {
    vtexQuery: 'creme de leite 200g',
    tokenGroups: [['creme', 'leite', '200g'], ['creme', 'leite', '200']],
    prefer: ['200g', '200', 'piracanjuba', 'tirol', 'italac', 'nestle', 'amanhecer'],
    exclude: ['mistura', 'fresco', 'nata', 'ricota', 'queijo', 'cabelo', 'zero', 'lactose', '1kg', '1l'],
  },
  'mel': {
    vtexQuery: 'mel puro abelha',
    tokenGroups: [['mel', 'abelha'], ['mel', 'silvestre'], ['mel', 'puro'], ['mel', '500g'], ['mel', 'bisnaga'], ['mel', 'pote']],
    prefer: ['500g', 'silvestre', 'puro', 'abelha', 'bisnaga', 'pote'],
    exclude: ['melancia', 'melao', 'melado', 'melitta', 'cafe', 'caramelo', 'mostarda', 'vinagre', 'cha', 'barra', 'cereal', 'biscoito', 'cookie', 'granola', 'iogurte', 'suplemento', 'whey', 'gelatina', 'bala', 'pao'],
  },
  'choc-po-50': {
    vtexQuery: 'chocolate em po 50 cacau 500g',
    tokenGroups: [['chocolate', 'po', '50'], ['cacau', '50'], ['chocolate', 'po', '500g'], ['chocolate', 'po', '200g'], ['chocolate', 'po']],
    prefer: ['50', '500g', '200g', 'melken', 'sicao', 'mavalerio', 'harald', 'garoto', 'nestle'],
    exclude: ['achocolatado', 'nescau', 'toddy', 'pudim', 'bolo', 'biscoito', 'wafer', 'barra', 'bombom', 'panettone', 'cereal', 'proteina', 'whey', 'iogurte', 'bebida', 'shake', 'cappucino'],
  },
  'cacau-100': {
    vtexQuery: 'cacau em po 100 200g',
    tokenGroups: [['cacau', 'po', '100'], ['cacau', '100', 'po'], ['cacau', '100', '200g'], ['cacau', 'po']],
    prefer: ['100', '200g', 'alcalino', 'garoto', 'nestle', 'melken', 'sicao', 'mavalerio'],
    exclude: ['achocolatado', 'granola', 'barra', 'tablete', 'biscoito', 'cookie', 'nibs', 'proteina', 'whey', 'cereal', 'pudim', 'banana', 'chocolate-70'],
  },
  'choc-nobre': {
    vtexQuery: 'chocolate barra meio amargo ao leite 500g',
    tokenGroups: [['chocolate', 'melken'], ['chocolate', 'sicao'], ['chocolate', 'nobre'], ['chocolate', 'garoto', 'barra'], ['chocolate', 'nestle', 'barra'], ['chocolate', 'hersheys', 'barra']],
    prefer: ['500g', '1kg', 'melken', 'sicao', 'divine', 'garoto', 'nestle'],
    exclude: ['fracionada', 'fracionado', 'cobertura', 'biscoito', 'wafer', 'achocolatado', 'po', 'granulado', 'sorvete', 'creme', 'pasta'],
  },
  'cobertura-frac': {
    vtexQuery: 'cobertura fracionada chocolate 1kg',
    tokenGroups: [['cobertura', 'fracionada'], ['cobertura', 'chocolate', '1kg'], ['cobertura', 'genuine'], ['cobertura', 'harald']],
    prefer: ['1kg', 'fracionada', 'harald', 'top', 'genuine', 'mavalerio', 'sicao'],
    exclude: ['sorvete', 'torta', 'bolo', 'pao', 'calda', 'liquida'],
  },
  'leite-moca-lata': {
    vtexQuery: 'leite condensado moca lata 395g',
    tokenGroups: [['leite', 'condensado', 'moca', 'lata'], ['moca', 'lata', '395'], ['leite', 'condensado', 'moca']],
    prefer: ['lata', '395g', 'integral', 'moca'],
    exclude: ['pudim', 'chocolate', 'doce', 'sorvete', 'biscoito', 'zero'],
  },
  'farinha': {
    vtexQuery: 'farinha de trigo 1kg',
    tokenGroups: [['farinha', 'trigo', '1kg']],
    prefer: ['1kg', 'tipo', 'tradicional', 'dona', 'benta', 'nordeste', 'orquidea', 'anaconda', 'renata'],
    exclude: ['rosca', 'mandioca', 'milho', 'aveia', 'arroz', 'amendoa', 'linha', 'banana', 'biju', 'integral', 'fermento', 'pizza', '5kg', '25kg'],
  },
  'acucar-refinado': {
    vtexQuery: 'acucar refinado uniao 1kg',
    tokenGroups: [['acucar', 'refinado', '1kg'], ['acucar', 'refinado']],
    prefer: ['1kg', 'uniao', 'caravelas', 'alto', 'alegre'],
    exclude: ['sal', 'mascavo', 'demerara', 'cristal', 'confeiteiro', 'baunilha', '5kg', '2kg'],
  },
  'acucar-mascavo': {
    vtexQuery: 'acucar mascavo 500g',
    tokenGroups: [['acucar', 'mascavo', '500g'], ['acucar', 'mascavo']],
    prefer: ['500g', 'dacolonia', 'jasmine', 'uniao'],
    exclude: ['biscoito', 'granola', 'barra', 'cereal'],
  },
  'manteiga': {
    vtexQuery: 'manteiga sem sal 200g',
    tokenGroups: [['manteiga', 'sem', 'sal', '200'], ['manteiga', 'sem', 'sal']],
    prefer: ['200g', 'sem', 'sal', 'tirol', 'aviacao', 'president', 'italac'],
    exclude: ['com-sal', 'cacao', 'cacau', 'karite', 'biscoito', 'pipoca', 'ghee', '500g'],
  },
  'margarina': {
    vtexQuery: 'margarina qualy sem sal 500g',
    tokenGroups: [['margarina', 'qualy', '500g'], ['margarina', '500g'], ['margarina', 'sem', 'sal']],
    prefer: ['500g', 'qualy', 'sem', 'sal', 'cremosa'],
    exclude: ['light', 'zero', '1kg', '250g', '3kg'],
  },
  'ovos': {
    vtexQuery: 'ovos brancos bandeja',
    tokenGroups: [['ovos', '20'], ['ovo', '20'], ['ovos', '30'], ['ovo', '30'], ['ovos', '12'], ['ovo', '12']],
    prefer: ['20', '30', 'brancos', 'vermelhos', 'mantiqueira', 'kasulke'],
    exclude: ['pascoa', 'chocolate', 'cozedor', 'macarrao', 'massa', 'codorna', 'caipira', 'organico', 'laminada', 'bompack', 'descartavel', 'embalagem'],
  },
  'amido': {
    vtexQuery: 'amido de milho maizena 200g',
    tokenGroups: [['amido', 'milho', '200g'], ['amido', 'milho', '500g'], ['amido', 'milho']],
    prefer: ['200g', 'maizena', '500g'],
    exclude: ['biscoito', '1kg'],
  },
  'casquinha': {
    vtexQuery: 'casquinha sorvete marvi',
    tokenGroups: [['casquinha', 'sorvete'], ['marvi', 'casquinha'], ['cascas', 'sorvete'], ['kaskete']],
    prefer: ['marvi', 'casquinha', '10', '12', '18'],
    exclude: ['farinha', 'biscoito-polvilho', 'sorvete-pote'],
  },
  'cafe-soluvel': {
    vtexQuery: 'cafe soluvel 100g',
    tokenGroups: [['cafe', 'soluvel', '100g'], ['cafe', 'soluvel', '50g'], ['cafe', 'soluvel']],
    prefer: ['100g', 'nescafe', 'coracoes', 'iguacu', 'pilao', 'tradicional'],
    exclude: ['cappuccino', 'capsula', 'filtro', 'moido', 'descafeinado'],
  },
  'canela': {
    vtexQuery: 'canela em po kitano',
    tokenGroups: [['canela', 'po'], ['canela', 'moida']],
    prefer: ['50g', '40g', '30g', 'kitano', 'tell', 'ponzan'],
    exclude: ['rama', 'casca', 'cha', 'biscoito', 'cereal', 'sabonete'],
  },
  'cravo': {
    vtexQuery: 'cravo da india kitano',
    tokenGroups: [['cravo', 'india']],
    prefer: ['40g', '20g', '10g', 'kitano', 'tell', 'ponzan'],
    exclude: ['cha', 'oleo', 'esmalte'],
  },
  'noz-moscada': {
    vtexQuery: 'noz moscada moida',
    tokenGroups: [['noz', 'moscada']],
    prefer: ['20g', '10g', 'moida', 'kitano', 'tell', 'ponzan', 'hikari'],
    exclude: ['cha'],
  },
  'bicarbonato': {
    vtexQuery: 'bicarbonato de sodio 100g',
    tokenGroups: [['bicarbonato', 'sodio']],
    prefer: ['100g', '80g', 'tell', 'kitano', 'ponzan'],
    exclude: ['amonio', '1kg', '2kg'],
  },
  'fermento': {
    vtexQuery: 'fermento quimico royal 100g',
    tokenGroups: [['fermento', 'quimico', '100g'], ['fermento', 'po', '100g'], ['fermento', 'quimico']],
    prefer: ['100g', 'royal', 'oetker', 'apti'],
    exclude: ['biologico', 'seco', '250g', 'pao'],
  },
  'emb-individual': {
    skipSupermarket: true,
    reason: 'Embalagem individual + adesivo personalizado — mantido preço manual cadastrado.',
  },
  'emb-familia': {
    skipSupermarket: true,
    reason: 'Caixa tamanho família/gigante com visor — mantido preço manual cadastrado.',
  },
  'emb-tortinha': {
    skipSupermarket: true,
    reason: 'Embalagem PET p/ tortinha (G640/G650) + adesivo — mantido preço manual cadastrado.',
  },
  'emb-panetone': {
    skipSupermarket: true,
    reason: 'Caixa/saquinho personalizado de panetone — mantido preço manual cadastrado.',
  },
  'granulado-gourmet': {
    vtexQuery: 'chocolate granulado 500g',
    tokenGroups: [['granulado', 'chocolate', '500g'], ['chocolate', 'granulado'], ['granulado', 'macio'], ['granulado', 'escuro']],
    prefer: ['500g', '1kg', 'dori', 'mavalerio', 'melken', 'harald', 'escuro'],
    exclude: ['colorido', 'cafe', 'adocante', 'sabonete'],
  },
  'baunilha': {
    vtexQuery: 'essencia baunilha 30ml',
    tokenGroups: [['essencia', 'baunilha'], ['extrato', 'baunilha'], ['aroma', 'baunilha']],
    prefer: ['30ml', 'arcolor', 'mix', 'oetker', 'fleischmann', 'bombay'],
    exclude: ['iogurte', 'sorvete', 'pudim', 'proteina', 'whey', 'cappuccino', 'acucar'],
  },
  'leite-ninho': {
    vtexQuery: 'leite em po ninho 380g',
    tokenGroups: [['leite', 'po', 'ninho', '380'], ['leite', 'po', 'ninho', '400'], ['leite', 'po', 'ninho']],
    prefer: ['380g', '400g', 'integral', 'instantaneo', 'forti'],
    exclude: ['macarrao', 'massa', 'bebida', 'shake', 'iogurte', 'composto', 'fases', 'zero', '1l', 'litro', '750g', '800g'],
  },
  'creme-avela': {
    vtexQuery: 'creme de avela nutella',
    tokenGroups: [['creme', 'avela', 'nutella'], ['creme', 'avela']],
    prefer: ['650g', '700g', '375g', '350g', 'nutella', '1kg'],
    exclude: ['b-ready', 'ready', 'wafer', 'crepe', 'biscoito', 'bolacha', 'panettone', 'sorvete', 'barra', 'bombom', 'cappuccino'],
  },
  'fermento-bio-seco': {
    vtexQuery: 'fermento biologico seco 10g',
    tokenGroups: [['fermento', 'biologico', 'seco']],
    prefer: ['10g', 'fleischmann', 'oetker', 'apti', 'dona', 'benta'],
    exclude: ['quimico', 'fresco', '500g'],
  },
  'essencia-panetone': {
    vtexQuery: 'essencia panetone 30ml',
    tokenGroups: [['essencia', 'panetone'], ['aroma', 'panetone']],
    prefer: ['30ml', 'arcolor', 'mavalerio', 'mix'],
    exclude: ['chocottone', 'pronto'],
  },
  'laranja': {
    vtexQuery: 'laranja pera kg',
    tokenGroups: [['laranja', 'pera'], ['laranja', 'bahia'], ['laranja', 'lima']],
    prefer: ['pera', 'kg'],
    exclude: ['suco', 'refrigerante', 'fanta', 'gelatina', 'biscoito', 'cookie', 'cha', 'bolo', 'sabonete'],
  },
  'lecitina-soja': {
    vtexQuery: 'lecitina de soja',
    tokenGroups: [['lecitina', 'soja']],
    prefer: ['100g', '200g'],
    exclude: ['capsula'],
  },
  'sal': {
    vtexQuery: 'sal refinado 1kg',
    tokenGroups: [['sal', 'refinado', '1kg']],
    prefer: ['1kg', 'cisne', 'lebre', 'zizo'],
    exclude: ['grosso', 'churrasco', 'himalaia', 'marinho', 'biscoito', 'manteiga', 'margarina'],
  },
  'gotas-choc-leite': {
    vtexQuery: 'gotas chocolate ao leite',
    tokenGroups: [['gotas', 'chocolate'], ['chocolate', 'gotas'], ['chocochips']],
    prefer: ['1kg', '500g', 'forneavel', 'harald', 'sicao', 'melken'],
    exclude: ['cookie', 'biscoito', 'panettone', 'cereal', 'sorvete', 'muffin'],
  },
};

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'sem', 'por', 'tipo', 'puro', 'extra']);

function sanitizeQuery(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return sanitizeQuery(str).toLowerCase().split(' ').filter(Boolean);
}

function buildSearchSpecForIngredient(ing) {
  const preset = INGREDIENT_SEARCH_SPECS[ing.id];
  if (preset) return preset;

  if (/embalag|caixa|saco|saquinho|adesivo|etiqueta/i.test(`${ing.categoria || ''} ${ing.nome || ''}`)) {
    return {
      skipSupermarket: true,
      reason: 'Embalagem artesanal/personalizada — mantido preço manual cadastrado.',
    };
  }

  const nameTokens = tokenize(ing.nome).filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  const coreTokens = nameTokens.slice(0, 3);
  const unitHint = ing.quantidade && ing.unidade
    ? `${ing.quantidade}${ing.unidade === 'un' ? '' : ing.unidade}`.toLowerCase()
    : '';

  const tokenGroups = [];
  if (coreTokens.length >= 2 && unitHint) tokenGroups.push([...coreTokens.slice(0, 2), unitHint]);
  if (coreTokens.length >= 1) tokenGroups.push(coreTokens);

  return {
    vtexQuery: sanitizeQuery(`${coreTokens.join(' ')} ${unitHint}`).slice(0, 55),
    tokenGroups,
    prefer: unitHint ? [unitHint] : [],
    exclude: [],
  };
}

function hasNegativeWord(wordsOrSlug, extraExclude = []) {
  const words = Array.isArray(wordsOrSlug) ? wordsOrSlug : tokenize(wordsOrSlug);
  const wordSet = new Set(words);
  for (const neg of GLOBAL_NEGATIVE_WORDS) {
    if (wordSet.has(neg)) return true;
  }
  for (const neg of extraExclude) {
    const clean = sanitizeQuery(neg).toLowerCase();
    if (!clean) continue;
    if (clean.includes(' ')) {
      if (words.join(' ').includes(clean)) return true;
    } else if (wordSet.has(clean)) {
      return true;
    }
  }
  return false;
}

// ======================== CACHE EM MEMÓRIA (INSTÂNCIA SERVERLESS) ========================
const sitemapCache = new Map(); // sitemapUrl -> { expiresAt, entries }
const vtexRegionCache = new Map(); // `${baseUrl}::${postalCode}` -> { expiresAt, regionId, sellerIds }
const SITEMAP_TTL_MS = 30 * 60 * 1000;
const REGION_TTL_MS = 30 * 60 * 1000;

async function fetchOsuperSitemapIndex(sitemapUrl) {
  const cached = sitemapCache.get(sitemapUrl);
  if (cached && cached.expiresAt > Date.now() && cached.entries.length > 0) {
    return cached.entries;
  }

  try {
    const res = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/xml,text/xml,*/*',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = [];
    const regex = /<loc>(https?:\/\/[^<]+\/produtos\/(\d+)\/([^<]+))<\/loc>/gi;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const slug = m[3].toLowerCase();
      const words = slug.split(/[^a-z0-9]+/).filter(Boolean);
      entries.push({
        id: m[2],
        url: m[1],
        slug,
        words,
        wordSet: new Set(words),
      });
    }
    if (entries.length > 0) {
      sitemapCache.set(sitemapUrl, { expiresAt: Date.now() + SITEMAP_TTL_MS, entries });
    }
    return entries;
  } catch {
    return cached?.entries || [];
  }
}

function matchSitemapCandidates(entries, spec, limit = 5) {
  if (!entries.length || spec.skipSupermarket) return [];
  const groups = Array.isArray(spec.tokenGroups) ? spec.tokenGroups : [];
  if (!groups.length) return [];

  const preferTokens = (spec.prefer || []).map((t) => sanitizeQuery(t).toLowerCase()).filter(Boolean);
  const excludeTokens = spec.exclude || [];
  const scored = [];

  for (const entry of entries) {
    if (hasNegativeWord(entry.words, excludeTokens)) continue;

    let bestGroupRank = -1;
    for (let gIdx = 0; gIdx < groups.length; gIdx += 1) {
      const group = groups[gIdx];
      const allPresent = group.every((tok) => {
        const cleanTok = sanitizeQuery(tok).toLowerCase();
        if (!cleanTok) return true;
        if (entry.wordSet.has(cleanTok)) return true;
        // Permite match de peso compacto como "395g" <-> "395" ou "1kg" <-> "1"
        if (/^\d+(g|kg|ml|l|gr|un)$/.test(cleanTok)) {
          const numOnly = cleanTok.replace(/[a-z]+$/, '');
          return entry.slug.includes(cleanTok) || entry.wordSet.has(numOnly);
        }
        return false;
      });
      if (allPresent) {
        bestGroupRank = groups.length - gIdx; // primeiro grupo tem maior prioridade
        break;
      }
    }

    if (bestGroupRank < 0) continue;

    let score = bestGroupRank * 20;
    for (const pTok of preferTokens) {
      if (entry.wordSet.has(pTok) || entry.slug.includes(pTok)) {
        score += 5;
      }
    }
    // Leve preferência por títulos mais enxutos (menos kits/sabores exóticos)
    score -= Math.min(8, Math.floor(entry.words.length / 3));

    scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

async function fetchOsuperProductsBatch(store, idToUrlMap) {
  const allIds = [...idToUrlMap.keys()];
  if (!allIds.length) return new Map();

  const productMap = new Map();
  const batchSize = 45;

  for (let i = 0; i < allIds.length; i += batchSize) {
    const chunk = allIds.slice(i, i + batchSize);
    const query = `query {
      publicViewer(storeId: ${JSON.stringify(store.storeId)}) {
        products(ids: ${JSON.stringify(chunk)}, storeId: ${JSON.stringify(store.storeId)}) {
          id
          name
          slug
          brand { name }
          pricing(storeId: ${JSON.stringify(store.storeId)}) {
            price
            promotionalPrice
            promotion
          }
          quantity(storeId: ${JSON.stringify(store.storeId)}) {
            inStock
          }
        }
      }
    }`;

    try {
      const res = await fetch(store.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: store.origin,
          Referer: `${store.origin}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const prods = json?.data?.publicViewer?.products || [];
      for (const p of prods) {
        const inStock = Number(p?.quantity?.inStock || 0);
        const regular = Number(p?.pricing?.price || 0);
        const promo = Number(p?.pricing?.promotionalPrice || 0);
        const effectivePrice = promo > 0 && promo < regular ? promo : regular;

        if (inStock <= 0 || !Number.isFinite(effectivePrice) || effectivePrice <= 0) continue;

        productMap.set(String(p.id), {
          storeId: store.id,
          store: store.name,
          hub: store.hub,
          hubLabel: store.hubLabel,
          address: store.address,
          isPreferred: Boolean(store.isPreferred),
          priority: store.priority,
          title: String(p.name || '').trim().slice(0, 120),
          brand: String(p.brand?.name || '').trim().slice(0, 40),
          price: Math.round(effectivePrice * 100) / 100,
          listPrice: Math.round((regular > 0 ? regular : effectivePrice) * 100) / 100,
          url: idToUrlMap.get(String(p.id)) || `${store.baseUrl}/produtos/${p.id}/${p.slug || ''}`,
        });
      }
    } catch {
      // Segue para próximo lote mesmo se um timeout acontecer
    }
  }

  return productMap;
}

async function resolveVtexRegion(baseUrl, postalCode) {
  const key = `${baseUrl}::${postalCode}`;
  const cached = vtexRegionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
    const res = await fetch(`${baseUrl}/api/checkout/pub/regions?country=BRA&postalCode=${postalCode}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { regionId: '', sellerIds: [] };
    const regs = await res.json();
    const regionId = regs?.[0]?.id || '';
    const sellerIds = (regs?.[0]?.sellers || []).map((s) => s.id).filter(Boolean);
    const val = { expiresAt: Date.now() + REGION_TTL_MS, regionId, sellerIds };
    vtexRegionCache.set(key, val);
    return val;
  } catch {
    return { regionId: '', sellerIds: [] };
  }
}

async function fetchVtexStoreOffers(store, spec, maxItems = 4) {
  if (spec.skipSupermarket || !spec.vtexQuery) return [];
  const { regionId, sellerIds } = await resolveVtexRegion(store.baseUrl, store.postalCode);
  const segCookie = regionId
    ? `vtex_segment=${Buffer.from(JSON.stringify({ regionId })).toString('base64')}`
    : '';

  const isEndpoint = `${store.baseUrl}/api/io/_v/api/intelligent-search/product_search/?query=${encodeURIComponent(spec.vtexQuery)}&count=${maxItems}${regionId ? `&regionId=${encodeURIComponent(regionId)}` : ''}`;
  const legacyEndpoint = `${store.baseUrl}/api/catalog_system/pub/products/search/${encodeURIComponent(spec.vtexQuery)}?_from=0&_to=${maxItems - 1}`;

  const parseProducts = (products) => {
    const offers = [];
    for (const p of products || []) {
      const title = String(p.productName || p.items?.[0]?.name || '').trim().slice(0, 120);
      if (!title || hasNegativeWord(title, spec.exclude || [])) continue;

      const item = Array.isArray(p.items) ? p.items[0] : null;
      const sellers = Array.isArray(item?.sellers) ? item.sellers : [];
      const seller = sellers.find((s) => sellerIds.includes(s.sellerId))
        || sellers.find((s) => s.commertialOffer?.IsAvailable && Number(s.commertialOffer?.Price || 0) > 0)
        || sellers[0];
      const offer = seller?.commertialOffer;
      const price = Number(offer?.Price || 0);
      if (!offer || !offer.IsAvailable || !Number.isFinite(price) || price <= 0) continue;

      const rawLink = typeof p.link === 'string' ? p.link : '';
      const url = rawLink.startsWith('http')
        ? rawLink
        : (rawLink.startsWith('/') ? `${store.baseUrl.replace(/\/super$/, '')}${rawLink}` : store.baseUrl);

      offers.push({
        storeId: store.id,
        store: store.name,
        hub: store.hub,
        hubLabel: store.hubLabel,
        address: store.address,
        isPreferred: Boolean(store.isPreferred),
        priority: store.priority,
        title,
        brand: String(p.brand || '').trim().slice(0, 40),
        price: Math.round(price * 100) / 100,
        listPrice: Number(offer.ListPrice || price),
        url,
      });
    }
    return offers;
  };

  try {
    const res = await fetch(isEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        ...(segCookie ? { Cookie: segCookie } : {}),
      },
      signal: AbortSignal.timeout(5500),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseProducts(data?.products);
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // fallback abaixo
  }

  try {
    const res = await fetch(legacyEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        ...(segCookie ? { Cookie: segCookie } : {}),
      },
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok && res.status !== 206) return [];
    const data = await res.json();
    return Array.isArray(data) ? parseProducts(data) : [];
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
 * Busca ofertas reais ao vivo para uma lista de insumos nos mercados próximos
 * (Tapera CEP 88049-332, Trabalho Centro Ed. Constância Nandi e Trabalho Estreito Rua Liberato Bittencourt).
 */
export async function fetchLiveMarketOffersForIngredients(ingredients, { enabledStoreIds = null } = {}) {
  const enabledSet = Array.isArray(enabledStoreIds) && enabledStoreIds.length
    ? new Set(enabledStoreIds)
    : null;
  const activeStores = enabledSet
    ? MARKET_STORES.filter((s) => enabledSet.has(s.id))
    : MARKET_STORES;

  const specsMap = new Map(ingredients.map((ing) => [ing.id, buildSearchSpecForIngredient(ing)]));
  const osuperStores = activeStores.filter((s) => s.platform === 'osuper');
  const vtexStores = activeStores.filter((s) => s.platform === 'vtex');

  // 1. Baixa sitemaps únicos em paralelo (Fort Campeche & Fort Jd. Atlântico compartilham o mesmo sitemap!)
  const uniqueSitemapUrls = [...new Set(osuperStores.map((s) => s.sitemapUrl))];
  const sitemapEntriesArr = await Promise.all(uniqueSitemapUrls.map((u) => fetchOsuperSitemapIndex(u)));
  const sitemapByUrl = new Map(uniqueSitemapUrls.map((u, idx) => [u, sitemapEntriesArr[idx]]));

  // 2. Para cada loja OSuper, resolve IDs candidatos no sitemap e consulta preços reais em lote GraphQL
  const osuperOffersByIng = new Map(ingredients.map((i) => [i.id, []]));
  await Promise.all(
    osuperStores.map(async (store) => {
      const entries = sitemapByUrl.get(store.sitemapUrl) || [];
      if (!entries.length) return;

      const idToUrl = new Map();
      const ingMatchedIds = new Map();

      for (const ing of ingredients) {
        const spec = specsMap.get(ing.id);
        if (!spec || spec.skipSupermarket) continue;
        const matched = matchSitemapCandidates(entries, spec, 4);
        ingMatchedIds.set(ing.id, matched.map((m) => m.id));
        for (const m of matched) {
          idToUrl.set(m.id, m.url);
        }
      }

      const productMap = await fetchOsuperProductsBatch(store, idToUrl);
      for (const ing of ingredients) {
        const ids = ingMatchedIds.get(ing.id) || [];
        const list = osuperOffersByIng.get(ing.id);
        for (const id of ids) {
          const offer = productMap.get(id);
          if (offer) list.push(offer);
        }
      }
    }),
  );

  // 3. Em paralelo para VTEX (Bistek & Angeloni por CEP), busca ofertas para insumos não-embalagem
  const vtexOffersByIng = new Map(ingredients.map((i) => [i.id, []]));
  if (vtexStores.length > 0) {
    const searchableIngs = ingredients.filter((ing) => !specsMap.get(ing.id)?.skipSupermarket);
    await runWithConcurrency(searchableIngs, 5, async (ing) => {
      const spec = specsMap.get(ing.id);
      const results = await Promise.all(vtexStores.map((st) => fetchVtexStoreOffers(st, spec, 4)));
      vtexOffersByIng.set(ing.id, results.flat());
    });
  }

  // 4. Consolida candidatos garantindo presença das lojas preferenciais (Fort Atacadista) + menores preços locais
  return ingredients.map((ing) => {
    const spec = specsMap.get(ing.id);
    if (spec?.skipSupermarket) {
      return {
        ingredientId: ing.id,
        nome: ing.nome,
        categoria: ing.categoria,
        precoAtual: Number(ing.preco || 0),
        quantidade: Number(ing.quantidade || 1),
        unidade: ing.unidade,
        obs: ing.obs || '',
        searchQuery: '',
        skipSupermarket: true,
        skipReason: spec.reason || 'Item artesanal/personalizado — mantido preço manual.',
        candidates: [],
      };
    }

    const combined = [
      ...(osuperOffersByIng.get(ing.id) || []),
      ...(vtexOffersByIng.get(ing.id) || []),
    ];

    const seen = new Set();
    const deduped = [];
    for (const o of combined) {
      const key = `${o.storeId}::${o.title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(o);
    }

    // Garante até 4 ofertas do Fort Atacadista + até 8 melhores ofertas dos demais mercados (12 no total)
    const fortOffers = deduped.filter((o) => o.isPreferred).sort((a, b) => a.price - b.price);
    const otherOffers = deduped.filter((o) => !o.isPreferred).sort((a, b) => a.price - b.price);
    const topSelection = [...fortOffers.slice(0, 4), ...otherOffers.slice(0, 8)]
      .sort((a, b) => a.price - b.price)
      .slice(0, 12);

    return {
      ingredientId: ing.id,
      nome: ing.nome,
      categoria: ing.categoria,
      precoAtual: Number(ing.preco || 0),
      quantidade: Number(ing.quantidade || 1),
      unidade: ing.unidade,
      obs: ing.obs || '',
      searchQuery: spec.vtexQuery || ing.nome,
      skipSupermarket: false,
      candidates: topSelection,
    };
  });
}

/**
 * Busca preços referenciais para equipamentos pendentes nas lojas locais de Florianópolis.
 */
export async function fetchLiveMarketOffersForEquipments(equipments) {
  const pending = (equipments || []).filter(
    (e) => e && !e.jaPago && !/mei|taxa|imposto|registro|adesivo|carimbo/i.test(e.nome || ''),
  );
  if (!pending.length) return [];

  const angeloni = MARKET_STORES.find((s) => s.id === 'angeloni-centro');
  const fort = MARKET_STORES.find((s) => s.id === 'fort-campeche');
  const fortEntries = fort ? await fetchOsuperSitemapIndex(fort.sitemapUrl) : [];

  return runWithConcurrency(pending, 4, async (eq) => {
    const query = sanitizeQuery(eq.nome).split(' ').slice(0, 4).join(' ');
    if (!query) return { equipmentId: eq.id, nome: eq.nome, valorAtual: Number(eq.valor || 0), candidates: [] };

    const spec = buildSearchSpecForIngredient({ id: eq.id, nome: eq.nome, categoria: 'Equipamentos' });
    const [vtexOffers, fortMap] = await Promise.all([
      angeloni ? fetchVtexStoreOffers(angeloni, { vtexQuery: query, exclude: [] }, 3) : [],
      (async () => {
        if (!fort || !fortEntries.length) return new Map();
        const matched = matchSitemapCandidates(fortEntries, spec, 3);
        const idMap = new Map(matched.map((m) => [m.id, m.url]));
        return fetchOsuperProductsBatch(fort, idMap);
      })(),
    ]);

    const candidates = [...fortMap.values(), ...vtexOffers]
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    return {
      equipmentId: eq.id,
      nome: eq.nome,
      valorAtual: Number(eq.valor || 0),
      candidates,
    };
  });
}
