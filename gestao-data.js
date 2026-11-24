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
  { id: 'leite-ninho', nome: 'Leite em pó Ninho', categoria: 'Laticínios', preco: 24.50, quantidade: 380, unidade: 'g', obs: 'Lata 380 g Integral/Forti+ (Fort Atacadista/SC)' },
  { id: 'creme-avela', nome: 'Creme de avelã (Nutella / Confeiteiro)', categoria: 'Chocolates & Cacau', preco: 48.00, quantidade: 650, unidade: 'g', obs: 'Pote 650 g Nutella (~R$48) ou Harald Confeiteiro 1 kg (~R$42)' },
  { id: 'emb-tortinha', nome: 'Embalagem p/ tortinha (G640/G650) + adesivo', categoria: 'Embalagens', preco: 0.90, quantidade: 1, unidade: 'un', obs: 'Pote PET c/ tampa Galvanotek G640/G650 (~R$0,55) + forminha/adesivo (~R$0,35)' },
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
    passos: [
      'Aquecer os 480 ml de leite com os 200 g de mel, 1,5 g de cravo, 8 g de canela e 2 g de noz-moscada até amornar e dissolver o mel.',
      'Peneirar em um bowl a farinha de trigo (360 g), o açúcar refinado (180 g), o chocolate em pó 50% (100 g), o bicarbonato (8 g) e o fermento (4 g).',
      'Despejar o leite morno aromatizado aos poucos sobre os secos, misturando com fouet até obter massa lisa e sem grumos (não bater em excesso).',
      'Despejar em assadeira untada/forrada e assar em forno preaquecido a 180 °C por cerca de 25 a 30 min (fazer o teste do palito).',
      'Deixar esfriar completamente antes de desenformar e cortar em 16 porções iguais.',
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
    passos: [
      'Dissolver os 4 g de café solúvel em 1 colher (sopa) do próprio creme de leite (ou poucas gotas de água morna) para não empelotar.',
      'Em panela de fundo grosso, misturar o leite condensado (790 g), o creme de leite (200 g), a margarina (5 g) e o café dissolvido.',
      'Cozinhar em fogo médio-baixo mexendo continuamente (raspando laterais e fundo) por 10 a 15 min até cair em blocos firmes da espátula (ponto de recheio cremoso).',
      'Transferir para um recipiente, cobrir com plástico filme em contato e aguardar esfriar totalmente antes de rechear.',
    ],
  },
  {
    id: 'sub-doce-de-leite',
    nome: 'Recheio de Doce de Leite (Leite Moça + Creme de Leite)',
    tipo: 'subreceita',
    rendimento: 495,
    unidadeRendimento: 'g',
    pesoReferencia: '1 lata cozida + 1/2 cx creme (~495 g)',
    custosIndiretosPct: 20,
    itens: [
      { tipo: 'insumo', refId: 'leite-moca-lata', quantidade: 395 },
      { tipo: 'insumo', refId: 'creme-de-leite', quantidade: 100 },
    ],
    passos: [
      'Retirar o rótulo de papel e toda a cola da lata fechada de Leite Moça (395 g).',
      'Acomodar a lata na panela de pressão e cobrir totalmente com água (pelo menos 2 dedos acima da lata).',
      'Tampar e, após pegar pressão, cozinhar em fogo baixo por 35 a 40 min para ponto cremoso firme.',
      'Desligar o fogo e deixar a pressão sair naturalmente. Só abrir a lata quando estiver 100% fria para evitar risco de queimadura.',
      'Transferir o doce de leite cozido para um bowl e misturar meia caixa de creme de leite (100 g) com fouet ou espátula até ficar liso, brilhante e cremoso (~495 g).',
    ],
  },
  {
    id: 'sub-massa-alfajor',
    nome: 'Massa de Alfajor Artesanal (30 discos)',
    tipo: 'subreceita',
    rendimento: 15,
    unidadeRendimento: 'porções',
    pesoReferencia: '15 pares / 30 discos (~520 g)',
    custosIndiretosPct: 15,
    itens: [
      { tipo: 'insumo', refId: 'farinha', quantidade: 200 },
      { tipo: 'insumo', refId: 'amido', quantidade: 100 },
      { tipo: 'insumo', refId: 'manteiga', quantidade: 120 },
      { tipo: 'insumo', refId: 'acucar-refinado', quantidade: 100 },
      { tipo: 'insumo', refId: 'ovos', quantidade: 2 },
      { tipo: 'insumo', refId: 'mel', quantidade: 20 },
      { tipo: 'insumo', refId: 'fermento', quantidade: 5 },
      { tipo: 'insumo', refId: 'baunilha', quantidade: 5 },
    ],
    passos: [
      'Bater a manteiga sem sal em ponto pomada (120 g) com o açúcar refinado (100 g), o mel (20 g) e a essência de baunilha (5 ml) até obter creme claro.',
      'Adicionar os 2 ovos aos poucos e misturar até incorporar bem.',
      'Juntar a farinha de trigo (200 g), o amido de milho (100 g) e o fermento (5 g) peneirados, misturando com as pontas dos dedos até formar massa lisa sem sovar.',
      'Envolver em plástico filme e descansar na geladeira por 30 min.',
      'Abrir com rolo (~4 mm de espessura), cortar 30 discos (~5 cm) e assar a 180 °C por 10 a 12 min (devem permanecer claros, sem dourar demais). Esfriar na assadeira.',
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
      { tipo: 'subreceita', refId: 'sub-doce-de-leite', quantidade: 20 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 1 },
    ],
    passos: [
      'Cortar 1 porção (1/16) da Massa Pão de Mel fria ao meio no sentido horizontal.',
      'Rechear uniformemente com 25 g de Brigadeiro de Café e 20 g de Doce de Leite Caseiro (ou em duas camadas).',
      'Fechar, alinhar as bordas com espátula e embalar na embalagem individual com o adesivo da Ana\'s Bakery.',
    ],
  },
  {
    id: 'prod-pao-mel-casquinha-sem-recheio',
    nome: 'Pão de Mel s/ Recheio c/ Casquinha Divine',
    tipo: 'produto',
    rendimento: 1,
    unidadeRendimento: 'un',
    pesoReferencia: '~100 g / un',
    custosIndiretosPct: 0,
    precoVendaDireta: 10.00,
    fornadasPlanejadas: 0,
    itens: [
      { tipo: 'subreceita', refId: 'sub-massa-pao-mel', quantidade: 1 },
      { tipo: 'insumo', refId: 'choc-nobre', quantidade: 15.625 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 1 },
    ],
    passos: [
      'Cortar 1 porção (1/16) da Massa Pão de Mel já fria (~84 g), mantendo-a inteira (sem cortar ao meio e sem rechear).',
      'Picar e derreter o Chocolate Nobre Divine (250 g para a fornada de 16 unidades, ~15,6 g por unidade) de 30 em 30 s no micro-ondas ou banho-maria, fazendo a temperagem (28–29 °C) para garantir casquinha crocante e brilhante.',
      'Banhar o pão de mel no chocolate temperado com garfo de confeitaria, escorrer o excesso dando leves batidinhas e apoiar sobre papel manteiga.',
      'Levar à geladeira por 5 a 10 min apenas até a casquinha cristalizar e soltar do papel; embalar individualmente com o adesivo da Ana\'s Bakery.',
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
      { tipo: 'subreceita', refId: 'sub-doce-de-leite', quantidade: 160 },
      { tipo: 'insumo', refId: 'emb-familia', quantidade: 1 },
    ],
    passos: [
      'Separar meia assadeira (8/16 da Massa Pão de Mel fria) e cortar ao meio na horizontal com faca de serra longa ou nivelador.',
      'Espalhar de forma uniforme 200 g de Brigadeiro de Café e 160 g de Doce de Leite Caseiro sobre a base.',
      'Posicionar a tampa da massa, nivelar as laterais e acomodar com cuidado na caixa tamanho família/gigante.',
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
    passos: [
      'Em panela de fundo grosso, dissolver o cacau 100% peneirado (25 g) no leite condensado (395 g) antes de ligar o fogo; depois juntar o creme de leite (100 g) e a manteiga (15 g).',
      'Cozinhar em fogo médio-baixo mexendo sem parar até atingir ponto de enrolar (a massa solta totalmente do fundo ao inclinar a panela).',
      'Transferir para prato coberto com plástico filme em contato e descansar por no mínimo 4 horas (ou geladeira) até firmar.',
      'Pesar 20 porções (~20 g cada), bolear, passar nos 80 g de granulado gourmet e acomodar nas embalagens individuais.',
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
      { tipo: 'subreceita', refId: 'sub-massa-alfajor', quantidade: 15 },
      { tipo: 'subreceita', refId: 'sub-doce-de-leite', quantidade: 400 },
      { tipo: 'insumo', refId: 'cobertura-frac', quantidade: 350 },
      { tipo: 'insumo', refId: 'emb-individual', quantidade: 15 },
    ],
    passos: [
      'Separar os 30 discos frios da Massa de Alfajor em 15 pares.',
      'Rechear cada par com ~26 g de Doce de Leite Caseiro (total 400 g nos 15 un) usando saco de confeitar e pressionar levemente para nivelar a borda.',
      'Derreter a cobertura fracionada (350 g) no micro-ondas em intervalos de 30 s (ou banho-maria) sem superaquecer.',
      'Banhar cada alfajor com garfo de confeitaria, escorrer o excesso sobre papel manteiga e gelar por ~10 min até secar. Embalar individualmente.',
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
    passos: [
      'Derreter os 250 g de cobertura fracionada e banhar o interior e a borda das 10 casquinhas para impermeabilizar (mantém a crocância); deixar secar.',
      'Preparar o recheio trufado cozinhando o leite condensado (395 g), o creme de leite (200 g) e o chocolate nobre (80 g) até ponto cremoso firme; deixar esfriar totalmente.',
      'Rechear os 10 cones com saco de confeitar, fechar o topo/base com cobertura fracionada, aguardar cristalizar e embalar individualmente.',
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
    passos: [
      'Misturar a manteiga sem sal (150 g) com o açúcar mascavo (150 g) e o açúcar refinado (80 g) até ficar homogêneo; acrescentar o ovo e a baunilha (5 ml).',
      'Incorporar a farinha de trigo (280 g) e o fermento (5 g) rapidamente (sem desenvolver glúten) e dobrar os 250 g de chocolate nobre em gotas/picado.',
      'Porcionar 10 bolas altas rústicas (~90 g cada) e gelar ou congelar por no mínimo 30 a 60 min antes de assar.',
      'Assar em assadeira com espaço entre os cookies a 190–200 °C por 11 a 13 min (bordas douradas e centro ainda macio). Descansar 10 min na forma antes de embalar.',
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
    passos: [
      'Derreter juntos os 250 g de chocolate nobre e os 150 g de manteiga sem sal (banho-maria ou micro-ondas de 30 em 30 s) e reservar para amornar.',
      'Bater os 3 ovos com os 200 g de açúcar refinado por ~3 min até clarear e espumar (essencial para formar a casquinha craquelada).',
      'Incorporar o chocolate derretido e, em seguida, peneirar a farinha (100 g) e o cacau 100% (30 g), mexendo delicadamente com espátula.',
      'Assar em forma quadrada forrada (20x20 cm) a 180 °C por 22 a 26 min (palito sai levemente úmido com migalhas). Esfriar totalmente antes de cortar em 12 pedaços e embalar.',
    ],
  },
  {
    id: 'prod-tortinha-ninho-avela',
    nome: 'Tortinha de Leite Ninho c/ Creme de Avelã (14 cm circ.)',
    tipo: 'produto',
    rendimento: 20,
    unidadeRendimento: 'un',
    pesoReferencia: '20 un • 14 cm circ. (~4,5 cm diâm. / ~115 g)',
    custosIndiretosPct: 15,
    precoVendaDireta: 9.00,
    fornadasPlanejadas: 0,
    itens: [
      { tipo: 'insumo', refId: 'farinha', quantidade: 720 },
      { tipo: 'insumo', refId: 'acucar-refinado', quantidade: 540 },
      { tipo: 'insumo', refId: 'margarina', quantidade: 120 },
      { tipo: 'insumo', refId: 'ovos', quantidade: 1 },
      { tipo: 'insumo', refId: 'baunilha', quantidade: 0.5 },
      { tipo: 'insumo', refId: 'fermento', quantidade: 15 },
      { tipo: 'insumo', refId: 'leite-condensado', quantidade: 395 },
      { tipo: 'insumo', refId: 'creme-de-leite', quantidade: 400 },
      { tipo: 'insumo', refId: 'leite-ninho', quantidade: 45 },
      { tipo: 'insumo', refId: 'creme-avela', quantidade: 200 },
      { tipo: 'insumo', refId: 'emb-tortinha', quantidade: 20 },
    ],
    passos: [
      'Massa: misturar 6 xícaras de farinha de trigo (720 g), 3 xícaras de açúcar refinado (540 g), 6 colheres (sopa) de margarina (120 g), 1 ovo, 10 gotas de essência de baunilha (0,5 ml) e 1 colher (sopa) de fermento químico (15 g) até formar uma massa moldável (dica: se ficar esfarelando/seca, conferir a quantidade de margarina até dar liga sem grudar).',
      'Modelar a massa em 20 forminhas de tortinha (~14 cm de circunferência / ~4,5 cm de diâmetro), furar levemente o fundo com garfo e assar em forno preaquecido a 180 °C por cerca de 15 a 20 min até dourar levemente as bordas; esfriar totalmente antes de desenformar.',
      'Recheio 1 (Creme de Leite Ninho): em panela de fundo grosso, dissolver 3 colheres (sopa) de Leite Ninho (45 g) em 1 lata/cx de leite condensado (395 g) antes de ligar o fogo, juntar 1 caixa de creme de leite (200 g) e cozinhar em fogo médio-baixo mexendo sempre até ponto cremoso firme (~10 a 12 min). Cobrir com filme em contato e esfriar.',
      'Recheio 2 (Ganache de Creme de Avelã): misturar 1 caixa de creme de leite (200 g) com 10 colheres (sopa) de creme de avelã (200 g) até obter um creme liso e homogêneo (se necessário, amornar por 15 s para facilitar a emulsão) e levar à geladeira por 20–30 min para ganhar ponto firme.',
      'Montagem e Embalagem: com as casquinhas e recheios frios, rechear as 20 tortinhas em camadas de Creme de Leite Ninho (~27 g) e Ganache de Creme de Avelã (~20 g), finalizar a cobertura e acomodar nas embalagens individuais com tampa (G640/G650) e adesivo da Ana\'s Bakery.',
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
    cliente: '1ª Venda Oficial — Pão de Mel Gigante',
    contato: 'Presencial',
    dataEntrega: '2026-11-16',
    status: 'confirmado',
    itens: [
      { recipeId: 'prod-pao-mel-gigante', quantidade: 1 },
    ],
    custoExtra: 0,
    precoCobrado: 55.00,
    sinalPago: 55.00,
    observacoes: 'Primeira venda oficial da Ana\'s Bakery! Pão de Mel Gigante vendido por R$ 55,00 (Lucro líquido real: R$ 18,22 / 33,1% de margem).',
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
