/**
 * Ana's Bakery — Controlador da Aplicação Financeira
 */

(function () {
  'use strict';

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeState(parsed) {
    if (parsed && Array.isArray(parsed.ingredients) && Array.isArray(parsed.recipes)) {
      return {
        config: { ...clone(DEFAULT_CONFIG), ...(parsed.config || {}) },
        ingredients: parsed.ingredients,
        recipes: parsed.recipes,
        equipments: Array.isArray(parsed.equipments) ? parsed.equipments : clone(DEFAULT_EQUIPMENTS),
        combo: parsed.combo ? { ...clone(DEFAULT_COMBO), ...parsed.combo } : clone(DEFAULT_COMBO),
        mix: parsed.mix || { direto: 60, basico: 25, entrega: 15 },
        periodo: parsed.periodo || 'Semanal',
        internalOrders: Array.isArray(parsed.internalOrders) ? parsed.internalOrders : clone(DEFAULT_INTERNAL_ORDERS),
      };
    }
    return {
      config: clone(DEFAULT_CONFIG),
      ingredients: clone(DEFAULT_INGREDIENTS),
      recipes: clone(DEFAULT_RECIPES),
      equipments: clone(DEFAULT_EQUIPMENTS),
      combo: clone(DEFAULT_COMBO),
      mix: { direto: 60, basico: 25, entrega: 15 },
      periodo: 'Semanal',
      internalOrders: clone(DEFAULT_INTERNAL_ORDERS),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return normalizeState(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage:', e);
    }
    return normalizeState(null);
  }

  let state = loadState();
  let activeTab = 'dashboard';
  let recipeFilter = 'todos';
  let cloudSyncTimer = null;
  let lastCloudUpdatedAt = null;
  let isPushingCloud = false;

  function setStatusBadge(text, variant = 'gold') {
    const badge = document.getElementById('badge-storage-status');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `badge badge-${variant}`;
  }

  function formatHora(iso) {
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  async function pushToCloud() {
    if (window.location.protocol === 'file:') return;
    isPushingCloud = true;
    setStatusBadge('Salvando na nuvem...', 'amber');
    try {
      const res = await fetch('/api/gestao-state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: state }),
        keepalive: true,
      });
      if (res.status === 401) {
        window.location.href = '/gestao';
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      lastCloudUpdatedAt = json.updatedAt || new Date().toISOString();
      setStatusBadge(`Salvo na nuvem • ${formatHora(lastCloudUpdatedAt)}`, 'olive');
    } catch (err) {
      console.warn('Falha ao salvar na nuvem:', err);
      setStatusBadge('Offline (salvo local)', 'terracotta');
    } finally {
      isPushingCloud = false;
    }
  }

  async function syncFromCloud({ silent = false, showFeedback = false } = {}) {
    if (window.location.protocol === 'file:') {
      setStatusBadge('Modo local (arquivo)', 'gold');
      return;
    }
    if (!silent) setStatusBadge('Sincronizando nuvem...', 'gold');
    try {
      const res = await fetch('/api/gestao-state', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/gestao';
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();

      if (json.exists && json.data) {
        const changed = json.updatedAt && json.updatedAt !== lastCloudUpdatedAt;
        lastCloudUpdatedAt = json.updatedAt;
        if (changed || !silent) {
          state = normalizeState(json.data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          renderActiveTab();
        }
        setStatusBadge(`Salvo na nuvem • ${formatHora(lastCloudUpdatedAt)}`, 'olive');
        if (showFeedback) showToast('Dados atualizados da nuvem!');
      } else {
        // Primeira vez: inicializa a nuvem com o estado atual
        await pushToCloud();
      }
    } catch (err) {
      console.warn('Falha ao sincronizar nuvem:', err);
      setStatusBadge('Offline (cache local)', 'amber');
      if (showFeedback) showToast('Não foi possível conectar à nuvem.');
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Erro ao salvar localStorage:', e);
    }
    if (window.location.protocol === 'file:') {
      setStatusBadge('Salvo localmente', 'gold');
      return;
    }
    setStatusBadge('Alterações pendentes...', 'amber');
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      cloudSyncTimer = null;
      pushToCloud();
    }, 450);
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ======================== NAVEGAÇÃO ========================
  const TAB_META = {
    dashboard: {
      title: 'Visão Geral Financeira',
      subtitle: 'Resumo de custos, margens e projeção de lucro — Ana\'s Bakery',
    },
    insumos: {
      title: 'Insumos & Embalagens',
      subtitle: 'Estoque base com cálculo automático de custo por grama, ml ou unidade',
    },
    receitas: {
      title: 'Fichas Técnicas & Receitas',
      subtitle: 'Sub-receitas, produtos finais, rendimento real e custos indiretos (gás/luz/perdas)',
    },
    precificacao: {
      title: 'Precificação Multi-Canal & Combos',
      subtitle: 'Compare Venda Direta vs. iFood Plano Básico e Plano Entrega protegendo sua margem',
    },
    investimento: {
      title: 'Planejador de Investimento & Compras',
      subtitle: 'Lista de compras agrupada, capital de giro, ponto de equilíbrio e projeção de lucro',
    },
    pedidos: {
      title: 'Pedidos Internos (Presenciais)',
      subtitle: 'Orçamentos e encomendas diretas sem taxa de app, com preço garantido para gerar lucro',
    },
  };

  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabId}`));
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    const meta = TAB_META[tabId];
    if (meta) {
      document.getElementById('topbar-title').textContent = meta.title;
      document.getElementById('topbar-subtitle').textContent = meta.subtitle;
    }
    renderActiveTab();
  }

  function renderActiveTab() {
    if (activeTab === 'dashboard') renderDashboard();
    else if (activeTab === 'insumos') renderInsumos();
    else if (activeTab === 'receitas') renderReceitas();
    else if (activeTab === 'precificacao') renderPrecificacao();
    else if (activeTab === 'investimento') renderInvestimento();
    else if (activeTab === 'pedidos') renderPedidosInternos();
  }

  // ======================== NORMALIZAÇÃO DO MIX ========================
  function getNormalizedMix() {
    const d = Number(state.mix.direto || 0);
    const b = Number(state.mix.basico || 0);
    const e = Number(state.mix.entrega || 0);
    const sum = d + b + e;
    if (sum <= 0) return { direto: 100, basico: 0, entrega: 0 };
    return {
      direto: (d / sum) * 100,
      basico: (b / sum) * 100,
      entrega: (e / sum) * 100,
    };
  }

  // ======================== TAB 1: DASHBOARD ========================
  function renderDashboard() {
    const mix = getNormalizedMix();
    const proj = calculateShoppingListAndProjection(state, mix);
    const produtos = proj.productSummaries;
    const lowMarginCount = produtos.filter((p) => p.pricing.status !== 'saudavel').length;
    const margemMedia = produtos.length
      ? produtos.reduce((acc, p) => acc + p.pricing.margemDiretaPct, 0) / produtos.length
      : 0;

    document.getElementById('dashboard-kpis').innerHTML = `
      <div class="kpi-card">
        <span class="kpi-label">Faturamento Projetado (${escapeHtml(state.periodo)})</span>
        <span class="kpi-value gold">${formatBRL(proj.receitaBrutaMix)}</span>
        <span class="kpi-sub">${proj.totalUnidadesProduzidas} unidades planejadas</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Lucro Líquido Estimado</span>
        <span class="kpi-value ${proj.lucroLiquidoMix >= 0 ? 'olive' : 'terracotta'}">${formatBRL(proj.lucroLiquidoMix)}</span>
        <span class="kpi-sub">Já descontando insumos, gás/luz e taxas iFood</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Margem Média (Venda Direta)</span>
        <span class="kpi-value ${margemMedia >= state.config.margemMinima ? 'olive' : 'terracotta'}">${formatNum(margemMedia, 1)}%</span>
        <span class="kpi-sub">Meta mínima: ${formatNum(state.config.margemMinima, 1)}%</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Alertas de Margem</span>
        <span class="kpi-value ${lowMarginCount === 0 ? 'olive' : 'terracotta'}">${lowMarginCount}</span>
        <span class="kpi-sub">${lowMarginCount === 0 ? 'Todos os doces saudáveis' : 'Produtos abaixo da meta mínima'}</span>
      </div>
    `;

    // Barras de margem
    const barsHtml = produtos.map((p) => {
      const m = Math.max(0, Math.min(100, p.pricing.margemDiretaPct));
      const color = p.pricing.status === 'saudavel'
        ? 'var(--olive)'
        : (p.pricing.status === 'baixa' ? 'var(--caramel)' : 'var(--terracotta)');
      return `
        <div class="bar-chart-row">
          <div class="bar-label" title="${escapeHtml(p.recipe.nome)}">${escapeHtml(p.recipe.nome)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${m.toFixed(1)}%; background:${color};"></div>
          </div>
          <div class="bar-val" style="color:${color};">${formatNum(p.pricing.margemDiretaPct, 1)}%</div>
        </div>
      `;
    }).join('');
    document.getElementById('dashboard-margins-bars').innerHTML = barsHtml || '<p class="card-desc">Nenhum produto cadastrado.</p>';

    // Gráfico SVG de composição
    document.getElementById('dashboard-projection-svg').innerHTML = buildFinancialSvgChart(proj);

    // Tabela resumo
    const tbody = document.getElementById('dashboard-summary-tbody');
    tbody.innerHTML = produtos.map((p) => {
      const badgeClass = p.pricing.status === 'saudavel'
        ? 'badge-olive'
        : (p.pricing.status === 'baixa' ? 'badge-amber' : 'badge-terracotta');
      return `
        <tr>
          <td><strong>${escapeHtml(p.recipe.nome)}</strong></td>
          <td class="td-right">${formatBRL(p.custoUnitario)}</td>
          <td class="td-right"><strong>${formatBRL(p.pricing.precoDireto)}</strong></td>
          <td class="td-right">${formatBRL(p.pricing.lucroDireto)}</td>
          <td class="td-right"><span class="badge ${badgeClass}">${formatNum(p.pricing.margemDiretaPct, 1)}%</span></td>
          <td class="td-right">${formatBRL(p.pricing.ifoodBasico.preco)}</td>
          <td class="td-right">${formatBRL(p.pricing.ifoodEntrega.preco)}</td>
        </tr>
      `;
    }).join('');
  }

  function buildFinancialSvgChart(proj) {
    const items = [
      { label: 'Receita Bruta', val: proj.receitaBrutaMix, color: '#C58C3E' },
      { label: 'Custo Produção', val: proj.custoProducaoTotal, color: '#8A5A44' },
      { label: 'Taxas iFood', val: proj.taxasAppMix, color: '#E5A93B' },
      { label: 'Lucro Líquido', val: Math.max(0, proj.lucroLiquidoMix), color: '#4F7242' },
    ];
    const maxVal = Math.max(1, ...items.map((i) => i.val));
    const width = 460;
    const height = 210;
    const barW = 68;
    const gap = 36;
    const startX = 36;
    const baseY = 165;
    const maxBarH = 125;

    const bars = items.map((item, idx) => {
      const x = startX + idx * (barW + gap);
      const h = Math.max(4, (item.val / maxVal) * maxBarH);
      const y = baseY - h;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="8" fill="${item.color}" />
          <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#3C1F15">${formatBRL(item.val)}</text>
          <text x="${x + barW / 2}" y="${baseY + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#765748">${item.label}</text>
        </g>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="210" role="img" aria-label="Gráfico financeiro de projeção">
        <line x1="20" y1="${baseY}" x2="${width - 20}" y2="${baseY}" stroke="#E6D5B8" stroke-width="1.5" />
        ${bars}
      </svg>
    `;
  }

  // ======================== TAB 2: INSUMOS ========================
  function renderInsumos() {
    const search = (document.getElementById('insumo-search').value || '').toLowerCase();
    const catFilter = document.getElementById('insumo-cat-filter').value;

    // Atualiza opções de categoria
    const cats = [...new Set(state.ingredients.map((i) => i.categoria))].sort();
    const catSelect = document.getElementById('insumo-cat-filter');
    const prevVal = catSelect.value;
    catSelect.innerHTML = `<option value="todas">Todas as categorias</option>` +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    catSelect.value = cats.includes(prevVal) ? prevVal : 'todas';

    const filtered = state.ingredients.filter((ing) => {
      const matchSearch = ing.nome.toLowerCase().includes(search) || (ing.obs || '').toLowerCase().includes(search);
      const matchCat = catFilter === 'todas' || ing.categoria === catFilter;
      return matchSearch && matchCat;
    });

    const tbody = document.getElementById('insumos-tbody');
    tbody.innerHTML = filtered.map((ing) => {
      const unitCost = getIngredientUnitCost(ing);
      return `
        <tr data-ing-id="${escapeHtml(ing.id)}">
          <td>
            <input class="input-inline" data-field="nome" value="${escapeHtml(ing.nome)}" />
          </td>
          <td>
            <input class="input-inline" data-field="categoria" value="${escapeHtml(ing.categoria)}" style="min-width:120px;" />
          </td>
          <td class="td-right">
            <input class="input-inline input-num" type="number" step="0.01" min="0" data-field="preco" value="${ing.preco}" style="max-width:95px;" />
          </td>
          <td class="td-right">
            <input class="input-inline input-num" type="number" step="0.1" min="0.1" data-field="quantidade" value="${ing.quantidade}" style="max-width:95px;" />
          </td>
          <td>
            <select class="input-inline" data-field="unidade" style="min-width:68px;">
              <option value="g" ${ing.unidade === 'g' ? 'selected' : ''}>g</option>
              <option value="ml" ${ing.unidade === 'ml' ? 'selected' : ''}>ml</option>
              <option value="un" ${ing.unidade === 'un' ? 'selected' : ''}>un</option>
            </select>
          </td>
          <td class="td-right">
            <strong class="ing-unit-cost" style="color:var(--gold-dark);">${formatBRL(unitCost, 4)} / ${escapeHtml(ing.unidade)}</strong>
          </td>
          <td class="td-right">
            <button class="btn btn-danger-ghost btn-sm btn-del-ing" type="button" title="Excluir insumo">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ======================== TAB 3: RECEITAS ========================
  function renderReceitas() {
    const grid = document.getElementById('recipes-grid');
    const filtered = state.recipes.filter((r) => recipeFilter === 'todos' || r.tipo === recipeFilter);

    grid.innerHTML = filtered.map((rec) => {
      const calc = calculateRecipeCost(rec.id, state);
      const isSub = rec.tipo === 'subreceita';
      const itemsHtml = calc.breakdown.map((b) => `
        <li class="recipe-item-row">
          <span class="recipe-item-name">
            ${formatNum(b.quantidade, b.quantidade % 1 === 0 ? 0 : 1)} ${escapeHtml(b.unidade)} • ${escapeHtml(b.nome)}
            ${b.tipo === 'subreceita' ? '<span class="badge badge-gold" style="padding:1px 6px;font-size:0.68rem;">Sub</span>' : ''}
          </span>
          <span class="recipe-item-cost">${formatBRL(b.custoTotal)}</span>
        </li>
      `).join('');

      return `
        <article class="recipe-card" data-recipe-id="${escapeHtml(rec.id)}">
          <div class="recipe-card-head">
            <div>
              <span class="badge ${isSub ? 'badge-gold' : 'badge-olive'}" style="margin-bottom:6px;">
                ${isSub ? 'Sub-receita (Massa / Recheio)' : 'Produto Final'}
              </span>
              <h3 style="font-size:1.12rem;">${escapeHtml(rec.nome)}</h3>
            </div>
            <button class="btn btn-secondary btn-sm btn-edit-recipe" type="button">Editar Ficha</button>
          </div>

          <div class="recipe-meta-row">
            <div class="recipe-meta-item">
              <label>Rendimento Real</label>
              <div style="display:flex; align-items:center; gap:5px;">
                <input class="input-inline input-num rec-inline-rend" type="number" step="1" min="1" value="${rec.rendimento}" style="max-width:66px;" />
                <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(rec.unidadeRendimento)}</span>
              </div>
            </div>
            <div class="recipe-meta-item">
              <label>Indiretos (Gás/Luz)</label>
              <div style="display:flex; align-items:center; gap:4px;">
                <input class="input-inline input-num rec-inline-ind" type="number" step="1" min="0" max="100" value="${rec.custosIndiretosPct}" style="max-width:60px;" />
                <span style="font-size:0.8rem; color:var(--text-muted);">%</span>
              </div>
            </div>
            <div class="recipe-meta-item">
              <label>Custo Unitário</label>
              <div class="recipe-meta-val rec-unit-cost" style="color:var(--gold-dark); font-size:1.05rem;">
                ${formatBRL(calc.custoUnitario)}
              </div>
            </div>
          </div>

          <ul class="recipe-items-list">
            ${itemsHtml}
            <li class="recipe-item-row" style="border-top:1px solid var(--border-gold); padding-top:6px; margin-top:4px; font-weight:700;">
              <span>Custos Indiretos (${formatNum(rec.custosIndiretosPct, 0)}%)</span>
              <span>${formatBRL(calc.custoIndiretos)}</span>
            </li>
            <li class="recipe-item-row" style="font-weight:800; color:var(--text-choco);">
              <span>Custo Total da Receita</span>
              <span>${formatBRL(calc.custoTotal)}</span>
            </li>
          </ul>
        </article>
      `;
    }).join('');
  }

  // ======================== TAB 4: PRECIFICAÇÃO & COMBOS ========================
  function renderPrecificacao() {
    document.getElementById('cfg-margem-min').value = state.config.margemMinima;
    document.getElementById('cfg-ifood-basico').value = state.config.taxaIfoodBasico;
    document.getElementById('cfg-ifood-entrega').value = state.config.taxaIfoodEntrega;

    const produtos = state.recipes.filter((r) => r.tipo === 'produto');
    const container = document.getElementById('pricing-cards-container');

    container.innerHTML = produtos.map((prod) => {
      const calc = calculateRecipeCost(prod.id, state);
      const p = calculateChannelPricing(calc.custoUnitario, Number(prod.precoVendaDireta || 0), state.config);
      const sliderMax = Math.max(25, Math.ceil(p.precoMinimoRecomendado * 2.5));

      let alertHtml = '';
      if (p.status === 'prejuizo') {
        alertHtml = `
          <div class="alert-banner terracotta">
            <span>⚠️ <strong>Prejuízo!</strong> O preço de ${formatBRL(p.precoDireto)} está abaixo do custo unitário (${formatBRL(p.custoUnitario)}). Recomendado mínimo: ${formatBRL(p.precoMinimoRecomendado)}.</span>
          </div>
        `;
      } else if (p.status === 'baixa') {
        alertHtml = `
          <div class="alert-banner amber">
            <span>⚡ <strong>Margem abaixo da meta (${formatNum(state.config.margemMinima, 0)}%):</strong> Margem atual de ${formatNum(p.margemDiretaPct, 1)}%. Para atingir a meta, cobre a partir de ${formatBRL(p.precoMinimoRecomendado)}.</span>
          </div>
        `;
      }

      const badgeClass = p.status === 'saudavel' ? 'badge-olive' : (p.status === 'baixa' ? 'badge-amber' : 'badge-terracotta');

      return `
        <div class="pricing-card ${p.status !== 'saudavel' ? 'alert-low' : ''}" data-pricing-id="${escapeHtml(prod.id)}">
          <div class="pricing-grid">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                <h3 style="font-size:1.1rem;">${escapeHtml(prod.nome)}</h3>
                <span class="badge ${badgeClass} pricing-badge">${formatNum(p.margemDiretaPct, 1)}% margem</span>
              </div>
              <div style="font-size:0.83rem; color:var(--text-muted); margin-bottom:10px;">
                Custo Unitário Exato: <strong style="color:var(--text-choco);">${formatBRL(p.custoUnitario)}</strong>
                • Sugerido p/ ${formatNum(state.config.margemMinima, 0)}%: <strong>${formatBRL(p.precoMinimoRecomendado)}</strong>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="range" class="price-slider" min="1" max="${sliderMax}" step="0.5" value="${p.precoDireto}" />
                <input type="number" class="input input-num price-input" min="0" step="0.5" value="${p.precoDireto.toFixed(2)}" style="width:96px;" />
              </div>
            </div>

            <div class="channel-box highlight">
              <div class="channel-label">Venda Direta (Insta/Whats)</div>
              <div class="channel-price pricing-direto-val">${formatBRL(p.precoDireto)}</div>
              <div class="channel-sub pricing-direto-lucro">
                Lucro líquido: <strong style="color:${p.lucroDireto >= 0 ? 'var(--olive)' : 'var(--terracotta)'}">${formatBRL(p.lucroDireto)}</strong>
              </div>
            </div>

            <div class="channel-box">
              <div class="channel-label">iFood Básico (${formatNum(state.config.taxaIfoodBasico, 1)}%)</div>
              <div class="channel-price pricing-basico-val">${formatBRL(p.ifoodBasico.preco)}</div>
              <div class="channel-sub pricing-basico-sub">
                Taxa: -${formatBRL(p.ifoodBasico.taxaRS)} • Líquido: ${formatBRL(p.ifoodBasico.liquido)}
              </div>
            </div>

            <div class="channel-box">
              <div class="channel-label">iFood Entrega (${formatNum(state.config.taxaIfoodEntrega, 1)}%)</div>
              <div class="channel-price pricing-entrega-val">${formatBRL(p.ifoodEntrega.preco)}</div>
              <div class="channel-sub pricing-entrega-sub">
                Taxa: -${formatBRL(p.ifoodEntrega.taxaRS)} • Líquido: ${formatBRL(p.ifoodEntrega.liquido)}
              </div>
            </div>
          </div>
          <div class="pricing-alert-slot">${alertHtml}</div>
        </div>
      `;
    }).join('');

    renderComboSimulator();
  }

  function renderComboSimulator() {
    document.getElementById('combo-nome').value = state.combo.nome;
    document.getElementById('combo-desconto').value = state.combo.descontoPct;
    document.getElementById('combo-emb-familia').checked = !!state.combo.incluirEmbalagemFamilia;

    const embFam = state.ingredients.find((i) => i.id === 'emb-familia');
    const embPrice = embFam ? getIngredientUnitCost(embFam) : 2.50;
    document.getElementById('combo-emb-price').textContent = formatBRL(embPrice);

    const produtos = state.recipes.filter((r) => r.tipo === 'produto');
    const listEl = document.getElementById('combo-items-list');

    listEl.innerHTML = state.combo.itens.map((item, idx) => `
      <div style="display:flex; gap:8px; align-items:center;" data-combo-idx="${idx}">
        <select class="select combo-item-select" style="flex:1;">
          ${produtos.map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === item.recipeId ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('')}
        </select>
        <input type="number" class="input input-num combo-item-qty" min="1" step="1" value="${item.quantidade}" style="width:74px;" />
        <button class="btn btn-danger-ghost btn-sm combo-item-del" type="button">✕</button>
      </div>
    `).join('');

    // Calcula totais do combo
    let custoCombo = state.combo.incluirEmbalagemFamilia ? embPrice : 0;
    let somaPrecosIndividuais = 0;

    for (const item of state.combo.itens) {
      const prod = state.recipes.find((r) => r.id === item.recipeId);
      if (!prod) continue;
      const calc = calculateRecipeCost(prod.id, state);
      const q = Math.max(0, Number(item.quantidade || 0));
      custoCombo += calc.custoUnitario * q;
      somaPrecosIndividuais += Number(prod.precoVendaDireta || 0) * q;
    }

    const descPct = Math.max(0, Math.min(90, Number(state.combo.descontoPct || 0)));
    const precoComboDireto = somaPrecosIndividuais * (1 - descPct / 100);
    const pricing = calculateChannelPricing(custoCombo, precoComboDireto, state.config);

    const badgeClass = pricing.status === 'saudavel' ? 'badge-olive' : (pricing.status === 'baixa' ? 'badge-amber' : 'badge-terracotta');

    document.getElementById('combo-result-box').innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="channel-label" style="margin:0;">Resultado do Combo</span>
          <span class="badge ${badgeClass}">${formatNum(pricing.margemDiretaPct, 1)}% margem</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">
          Soma avulsa: <s>${formatBRL(somaPrecosIndividuais)}</s> • Custo exato: <strong>${formatBRL(custoCombo)}</strong>
        </div>
        <div class="channel-price" style="font-size:1.75rem;">${formatBRL(precoComboDireto)} <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">(Venda Direta)</span></div>
        <div style="font-size:0.88rem; font-weight:700; color:${pricing.lucroDireto >= 0 ? 'var(--olive)' : 'var(--terracotta)'}; margin-top:4px;">
          Lucro líquido no bolso: ${formatBRL(pricing.lucroDireto)}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-top:12px; border-top:1px solid var(--border-gold);">
        <div>
          <div class="channel-label">iFood Básico</div>
          <strong style="font-size:1.05rem;">${formatBRL(pricing.ifoodBasico.preco)}</strong>
        </div>
        <div>
          <div class="channel-label">iFood Entrega</div>
          <strong style="font-size:1.05rem;">${formatBRL(pricing.ifoodEntrega.preco)}</strong>
        </div>
      </div>
    `;
  }

  // ======================== TAB 5: INVESTIMENTO & COMPRAS ========================
  function renderInvestimento() {
    document.getElementById('plan-periodo').value = state.periodo;
    document.getElementById('mix-direto').value = state.mix.direto;
    document.getElementById('mix-basico').value = state.mix.basico;
    document.getElementById('mix-entrega').value = state.mix.entrega;

    const mix = getNormalizedMix();
    document.getElementById('mix-direto-lbl').textContent = `${formatNum(mix.direto, 0)}%`;
    document.getElementById('mix-basico-lbl').textContent = `${formatNum(mix.basico, 0)}%`;
    document.getElementById('mix-entrega-lbl').textContent = `${formatNum(mix.entrega, 0)}%`;

    const proj = calculateShoppingListAndProjection(state, mix);

    document.getElementById('invest-kpis').innerHTML = `
      <div class="kpi-card">
        <span class="kpi-label">Capital de Giro (Insumos)</span>
        <span class="kpi-value gold">${formatBRL(proj.investimentoCompraFechada)}</span>
        <span class="kpi-sub">Compra fechada no atacado (consumo: ${formatBRL(proj.custoProporcionalConsumido)})</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Equipamentos &amp; Fixos</span>
        <span class="kpi-value">${formatBRL(proj.totalEquipamentos)}</span>
        <span class="kpi-sub">Investimento total inicial: ${formatBRL(proj.investimentoTotalInicial)}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Receita Bruta (${escapeHtml(state.periodo)})</span>
        <span class="kpi-value">${formatBRL(proj.receitaBrutaMix)}</span>
        <span class="kpi-sub">Taxas iFood: ${formatBRL(proj.taxasAppMix)}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Lucro Líquido Real</span>
        <span class="kpi-value ${proj.lucroLiquidoMix >= 0 ? 'olive' : 'terracotta'}">${formatBRL(proj.lucroLiquidoMix)}</span>
        <span class="kpi-sub">${proj.totalUnidadesProduzidas} doces produzidos</span>
      </div>
    `;

    // Tabela de produção
    document.getElementById('production-plan-tbody').innerHTML = proj.productSummaries.map((p) => `
      <tr data-plan-id="${escapeHtml(p.recipe.id)}">
        <td><strong>${escapeHtml(p.recipe.nome)}</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">Rende ${p.recipe.rendimento} ${escapeHtml(p.recipe.unidadeRendimento)}/fornada</span></td>
        <td class="td-right">
          <input class="input-inline input-num plan-fornadas-input" type="number" min="0" step="1" value="${p.fornadas}" style="max-width:74px;" />
        </td>
        <td class="td-right">${p.unidades} un</td>
        <td class="td-right">${formatBRL(p.custoTotalLote)}</td>
      </tr>
    `).join('');

    // Equipamentos
    document.getElementById('equipments-tbody').innerHTML = state.equipments.map((eq) => `
      <tr data-equip-id="${escapeHtml(eq.id)}">
        <td><input class="input-inline eq-nome-input" value="${escapeHtml(eq.nome)}" /></td>
        <td class="td-right"><input class="input-inline input-num eq-valor-input" type="number" step="1" min="0" value="${eq.valor}" style="max-width:100px;" /></td>
        <td class="td-right"><button class="btn btn-danger-ghost btn-sm eq-del-btn" type="button">✕</button></td>
      </tr>
    `).join('');

    // Ponto de Equilíbrio (Break-even)
    const totalInvest = proj.investimentoTotalInicial;
    const cyclesToPay = proj.lucroLiquidoMix > 0 ? totalInvest / proj.lucroLiquidoMix : Infinity;
    const unitsBreakEvenMix = proj.lucroMedioPorUnidade > 0 ? Math.ceil(totalInvest / proj.lucroMedioPorUnidade) : Infinity;

    const beRows = proj.productSummaries
      .filter((p) => p.pricing.lucroDireto > 0)
      .map((p) => {
        const unitsNeeded = Math.ceil(totalInvest / p.pricing.lucroDireto);
        return `
          <div style="display:flex; justify-content:space-between; font-size:0.84rem; padding:6px 0; border-bottom:1px dashed var(--border-gold);">
            <span>Se vender apenas <strong>${escapeHtml(p.recipe.nome)}</strong> (Direto):</span>
            <strong class="tabular">${unitsNeeded} un</strong>
          </div>
        `;
      }).join('');

    document.getElementById('breakeven-container').innerHTML = `
      <div style="background:var(--caramel-soft); border:1px solid var(--border-gold); border-radius:12px; padding:14px; margin-bottom:12px;">
        <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Investimento Total a Recuperar</div>
        <div style="font-family:var(--font-display); font-size:1.55rem; font-weight:800; color:var(--text-choco);">${formatBRL(totalInvest)}</div>
        <div style="font-size:0.84rem; margin-top:4px;">
          ${Number.isFinite(unitsBreakEvenMix)
            ? `No mix atual, você atinge o ponto de equilíbrio vendendo <strong>${unitsBreakEvenMix} unidades</strong> (~<strong>${formatNum(cyclesToPay, 1)}</strong> ciclos ${state.periodo.toLowerCase()}s).`
            : 'Ajuste os preços para ter lucro positivo e calcular o ponto de equilíbrio.'}
        </div>
      </div>
      <div>${beRows}</div>
    `;

    // Gráfico SVG
    document.getElementById('invest-chart-svg').innerHTML = buildFinancialSvgChart(proj);

    // Lista de Compras
    document.getElementById('shopping-list-tbody').innerHTML = proj.shoppingList.length
      ? proj.shoppingList.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.ingredient.nome)}</strong></td>
            <td class="td-right">${formatNum(item.needed, item.needed % 1 === 0 ? 0 : 1)} ${escapeHtml(item.ingredient.unidade)}</td>
            <td class="td-right"><strong>${item.packs}x</strong> (${item.ingredient.quantidade} ${escapeHtml(item.ingredient.unidade)})</td>
            <td class="td-right">${formatNum(item.sobra, item.sobra % 1 === 0 ? 0 : 1)} ${escapeHtml(item.ingredient.unidade)}</td>
            <td class="td-right">${formatBRL(item.custoConsumido)}</td>
            <td class="td-right"><strong style="color:var(--gold-dark);">${formatBRL(item.custoCompra)}</strong></td>
          </tr>
        `).join('')
      : '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">Defina pelo menos 1 fornada acima para gerar a lista de compras.</td></tr>';
  }

  // ======================== MODAL DE RECEITA ========================
  let modalRecipeDraft = null;

  function openRecipeModal(recipeId) {
    if (recipeId) {
      const existing = state.recipes.find((r) => r.id === recipeId);
      if (!existing) return;
      modalRecipeDraft = clone(existing);
      document.getElementById('recipe-modal-title').textContent = `Editar: ${existing.nome}`;
      document.getElementById('btn-delete-recipe').style.display = 'inline-flex';
    } else {
      modalRecipeDraft = {
        id: 'rec-' + Date.now(),
        nome: 'Nova Receita',
        tipo: 'produto',
        rendimento: 10,
        unidadeRendimento: 'un',
        custosIndiretosPct: state.config.custosIndiretosPadrao,
        precoVendaDireta: 12.00,
        fornadasPlanejadas: 1,
        itens: [],
      };
      document.getElementById('recipe-modal-title').textContent = 'Nova Receita / Sub-receita';
      document.getElementById('btn-delete-recipe').style.display = 'none';
    }

    document.getElementById('rm-id').value = modalRecipeDraft.id;
    document.getElementById('rm-nome').value = modalRecipeDraft.nome;
    document.getElementById('rm-tipo').value = modalRecipeDraft.tipo;
    document.getElementById('rm-rendimento').value = modalRecipeDraft.rendimento;
    document.getElementById('rm-unidade').value = modalRecipeDraft.unidadeRendimento;
    document.getElementById('rm-indiretos').value = modalRecipeDraft.custosIndiretosPct;

    renderModalItems();
    document.getElementById('recipe-modal-backdrop').classList.add('open');
  }

  function closeRecipeModal() {
    document.getElementById('recipe-modal-backdrop').classList.remove('open');
    modalRecipeDraft = null;
  }

  function renderModalItems() {
    const container = document.getElementById('rm-items-container');
    if (!modalRecipeDraft) return;
    const subs = state.recipes.filter((r) => r.tipo === 'subreceita' && r.id !== modalRecipeDraft.id);

    container.innerHTML = modalRecipeDraft.itens.map((item, idx) => {
      const optionsHtml = item.tipo === 'insumo'
        ? state.ingredients.map((i) => `<option value="${escapeHtml(i.id)}" ${i.id === item.refId ? 'selected' : ''}>${escapeHtml(i.nome)} (${escapeHtml(i.unidade)})</option>`).join('')
        : subs.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === item.refId ? 'selected' : ''}>[Sub] ${escapeHtml(s.nome)} (${escapeHtml(s.unidadeRendimento)})</option>`).join('');

      return `
        <div style="display:flex; gap:8px; align-items:center;" data-rm-idx="${idx}">
          <select class="select rm-item-ref" style="flex:1;">${optionsHtml}</select>
          <input type="number" step="0.1" min="0" class="input input-num rm-item-qty" value="${item.quantidade}" style="width:92px;" />
          <button class="btn btn-danger-ghost btn-sm rm-item-del" type="button">✕</button>
        </div>
      `;
    }).join('') || '<p style="font-size:0.84rem; color:var(--text-muted);">Adicione insumos ou sub-receitas abaixo.</p>';
  }

  // ======================== EVENTOS GLOBAIS ========================
  function bindEvents() {
    // Navegação tabs
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.querySelectorAll('[data-goto-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
    });

    // Backup JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anas-bakery-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup JSON exportado!');
    });

    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('input-import-file').click();
    });

    document.getElementById('input-import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed.ingredients || !parsed.recipes) throw new Error('Formato inválido');
          state = normalizeState(parsed);
          saveState();
          renderActiveTab();
          showToast('Backup importado com sucesso!');
        } catch (err) {
          alert('Não foi possível importar o arquivo JSON. Verifique se é um backup válido da Ana\'s Bakery.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    document.getElementById('btn-sync-cloud').addEventListener('click', () => {
      syncFromCloud({ silent: false, showFeedback: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !cloudSyncTimer && !isPushingCloud) {
        syncFromCloud({ silent: true });
      }
    });

    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm('Deseja restaurar todos os insumos, receitas e preços para os valores iniciais de fábrica para toda a equipe?')) {
        localStorage.removeItem(STORAGE_KEY);
        state = normalizeState(null);
        saveState();
        renderActiveTab();
        showToast('Dados iniciais restaurados!');
      }
    });

    // Insumos
    document.getElementById('insumo-search').addEventListener('input', renderInsumos);
    document.getElementById('insumo-cat-filter').addEventListener('change', renderInsumos);
    document.getElementById('btn-apply-fort-prices').addEventListener('click', () => {
      if (!confirm('Atualizar os preços dos insumos base com os valores pesquisados do Fort Atacadista Campeche / SC?')) return;
      const mapDefault = new Map(DEFAULT_INGREDIENTS.map((i) => [i.id, i]));
      state.ingredients = state.ingredients.map((ing) => {
        const ref = mapDefault.get(ing.id);
        return ref ? { ...ing, preco: ref.preco, quantidade: ref.quantidade, unidade: ref.unidade, obs: ref.obs } : ing;
      });
      for (const def of DEFAULT_INGREDIENTS) {
        if (!state.ingredients.some((i) => i.id === def.id)) {
          state.ingredients.push(clone(def));
        }
      }
      saveState();
      renderInsumos();
      showToast('Preços atualizados para a referência Fort Campeche / SC!');
    });

    document.getElementById('btn-add-insumo').addEventListener('click', () => {
      state.ingredients.unshift({
        id: 'ing-' + Date.now(),
        nome: 'Novo Insumo',
        categoria: 'Outros',
        preco: 10.00,
        quantidade: 1000,
        unidade: 'g',
        obs: '',
      });
      saveState();
      renderInsumos();
      showToast('Novo insumo adicionado no topo da tabela.');
    });

    document.getElementById('insumos-tbody').addEventListener('input', (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      const ing = state.ingredients.find((i) => i.id === tr.dataset.ingId);
      if (!ing) return;
      const field = e.target.dataset.field;
      if (!field) return;
      ing[field] = (field === 'preco' || field === 'quantidade') ? Number(e.target.value || 0) : e.target.value;
      saveState();
      const costCell = tr.querySelector('.ing-unit-cost');
      if (costCell) costCell.textContent = `${formatBRL(getIngredientUnitCost(ing), 4)} / ${ing.unidade}`;
    });

    document.getElementById('insumos-tbody').addEventListener('change', (e) => {
      if (e.target.dataset.field === 'unidade') {
        const tr = e.target.closest('tr');
        const ing = state.ingredients.find((i) => i.id === tr.dataset.ingId);
        if (ing) {
          ing.unidade = e.target.value;
          saveState();
          renderInsumos();
        }
      }
    });

    document.getElementById('insumos-tbody').addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-del-ing')) return;
      const tr = e.target.closest('tr');
      const id = tr.dataset.ingId;
      if (confirm('Excluir este insumo do estoque base?')) {
        state.ingredients = state.ingredients.filter((i) => i.id !== id);
        saveState();
        renderInsumos();
        showToast('Insumo removido.');
      }
    });

    // Receitas filtros & inline
    document.querySelectorAll('.recipe-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.recipe-filter').forEach((b) => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active');
        recipeFilter = btn.dataset.recipeFilter;
        renderReceitas();
      });
    });

    document.getElementById('btn-new-recipe').addEventListener('click', () => openRecipeModal(null));
    document.getElementById('btn-quick-new-recipe').addEventListener('click', () => openRecipeModal(null));

    document.getElementById('recipes-grid').addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit-recipe')) {
        const card = e.target.closest('.recipe-card');
        openRecipeModal(card.dataset.recipeId);
      }
    });

    document.getElementById('recipes-grid').addEventListener('input', (e) => {
      const card = e.target.closest('.recipe-card');
      if (!card) return;
      const rec = state.recipes.find((r) => r.id === card.dataset.recipeId);
      if (!rec) return;
      if (e.target.classList.contains('rec-inline-rend')) {
        rec.rendimento = Math.max(0.1, Number(e.target.value || 1));
      } else if (e.target.classList.contains('rec-inline-ind')) {
        rec.custosIndiretosPct = Math.max(0, Number(e.target.value || 0));
      } else {
        return;
      }
      saveState();
      const calc = calculateRecipeCost(rec.id, state);
      const unitEl = card.querySelector('.rec-unit-cost');
      if (unitEl) unitEl.textContent = formatBRL(calc.custoUnitario);
    });

    // Modal de receita
    document.getElementById('btn-close-recipe-modal').addEventListener('click', closeRecipeModal);
    document.getElementById('btn-cancel-recipe-modal').addEventListener('click', closeRecipeModal);

    document.getElementById('rm-add-insumo').addEventListener('click', () => {
      if (!modalRecipeDraft || !state.ingredients.length) return;
      modalRecipeDraft.itens.push({ tipo: 'insumo', refId: state.ingredients[0].id, quantidade: 100 });
      renderModalItems();
    });

    document.getElementById('rm-add-sub').addEventListener('click', () => {
      const subs = state.recipes.filter((r) => r.tipo === 'subreceita' && r.id !== modalRecipeDraft.id);
      if (!modalRecipeDraft || !subs.length) {
        alert('Nenhuma outra sub-receita disponível.');
        return;
      }
      modalRecipeDraft.itens.push({ tipo: 'subreceita', refId: subs[0].id, quantidade: 1 });
      renderModalItems();
    });

    document.getElementById('rm-items-container').addEventListener('change', (e) => {
      const row = e.target.closest('[data-rm-idx]');
      if (!row || !modalRecipeDraft) return;
      const idx = Number(row.dataset.rmIdx);
      if (e.target.classList.contains('rm-item-ref')) {
        modalRecipeDraft.itens[idx].refId = e.target.value;
      } else if (e.target.classList.contains('rm-item-qty')) {
        modalRecipeDraft.itens[idx].quantidade = Number(e.target.value || 0);
      }
    });

    document.getElementById('rm-items-container').addEventListener('click', (e) => {
      if (!e.target.classList.contains('rm-item-del')) return;
      const row = e.target.closest('[data-rm-idx]');
      const idx = Number(row.dataset.rmIdx);
      modalRecipeDraft.itens.splice(idx, 1);
      renderModalItems();
    });

    document.getElementById('btn-save-recipe-modal').addEventListener('click', () => {
      if (!modalRecipeDraft) return;
      modalRecipeDraft.nome = document.getElementById('rm-nome').value.trim() || 'Sem nome';
      modalRecipeDraft.tipo = document.getElementById('rm-tipo').value;
      modalRecipeDraft.rendimento = Math.max(0.1, Number(document.getElementById('rm-rendimento').value || 1));
      modalRecipeDraft.unidadeRendimento = document.getElementById('rm-unidade').value.trim() || 'un';
      modalRecipeDraft.custosIndiretosPct = Math.max(0, Number(document.getElementById('rm-indiretos').value || 0));

      const idx = state.recipes.findIndex((r) => r.id === modalRecipeDraft.id);
      if (idx >= 0) state.recipes[idx] = modalRecipeDraft;
      else state.recipes.push(modalRecipeDraft);

      saveState();
      closeRecipeModal();
      renderActiveTab();
      showToast('Receita salva com sucesso!');
    });

    document.getElementById('btn-delete-recipe').addEventListener('click', () => {
      if (!modalRecipeDraft) return;
      if (confirm(`Excluir "${modalRecipeDraft.nome}"?`)) {
        state.recipes = state.recipes.filter((r) => r.id !== modalRecipeDraft.id);
        saveState();
        closeRecipeModal();
        renderActiveTab();
        showToast('Receita excluída.');
      }
    });

    // Precificação & Configs
    ['cfg-margem-min', 'cfg-ifood-basico', 'cfg-ifood-entrega'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => {
        state.config.margemMinima = Number(document.getElementById('cfg-margem-min').value || 0);
        state.config.taxaIfoodBasico = Number(document.getElementById('cfg-ifood-basico').value || 0);
        state.config.taxaIfoodEntrega = Number(document.getElementById('cfg-ifood-entrega').value || 0);
        saveState();
        renderPrecificacao();
      });
    });

    document.getElementById('pricing-cards-container').addEventListener('input', (e) => {
      const card = e.target.closest('.pricing-card');
      if (!card) return;
      const prod = state.recipes.find((r) => r.id === card.dataset.pricingId);
      if (!prod) return;

      const val = Math.max(0, Number(e.target.value || 0));
      prod.precoVendaDireta = val;
      saveState();

      // Sincroniza o outro controle (slider <-> input)
      if (e.target.classList.contains('price-slider')) {
        card.querySelector('.price-input').value = val.toFixed(2);
      } else if (e.target.classList.contains('price-input')) {
        card.querySelector('.price-slider').value = val;
      }

      const calc = calculateRecipeCost(prod.id, state);
      const p = calculateChannelPricing(calc.custoUnitario, val, state.config);

      card.classList.toggle('alert-low', p.status !== 'saudavel');
      const badge = card.querySelector('.pricing-badge');
      badge.className = `badge pricing-badge ${p.status === 'saudavel' ? 'badge-olive' : (p.status === 'baixa' ? 'badge-amber' : 'badge-terracotta')}`;
      badge.textContent = `${formatNum(p.margemDiretaPct, 1)}% margem`;

      card.querySelector('.pricing-direto-val').textContent = formatBRL(p.precoDireto);
      card.querySelector('.pricing-direto-lucro').innerHTML = `Lucro líquido: <strong style="color:${p.lucroDireto >= 0 ? 'var(--olive)' : 'var(--terracotta)'}">${formatBRL(p.lucroDireto)}</strong>`;
      card.querySelector('.pricing-basico-val').textContent = formatBRL(p.ifoodBasico.preco);
      card.querySelector('.pricing-basico-sub').textContent = `Taxa: -${formatBRL(p.ifoodBasico.taxaRS)} • Líquido: ${formatBRL(p.ifoodBasico.liquido)}`;
      card.querySelector('.pricing-entrega-val').textContent = formatBRL(p.ifoodEntrega.preco);
      card.querySelector('.pricing-entrega-sub').textContent = `Taxa: -${formatBRL(p.ifoodEntrega.taxaRS)} • Líquido: ${formatBRL(p.ifoodEntrega.liquido)}`;

      let alertHtml = '';
      if (p.status === 'prejuizo') {
        alertHtml = `<div class="alert-banner terracotta"><span>⚠️ <strong>Prejuízo!</strong> O preço de ${formatBRL(p.precoDireto)} está abaixo do custo unitário (${formatBRL(p.custoUnitario)}). Recomendado mínimo: ${formatBRL(p.precoMinimoRecomendado)}.</span></div>`;
      } else if (p.status === 'baixa') {
        alertHtml = `<div class="alert-banner amber"><span>⚡ <strong>Margem abaixo da meta (${formatNum(state.config.margemMinima, 0)}%):</strong> Margem atual de ${formatNum(p.margemDiretaPct, 1)}%. Para atingir a meta, cobre a partir de ${formatBRL(p.precoMinimoRecomendado)}.</span></div>`;
      }
      card.querySelector('.pricing-alert-slot').innerHTML = alertHtml;
    });

    // Combos
    document.getElementById('combo-nome').addEventListener('input', (e) => {
      state.combo.nome = e.target.value;
      saveState();
    });
    document.getElementById('combo-desconto').addEventListener('input', (e) => {
      state.combo.descontoPct = Number(e.target.value || 0);
      saveState();
      renderComboSimulator();
    });
    document.getElementById('combo-emb-familia').addEventListener('change', (e) => {
      state.combo.incluirEmbalagemFamilia = e.target.checked;
      saveState();
      renderComboSimulator();
    });
    document.getElementById('btn-add-combo-item').addEventListener('click', () => {
      const firstProd = state.recipes.find((r) => r.tipo === 'produto');
      if (!firstProd) return;
      state.combo.itens.push({ recipeId: firstProd.id, quantidade: 1 });
      saveState();
      renderComboSimulator();
    });
    document.getElementById('combo-items-list').addEventListener('change', (e) => {
      const row = e.target.closest('[data-combo-idx]');
      if (!row) return;
      const idx = Number(row.dataset.comboIdx);
      if (e.target.classList.contains('combo-item-select')) {
        state.combo.itens[idx].recipeId = e.target.value;
      } else if (e.target.classList.contains('combo-item-qty')) {
        state.combo.itens[idx].quantidade = Math.max(1, Number(e.target.value || 1));
      }
      saveState();
      renderComboSimulator();
    });
    document.getElementById('combo-items-list').addEventListener('click', (e) => {
      if (!e.target.classList.contains('combo-item-del')) return;
      const row = e.target.closest('[data-combo-idx]');
      state.combo.itens.splice(Number(row.dataset.comboIdx), 1);
      saveState();
      renderComboSimulator();
    });

    // Investimento & Compras
    document.getElementById('plan-periodo').addEventListener('change', (e) => {
      state.periodo = e.target.value;
      saveState();
      renderInvestimento();
    });

    ['mix-direto', 'mix-basico', 'mix-entrega'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => {
        state.mix.direto = Number(document.getElementById('mix-direto').value || 0);
        state.mix.basico = Number(document.getElementById('mix-basico').value || 0);
        state.mix.entrega = Number(document.getElementById('mix-entrega').value || 0);
        saveState();
        renderInvestimento();
      });
    });

    document.getElementById('production-plan-tbody').addEventListener('input', (e) => {
      if (!e.target.classList.contains('plan-fornadas-input')) return;
      const tr = e.target.closest('tr');
      const rec = state.recipes.find((r) => r.id === tr.dataset.planId);
      if (!rec) return;
      rec.fornadasPlanejadas = Math.max(0, Number(e.target.value || 0));
      saveState();
      renderInvestimento();
    });

    document.getElementById('btn-add-equip').addEventListener('click', () => {
      state.equipments.push({ id: 'eq-' + Date.now(), nome: 'Novo Equipamento / Taxa', valor: 50.00 });
      saveState();
      renderInvestimento();
    });

    document.getElementById('equipments-tbody').addEventListener('input', (e) => {
      const tr = e.target.closest('tr');
      const eq = state.equipments.find((item) => item.id === tr.dataset.equipId);
      if (!eq) return;
      if (e.target.classList.contains('eq-nome-input')) eq.nome = e.target.value;
      else if (e.target.classList.contains('eq-valor-input')) eq.valor = Math.max(0, Number(e.target.value || 0));
      saveState();
      if (e.target.classList.contains('eq-valor-input')) renderInvestimento();
    });

    document.getElementById('equipments-tbody').addEventListener('click', (e) => {
      if (!e.target.classList.contains('eq-del-btn')) return;
      const tr = e.target.closest('tr');
      state.equipments = state.equipments.filter((item) => item.id !== tr.dataset.equipId);
      saveState();
      renderInvestimento();
    });

    document.getElementById('btn-copy-shopping').addEventListener('click', () => {
      const proj = calculateShoppingListAndProjection(state, getNormalizedMix());
      if (!proj.shoppingList.length) {
        showToast('Nenhum item na lista de compras.');
        return;
      }
      const lines = [
        `🛒 LISTA DE COMPRAS — ANA'S BAKERY (${state.periodo})`,
        `Capital de Giro Estimado: ${formatBRL(proj.investimentoCompraFechada)}`,
        '----------------------------------------',
        ...proj.shoppingList.map((i) => `• ${i.ingredient.nome}: ${i.packs}x emb. (${i.ingredient.quantidade} ${i.ingredient.unidade}) — ${formatBRL(i.custoCompra)}`),
      ];
      navigator.clipboard?.writeText(lines.join('\n')).then(() => {
        showToast('Lista de compras copiada!');
      }).catch(() => {
        showToast('Não foi possível copiar automaticamente.');
      });
    });

    // Pedidos Internos (Presenciais)
    document.getElementById('pedido-status-filter').addEventListener('change', renderPedidosInternos);

    document.getElementById('btn-add-pedido').addEventListener('click', () => {
      const firstProd = state.recipes.find((r) => r.tipo === 'produto');
      state.internalOrders.unshift({
        id: 'ped-' + Date.now(),
        cliente: 'Novo Pedido Presencial',
        contato: 'Presencial',
        dataEntrega: '',
        status: 'orcamento',
        itens: firstProd ? [{ recipeId: firstProd.id, quantidade: 1 }] : [],
        custoExtra: 0,
        precoCobrado: null,
        sinalPago: 0,
        observacoes: '',
      });
      saveState();
      renderPedidosInternos();
      showToast('Novo pedido presencial criado!');
    });

    const pedidosContainer = document.getElementById('pedidos-list-container');

    pedidosContainer.addEventListener('input', (e) => {
      const card = e.target.closest('.pedido-card');
      if (!card) return;
      const order = state.internalOrders.find((o) => o.id === card.dataset.orderId);
      if (!order) return;

      const field = e.target.dataset.orderField;
      if (field) {
        if (field === 'custoExtra' || field === 'sinalPago') {
          order[field] = Math.max(0, Number(e.target.value || 0));
        } else if (field === 'precoCobrado') {
          order.precoCobrado = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
        } else {
          order[field] = e.target.value;
        }
        saveState();
        updatePedidoFinancialSummary(card, order);
        renderPedidosKPIs();
        return;
      }

      if (e.target.classList.contains('pedido-item-qty')) {
        const row = e.target.closest('[data-item-idx]');
        const idx = Number(row.dataset.itemIdx);
        order.itens[idx].quantidade = Math.max(1, Number(e.target.value || 1));
        saveState();
        updatePedidoFinancialSummary(card, order);
        renderPedidosKPIs();
      }
    });

    pedidosContainer.addEventListener('change', (e) => {
      const card = e.target.closest('.pedido-card');
      if (!card) return;
      const order = state.internalOrders.find((o) => o.id === card.dataset.orderId);
      if (!order) return;

      if (e.target.dataset.orderField === 'status') {
        order.status = e.target.value;
        saveState();
        renderPedidosInternos();
      } else if (e.target.classList.contains('pedido-item-select')) {
        const row = e.target.closest('[data-item-idx]');
        const idx = Number(row.dataset.itemIdx);
        order.itens[idx].recipeId = e.target.value;
        saveState();
        renderPedidosInternos();
      }
    });

    pedidosContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.pedido-card');
      if (!card) return;
      const order = state.internalOrders.find((o) => o.id === card.dataset.orderId);
      if (!order) return;

      if (e.target.classList.contains('pedido-add-item')) {
        const firstProd = state.recipes.find((r) => r.tipo === 'produto');
        if (!firstProd) return;
        order.itens.push({ recipeId: firstProd.id, quantidade: 1 });
        saveState();
        renderPedidosInternos();
      } else if (e.target.classList.contains('pedido-del-item')) {
        const row = e.target.closest('[data-item-idx]');
        order.itens.splice(Number(row.dataset.itemIdx), 1);
        saveState();
        renderPedidosInternos();
      } else if (e.target.classList.contains('pedido-apply-sugerido')) {
        const calc = calculateInternalOrder(order, state);
        order.precoCobrado = calc.precoSugeridoSaudavel;
        saveState();
        renderPedidosInternos();
        showToast(`Preço sugerido de ${formatBRL(calc.precoSugeridoSaudavel)} aplicado!`);
      } else if (e.target.classList.contains('pedido-copy-quote')) {
        const calc = calculateInternalOrder(order, state);
        const itensTxt = calc.itensDetalhados.map((it) => `• ${it.quantidade}x ${it.recipe.nome}`).join('\n');
        const msg = [
          `Olá! Segue o orçamento da *Ana's Bakery* 🍫✨`,
          ``,
          itensTxt,
          order.dataEntrega ? `📅 Previsão de entrega/retirada: ${order.dataEntrega}` : '',
          `💰 *Valor Total:* ${formatBRL(calc.precoFinal)}`,
          order.sinalPago > 0 ? `✅ Sinal pago: ${formatBRL(order.sinalPago)} | Restante: ${formatBRL(calc.saldoReceber)}` : '',
          ``,
          `Produzido artesanalmente sob encomenda em Florianópolis!`,
        ].filter(Boolean).join('\n');
        navigator.clipboard?.writeText(msg).then(() => {
          showToast('Orçamento copiado para enviar ao cliente!');
        }).catch(() => {
          showToast('Não foi possível copiar automaticamente.');
        });
      } else if (e.target.classList.contains('pedido-delete-btn')) {
        if (confirm(`Excluir o pedido "${order.cliente}"?`)) {
          state.internalOrders = state.internalOrders.filter((o) => o.id !== order.id);
          saveState();
          renderPedidosInternos();
          showToast('Pedido excluído.');
        }
      }
    });
  }

  // ======================== TAB 6: PEDIDOS INTERNOS ========================
  const ORDER_STATUS_META = {
    orcamento: { label: 'Orçamento / Aguardando', badge: 'badge-gold' },
    confirmado: { label: 'Confirmado', badge: 'badge-olive' },
    producao: { label: 'Em Produção', badge: 'badge-amber' },
    entregue: { label: 'Entregue', badge: 'badge-olive' },
    cancelado: { label: 'Cancelado', badge: 'badge-terracotta' },
  };

  function renderPedidosKPIs() {
    const ativos = state.internalOrders.filter((o) => o.status !== 'cancelado');
    let faturamento = 0;
    let lucroTotal = 0;
    let saldoTotal = 0;

    for (const o of ativos) {
      const c = calculateInternalOrder(o, state);
      faturamento += c.precoFinal;
      lucroTotal += c.lucroLiquido;
      saldoTotal += c.saldoReceber;
    }

    document.getElementById('pedidos-kpis').innerHTML = `
      <div class="kpi-card">
        <span class="kpi-label">Pedidos Ativos</span>
        <span class="kpi-value gold">${ativos.length}</span>
        <span class="kpi-sub">Encomendas presenciais sem taxa iFood</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Faturamento dos Pedidos</span>
        <span class="kpi-value">${formatBRL(faturamento)}</span>
        <span class="kpi-sub">Total combinado com clientes</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Lucro Líquido Garantido</span>
        <span class="kpi-value ${lucroTotal >= 0 ? 'olive' : 'terracotta'}">${formatBRL(lucroTotal)}</span>
        <span class="kpi-sub">Já descontando insumos, gás/luz e extras</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Saldo a Receber</span>
        <span class="kpi-value gold">${formatBRL(saldoTotal)}</span>
        <span class="kpi-sub">Total menos sinais já pagos</span>
      </div>
    `;
  }

  function buildOrderAlertHtml(calc) {
    if (calc.statusMargem === 'prejuizo') {
      return `<div class="alert-banner terracotta"><span>⚠️ <strong>Prejuízo!</strong> O preço cobrado (${formatBRL(calc.precoFinal)}) não cobre o custo total (${formatBRL(calc.custoTotal)}). Cobre no mínimo ${formatBRL(calc.precoMinimoMeta)}.</span></div>`;
    }
    if (calc.statusMargem === 'baixa') {
      return `<div class="alert-banner amber"><span>⚡ <strong>Margem abaixo da meta (${formatNum(calc.margemMin, 0)}%):</strong> Lucro de ${formatNum(calc.margemRealPct, 1)}%. Recomendado cobrar ${formatBRL(calc.precoSugeridoSaudavel)} (mínimo ${formatBRL(calc.precoMinimoMeta)}).</span></div>`;
    }
    return '';
  }

  function updatePedidoFinancialSummary(card, order) {
    const calc = calculateInternalOrder(order, state);
    const badgeClass = calc.statusMargem === 'saudavel' ? 'badge-olive' : (calc.statusMargem === 'baixa' ? 'badge-amber' : 'badge-terracotta');
    card.classList.toggle('alert-low', calc.statusMargem !== 'saudavel');

    card.querySelector('.ped-custo-val').textContent = formatBRL(calc.custoTotal);
    card.querySelector('.ped-minimo-val').textContent = formatBRL(calc.precoMinimoMeta);
    card.querySelector('.ped-sugerido-val').textContent = formatBRL(calc.precoSugeridoSaudavel);
    card.querySelector('.ped-lucro-val').textContent = formatBRL(calc.lucroLiquido);
    card.querySelector('.ped-lucro-val').style.color = calc.lucroLiquido >= 0 ? 'var(--olive)' : 'var(--terracotta)';
    card.querySelector('.ped-margem-badge').className = `badge ped-margem-badge ${badgeClass}`;
    card.querySelector('.ped-margem-badge').textContent = `${formatNum(calc.margemRealPct, 1)}% margem`;
    card.querySelector('.ped-saldo-val').textContent = formatBRL(calc.saldoReceber);
    card.querySelector('.ped-alert-slot').innerHTML = buildOrderAlertHtml(calc);
  }

  function renderPedidosInternos() {
    renderPedidosKPIs();
    const filter = document.getElementById('pedido-status-filter').value;
    const produtos = state.recipes.filter((r) => r.tipo === 'produto');
    const orders = state.internalOrders.filter((o) => filter === 'todos' || o.status === filter);
    const container = document.getElementById('pedidos-list-container');

    if (!orders.length) {
      container.innerHTML = '<div class="card"><p class="card-desc">Nenhum pedido encontrado neste status. Clique em "+ Novo Pedido Presencial" para criar um.</p></div>';
      return;
    }

    container.innerHTML = orders.map((order) => {
      const calc = calculateInternalOrder(order, state);
      const statusMeta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.orcamento;
      const margemBadgeClass = calc.statusMargem === 'saudavel' ? 'badge-olive' : (calc.statusMargem === 'baixa' ? 'badge-amber' : 'badge-terracotta');

      const itensHtml = (order.itens || []).map((item, idx) => {
        const det = calc.itensDetalhados.find((d) => d.recipe.id === item.recipeId);
        return `
          <div style="display:flex; gap:8px; align-items:center;" data-item-idx="${idx}">
            <select class="select pedido-item-select" style="flex:1;">
              ${produtos.map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === item.recipeId ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('')}
            </select>
            <input type="number" min="1" step="1" class="input input-num pedido-item-qty" value="${item.quantidade}" style="width:72px;" />
            <span class="tabular" style="font-size:0.82rem; color:var(--text-muted); min-width:74px; text-align:right;">
              ${det ? formatBRL(det.custoSubtotal) : 'R$ 0,00'}
            </span>
            <button class="btn btn-danger-ghost btn-sm pedido-del-item" type="button">✕</button>
          </div>
        `;
      }).join('');

      return `
        <article class="card pedido-card ${calc.statusMargem !== 'saudavel' ? 'alert-low' : ''}" data-order-id="${escapeHtml(order.id)}">
          <div class="card-header" style="margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <span class="badge ${statusMeta.badge}">${statusMeta.label}</span>
              <span class="badge ped-margem-badge ${margemBadgeClass}">${formatNum(calc.margemRealPct, 1)}% margem</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm pedido-copy-quote" type="button">📋 Copiar Orçamento p/ Cliente</button>
              <button class="btn btn-danger-ghost btn-sm pedido-delete-btn" type="button">Excluir</button>
            </div>
          </div>

          <div class="grid-2">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div class="grid-2">
                <div class="field-group">
                  <label>Cliente / Identificação</label>
                  <input type="text" class="input" data-order-field="cliente" value="${escapeHtml(order.cliente)}" />
                </div>
                <div class="field-group">
                  <label>Status do Pedido</label>
                  <select class="select" data-order-field="status">
                    ${Object.entries(ORDER_STATUS_META).map(([k, v]) => `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="grid-2">
                <div class="field-group">
                  <label>Contato (WhatsApp / Presencial)</label>
                  <input type="text" class="input" data-order-field="contato" value="${escapeHtml(order.contato)}" />
                </div>
                <div class="field-group">
                  <label>Data Entrega / Retirada</label>
                  <input type="date" class="input" data-order-field="dataEntrega" value="${escapeHtml(order.dataEntrega)}" />
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <strong style="font-size:0.84rem; text-transform:uppercase; color:var(--text-muted);">Itens do Pedido (Custo de Produção)</strong>
                  <button class="btn btn-secondary btn-sm pedido-add-item" type="button">+ Item</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${itensHtml || '<p class="card-desc">Adicione ao menos um item ao pedido.</p>'}
                </div>
              </div>

              <div class="field-group">
                <label>Observações (sabor, embalagem, horário)</label>
                <input type="text" class="input" data-order-field="observacoes" value="${escapeHtml(order.observacoes)}" placeholder="Ex: retirar no Campeche às 16h" />
              </div>
            </div>

            <div class="channel-box highlight" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
              <div class="grid-2">
                <div>
                  <div class="channel-label">Custo Total (Insumos + Extra)</div>
                  <div class="channel-price ped-custo-val" style="font-size:1.25rem;">${formatBRL(calc.custoTotal)}</div>
                </div>
                <div>
                  <div class="channel-label">Lucro Líquido Real</div>
                  <div class="channel-price ped-lucro-val" style="font-size:1.25rem; color:${calc.lucroLiquido >= 0 ? 'var(--olive)' : 'var(--terracotta)'};">${formatBRL(calc.lucroLiquido)}</div>
                </div>
              </div>

              <div style="background:var(--surface); border:1px solid var(--border-gold); border-radius:10px; padding:10px 12px; font-size:0.83rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span>Preço mínimo (meta ${formatNum(calc.margemMin, 0)}%):</span>
                  <strong class="tabular ped-minimo-val">${formatBRL(calc.precoMinimoMeta)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <span>Sugerido p/ lucro saudável (~${formatNum(calc.margemAlvoSaudavel, 0)}%):</span>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <strong class="tabular ped-sugerido-val" style="color:var(--gold-dark); font-size:0.98rem;">${formatBRL(calc.precoSugeridoSaudavel)}</strong>
                    <button class="btn btn-secondary btn-sm pedido-apply-sugerido" type="button">Aplicar</button>
                  </div>
                </div>
              </div>

              <div class="grid-3">
                <div class="field-group">
                  <label>Preço Cobrado (R$)</label>
                  <input type="number" min="0" step="0.5" class="input input-num" data-order-field="precoCobrado" value="${calc.temPrecoCustom ? Number(order.precoCobrado).toFixed(2) : ''}" placeholder="${calc.precoSugeridoSaudavel.toFixed(2)}" />
                </div>
                <div class="field-group">
                  <label>Custo Extra / Entrega (R$)</label>
                  <input type="number" min="0" step="0.5" class="input input-num" data-order-field="custoExtra" value="${order.custoExtra || 0}" />
                </div>
                <div class="field-group">
                  <label>Sinal Pago (R$)</label>
                  <input type="number" min="0" step="0.5" class="input input-num" data-order-field="sinalPago" value="${order.sinalPago || 0}" />
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; padding-top:8px; border-top:1px dashed var(--border-gold);">
                <span>Saldo a receber na entrega:</span>
                <strong class="tabular ped-saldo-val" style="font-size:1.05rem;">${formatBRL(calc.saldoReceber)}</strong>
              </div>

              <div class="ped-alert-slot">${buildOrderAlertHtml(calc)}</div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Inicialização
  bindEvents();
  renderActiveTab();
  syncFromCloud({ silent: false });
})();
