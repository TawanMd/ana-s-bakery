# Ana's Bakery — Vitrine Web, Gestão Financeira e Central IA

Plataforma web em produção para confeitaria artesanal em Florianópolis/SC (**[anasbakery.vercel.app](https://anasbakery.vercel.app)**), reunindo vitrine de produtos, área administrativa financeira protegida e uma Central de Inteligência Artificial integrada ao Google Gemini.

<!-- Substitua pelos prints reais salvos em docs/screenshots/ -->
> 📸 **Screenshots:** adicione aqui capturas da vitrine pública, do painel financeiro e da Central IA (sem expor valores sensíveis ou credenciais).

---

## O Problema que Resolve

Pequenas confeitarias costumam controlar precificação, margem, compras e rendimento de receitas em planilhas manuais desatualizadas, perdendo margem quando insumos variam de preço. O projeto centraliza o catálogo público do negócio junto a um painel interno que automatiza cálculos financeiros e usa IA multimodal para apoiar decisões diárias.

---

## Principais Funcionalidades

### 1. Vitrine Pública
- Catálogo responsivo com identidade visual própria (`index.html`, `styles.css`, `script.js`).
- Hospedado na Vercel com URLs limpas (`cleanUrls: true`) e cache otimizado de assets.

### 2. Painel de Gestão Financeira (`/gestao`)
- Acesso protegido via edge/middleware proxy (`proxy.js`) com cookie assinado por sessão (`lib/auth.js`) e cabeçalhos `noindex, nofollow`.
- Persistência de estado financeiro com Vercel Blob (`lib/blob-store.js`, `/api/gestao-state`).
- Cálculo automatizado de custos unitários, margens e ROI (`lib/finance-engine.js`).

### 3. Central IA (`gestao-ai.js` + `/api/ai/*` + `@google/genai`)
- **Radar de Preços SC:** rotina agendada automaticamente (`vercel.json` — segundas e quintas às 07:00 BRT via `/api/cron/daily-price-sync`) para monitorar preços de insumos com proteção contra variações abruptas e suporte a rollback.
- **Consultor Financeiro IA:** assistente contextualizado nos dados do painel (`/api/ai/assistant`).
- **Leitor de Nota Fiscal (Visão):** extração de itens e valores a partir de fotos de cupons/notas fiscais.
- **Laboratório Criativo / Planejador de Metas:** apoio a novas receitas e planejamento financeiro (`/api/ai/tools`).

---

## Arquitetura

```text
ana-s-bakery/
├── index.html, script.js, styles.css      # Vitrine pública estática
├── gestao.html, gestao.js, gestao-ai.js   # Painel financeiro e interface da Central IA
├── proxy.js                               # Proteção de rotas (/gestao e /api/*) por sessão
├── vercel.json                            # Rotas, timeouts e agendamento (cron 2x/semana)
├── api/
│   ├── gestao-state.js                    # Leitura/escrita do estado financeiro
│   ├── ai/                                # Endpoints status, price-sync, assistant, tools
│   └── cron/daily-price-sync.js           # Job agendado de atualização de preços
└── lib/
    ├── auth.js                            # Assinatura e verificação de token de sessão
    ├── blob-store.js                      # Persistência no Vercel Blob
    ├── finance-engine.js                  # Regras de cálculo financeiro e ROI
    ├── gemini-client.js                   # Integração com @google/genai
    ├── market-prices.js                   # Referências e regras de mercado
    └── price-sync-service.js              # Orquestração da atualização de preços
```

---

## Variáveis de Ambiente

Crie um `.env.local` (via Vercel CLI) ou configure no painel do projeto na Vercel. **Nunca versione chaves reais.**

| Variável | Obrigatória | Descrição |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Sim (para Central IA) | Chave da API do Google Gemini usada por `@google/genai` |
| `GESTAO_PASSWORD` | Sim (para `/gestao`) | Senha de acesso ao painel administrativo |
| `GESTAO_AUTH_SECRET` | Sim (para `/gestao`) | Segredo usado na assinatura dos tokens de sessão em `lib/auth.js` |
| *(Vercel Blob Token)* | Em produção | Configurado automaticamente ao conectar o Vercel Blob Storage ao projeto |

---

## Como Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente (ou faça link com o projeto Vercel):
   ```bash
   npx vercel env pull .env.local
   ```
3. Inicie o ambiente local com suporte às Serverless Functions:
   ```bash
   npx vercel dev
   ```

---

## Roadmap

- [ ] **Pedidos diretos pelo site com paywall/pagamento:** carrinho, seleção de entrega/retirada e checkout integrado antes da confirmação do pedido.
- [ ] Testes automatizados das regras em `lib/finance-engine.js`.
- [ ] Pipeline de CI no GitHub Actions para lint e testes a cada pull request.
