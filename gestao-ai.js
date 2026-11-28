/**
 * Ana's Bakery — Controlador da Central IA (Gemini AI Free Tier)
 * Radar Diário de Preços SC, Atualização Automática de ROIs/Investimentos/Unitários,
 * Consultor CFO IA, Leitor de Nota Fiscal (Visão) e Laboratório Criativo.
 */

(function () {
  'use strict';

  const G = () => window.AnasGestao;

  const DEFAULT_LOCAL_STORE_IDS = [
    'fort-campeche',
    'bistek-costeira',
    'hiperselect',
    'hippo-centro',
    'angeloni-centro',
    'fort-jardim-atlantico',
    'angeloni-capoeiras',
    'bistek-abraao',
  ];

  const aiState = {
    configured: true,
    loading: false,
    activeSub: 'radar',
    hubs: [],
    stores: [],
    settings: {
      autoApplyPrices: true,
      autoProtectMargins: true,
      preferFortRancho: true,
      fortTolerancePct: 8,
      includeEquipmentsCheck: false,
      maxAutoChangePct: 55,
      enabledStoreIds: [...DEFAULT_LOCAL_STORE_IDS],
    },
    schedule: {
      humanLabel: 'Segundas e Quintas às 07:00 (Brasília)',
    },
    lastSync: null,
    previewSync: null,
    lastBriefing: null,
    history: [],
    hasRollback: false,
    rollbackSavedAt: null,
    chatHistory: [],
    lastReceipt: null,
    lastGeneratedRecipe: null,
    lastGoalPlan: null,
    lastImportDraft: null,
  };

  function esc(str) {
    return G() ? G().escapeHtml(str) : String(str ?? '');
  }

  function brl(val, dec = 2) {
    return G() ? G().formatBRL(val, dec) : `R$ ${Number(val || 0).toFixed(dec)}`;
  }

  function num(val, dec = 1) {
    return G() ? G().formatNum(val, dec) : String(Number(val || 0).toFixed(dec));
  }

  function formatDateTimeBR(iso) {
    if (!iso) return 'Ainda não executado';
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function formatDeltaPill(deltaPct, invertColor = false) {
    const val = Number(deltaPct || 0);
    if (Math.abs(val) < 0.05) {
      return '<span class="badge badge-gold">0,0%</span>';
    }
    const isUp = val > 0;
    // Para custos: subir é ruim (terracotta), cair é bom (olive).
    // Para lucro/ROI (invertColor = true): subir é bom (olive), cair é ruim (terracotta).
    const good = invertColor ? isUp : !isUp;
    const cls = good ? 'badge-olive' : 'badge-terracotta';
    const arrow = isUp ? '▲' : '▼';
    return `<span class="badge ${cls}">${arrow} ${isUp ? '+' : ''}${num(val, 1)}%</span>`;
  }

  function formatSimpleMarkdown(raw) {
    const safe = esc(raw || '');
    const lines = safe.split(/\r?\n/);
    const out = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        continue;
      }
      const formatted = trimmed
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

      if (/^[-•*]\s+/.test(trimmed)) {
        if (!inList) {
          out.push('<ul class="ai-md-list">');
          inList = true;
        }
        out.push(`<li>${formatted.replace(/^[-•*]\s+/, '')}</li>`);
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push(`<div class="ai-md-heading">${formatted.replace(/^#{1,3}\s+/, '')}</div>`);
      } else {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push(`<p class="ai-md-p">${formatted}</p>`);
      }
    }
    if (inList) out.push('</ul>');
    return out.join('');
  }

  function setBusy(busy, progressMsg = '') {
    aiState.loading = busy;
    const banner = document.getElementById('ai-progress-banner');
    const txt = document.getElementById('ai-progress-text');
    if (banner) banner.style.display = busy ? 'flex' : 'none';
    if (txt && progressMsg) txt.textContent = progressMsg;

    [
      'btn-topbar-ai-sync',
      'btn-insumos-ai-sync',
      'btn-invest-ai-sync',
      'btn-ai-sync-now',
      'btn-ai-preview-sync',
      'btn-ai-rollback',
      'btn-ai-chat-send',
      'btn-ai-import-parse',
      'btn-ai-import-commit',
      'btn-ai-create-recipe',
      'btn-ai-optimize-goal',
      'btn-ai-generate-mkt',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = busy;
    });
  }

  async function apiFetch(url, options = {}) {
    if (window.location.protocol === 'file:') {
      throw new Error('Os recursos de IA precisam rodar no servidor Vercel (não funcionam via arquivo local file://).');
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
    if (res.status === 401) {
      window.location.href = '/gestao';
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `Erro HTTP ${res.status}`);
    }
    return json;
  }

  // ======================== SUB-NAVEGAÇÃO CENTRAL IA ========================
  function switchAiSub(subId) {
    aiState.activeSub = subId;
    document.querySelectorAll('.ai-subtab').forEach((b) => {
      b.classList.toggle('active', b.dataset.aiSub === subId);
    });
    document.querySelectorAll('.ai-subpanel').forEach((p) => {
      p.classList.toggle('active', p.id === `ia-sub-${subId}`);
    });
  }

  // ======================== CARREGAMENTO INICIAL DO STATUS IA ========================
  async function loadAiStatus({ silent = true } = {}) {
    if (window.location.protocol === 'file:') return;
    try {
      const data = await apiFetch('/api/ai/status', { method: 'GET' });
      aiState.configured = Boolean(data.configured);
      if (Array.isArray(data.hubs)) aiState.hubs = data.hubs;
      if (Array.isArray(data.stores)) aiState.stores = data.stores;
      if (data.settings) {
        const nextEnabled = Array.isArray(data.settings.enabledStoreIds) && data.settings.enabledStoreIds.length
          ? data.settings.enabledStoreIds
          : aiState.settings.enabledStoreIds;
        aiState.settings = {
          ...aiState.settings,
          ...data.settings,
          enabledStoreIds: nextEnabled,
        };
      }
      if (data.schedule) aiState.schedule = data.schedule;
      aiState.lastSync = data.lastSync || null;
      aiState.lastBriefing = data.lastBriefing || null;
      aiState.history = Array.isArray(data.history) ? data.history : [];
      aiState.hasRollback = Boolean(data.hasRollback);
      aiState.rollbackSavedAt = data.rollbackSavedAt || null;

      syncSettingsInputs();
      renderDashboardBriefing();
      renderPricingAiBanner();
      if (G()?.getActiveTab() === 'ia') {
        renderAITab();
      }
    } catch (err) {
      if (!silent) G()?.showToast(`IA indisponível: ${err.message}`);
    }
  }

  function syncSettingsInputs() {
    const s = aiState.settings;
    const elApply = document.getElementById('ai-cfg-auto-apply');
    const elMargin = document.getElementById('ai-cfg-protect-margins');
    const elPreferFort = document.getElementById('ai-cfg-prefer-fort');
    const elFortTol = document.getElementById('ai-cfg-fort-tol');
    const elEquip = document.getElementById('ai-cfg-check-equip');
    const elMax = document.getElementById('ai-cfg-max-delta');
    if (elApply) elApply.checked = Boolean(s.autoApplyPrices);
    if (elMargin) elMargin.checked = Boolean(s.autoProtectMargins);
    if (elPreferFort) elPreferFort.checked = s.preferFortRancho !== false;
    if (elFortTol) {
      elFortTol.value = String(s.fortTolerancePct ?? 8);
      elFortTol.disabled = s.preferFortRancho === false;
    }
    if (elEquip) elEquip.checked = Boolean(s.includeEquipmentsCheck);
    if (elMax) elMax.value = String(s.maxAutoChangePct ?? 55);

    renderStoresHubsPanel();

    const navBadge = document.getElementById('ai-nav-badge');
    if (navBadge) {
      navBadge.textContent = s.autoApplyPrices ? 'Seg/Qui' : 'Manual';
    }
  }

  async function saveAiSettings(partialOverrides = {}) {
    const overrides = partialOverrides && !partialOverrides.target && typeof partialOverrides === 'object'
      ? partialOverrides
      : {};
    const checkedStores = Array.from(document.querySelectorAll('#ai-stores-hubs-card .js-ai-store-toggle:checked'))
      .map((el) => el.value)
      .filter(Boolean);
    const enabledStoreIds = Array.isArray(overrides.enabledStoreIds)
      ? overrides.enabledStoreIds
      : (checkedStores.length ? checkedStores : (aiState.settings.enabledStoreIds || [...DEFAULT_LOCAL_STORE_IDS]));

    const next = {
      ...aiState.settings,
      autoApplyPrices: Boolean(document.getElementById('ai-cfg-auto-apply')?.checked),
      autoProtectMargins: Boolean(document.getElementById('ai-cfg-protect-margins')?.checked),
      preferFortRancho: document.getElementById('ai-cfg-prefer-fort')
        ? Boolean(document.getElementById('ai-cfg-prefer-fort').checked)
        : aiState.settings.preferFortRancho !== false,
      fortTolerancePct: Math.max(0, Math.min(25, Number(G().parseLocaleNumber(document.getElementById('ai-cfg-fort-tol')?.value ?? aiState.settings.fortTolerancePct ?? 8)))),
      includeEquipmentsCheck: Boolean(document.getElementById('ai-cfg-check-equip')?.checked),
      maxAutoChangePct: Math.max(10, Math.min(200, Number(G().parseLocaleNumber(document.getElementById('ai-cfg-max-delta')?.value)) || 55)),
      enabledStoreIds,
      ...overrides,
    };
    aiState.settings = next;
    syncSettingsInputs();
    try {
      await apiFetch('/api/ai/status', {
        method: 'PUT',
        body: JSON.stringify({ settings: next }),
      });
      G().showToast('Preferências da IA salvas na nuvem!');
    } catch (err) {
      G().showToast(`Erro ao salvar preferências: ${err.message}`);
    }
  }

  function renderStoresHubsPanel() {
    const container = document.getElementById('ai-stores-hubs-card');
    if (!container) return;

    const hubs = Array.isArray(aiState.hubs) ? aiState.hubs : [];
    const stores = Array.isArray(aiState.stores) ? aiState.stores : [];
    const enabledSet = new Set(
      Array.isArray(aiState.settings?.enabledStoreIds) && aiState.settings.enabledStoreIds.length
        ? aiState.settings.enabledStoreIds
        : DEFAULT_LOCAL_STORE_IDS,
    );

    if (!hubs.length || !stores.length) {
      container.innerHTML = '<div class="card ai-hubs-card"><p class="card-desc" style="margin:0;">Carregando polos e mercados da sua rotina (Tapera, Centro e Estreito)...</p></div>';
      return;
    }

    const activeCount = stores.filter((st) => enabledSet.has(st.id)).length;
    const hubsHtml = hubs.map((hub) => {
      const hubStores = stores.filter((st) => st.hub === hub.id || (Array.isArray(st.hubs) && st.hubs.includes(hub.id)));
      return `
        <div class="ai-hub-col">
          <div class="ai-hub-head">
            <strong>${esc(hub.label)}</strong>
            <span class="ai-hub-addr">${esc(hub.address)}</span>
          </div>
          <div class="ai-hub-stores-list">
            ${hubStores.map((st) => {
              const checked = enabledSet.has(st.id);
              const detail = st.distanceHint || st.address || '';
              return `
                <label class="ai-store-toggle-pill ${st.isPreferred ? 'is-preferred' : ''} ${checked ? 'is-checked' : ''}">
                  <input type="checkbox" class="js-ai-store-toggle" value="${esc(st.id)}" ${checked ? 'checked' : ''} />
                  <div class="ai-store-pill-body">
                    <div class="ai-store-pill-title">
                      <strong>${esc(st.shortName || st.name)}</strong>
                      ${st.isPreferred ? '<span class="badge badge-gold">⭐ Rancho</span>' : ''}
                    </div>
                    ${detail ? `<small class="ai-store-pill-addr">${esc(detail)}</small>` : ''}
                  </div>
                </label>
              `;
            }).join('')}
          </div>
          ${hub.note ? `<div class="ai-hub-note">${esc(hub.note)}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="card ai-hubs-card">
        <div class="card-head-inline" style="margin-bottom:12px;">
          <div>
            <h3>📍 Polos de Compra sem Carro — Florianópolis</h3>
            <p class="card-desc" style="margin-bottom:0;">
              Apenas os mercados reais mais próximos de casa (CEP 88049-332) e dos dois trabalhos. Ative ou desative onde deseja cotar:
            </p>
          </div>
          <span class="badge badge-olive">${activeCount}/${stores.length} mercados ativos</span>
        </div>
        <div class="ai-hubs-grid">
          ${hubsHtml}
        </div>
        <div class="ai-hub-transparency-note">
          ℹ️ <strong>Sobre Imperatriz (Liberato Bittencourt, 410) e Brasil Atacadista (SC-405):</strong> não possuem catálogo aberto na web (Imperatriz atende via iFood/app fechado e Brasil Atacadista via televendas). Quando comprar lá presencialmente, use <strong>Ler Nota Fiscal</strong> na aba ao lado para atualizar os preços!
        </div>
      </div>
    `;
  }

  // ======================== BRIEFING EXECUTIVO (DASHBOARD + CENTRAL IA) ========================
  function buildBriefingHtml(briefing, compact = false) {
    const lastSync = aiState.lastSync;
    const syncInfo = lastSync
      ? `Última pesquisa: <strong>${formatDateTimeBR(lastSync.syncedAt)}</strong> (${lastSync.updatedCount} insumos atualizados • ${esc(lastSync.modelUsed)})`
      : 'Sync agendado para <strong>Segundas e Quintas às 07:00 (Brasília)</strong> • Nenhuma pesquisa executada ainda.';

    if (!briefing) {
      return `
        <div class="card ai-briefing-card">
          <div class="ai-briefing-head">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                <span class="badge badge-ai">✨ Briefing Executivo IA</span>
                <span class="badge badge-olive">⏰ Seg &amp; Qui às 07:00 BRT</span>
              </div>
              <h2 class="card-title">Inteligência Gemini pronta para auditar seus preços e ROIs</h2>
              <p class="card-desc">${syncInfo}</p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-ai btn-sm js-ai-run-sync" type="button">🚀 Pesquisar Preços &amp; ROIs Agora</button>
              ${compact ? '<button class="btn btn-secondary btn-sm js-ai-open-tab" type="button">Abrir Central IA →</button>' : '<button class="btn btn-secondary btn-sm js-ai-refresh-briefing" type="button">✨ Gerar Diagnóstico</button>'}
            </div>
          </div>
        </div>
      `;
    }

    const score = Math.max(0, Math.min(100, Number(briefing.healthScore || 0)));
    const scoreCls = score >= 75 ? 'olive' : (score >= 50 ? 'gold' : 'terracotta');
    const actions = Array.isArray(briefing.topActions) ? briefing.topActions.slice(0, 3) : [];

    return `
      <div class="card ai-briefing-card">
        <div class="ai-briefing-head">
          <div class="ai-score-ring ${scoreCls}" title="Nota de Saúde Financeira calculada pela IA">
            <span class="ai-score-num">${score}</span>
            <span class="ai-score-lbl">SAÚDE</span>
          </div>
          <div style="flex:1; min-width:220px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
              <span class="badge badge-ai">✨ Briefing da IA</span>
              <span style="font-size:0.78rem; color:var(--text-muted);">${syncInfo}</span>
            </div>
            <h2 class="card-title" style="font-size:1.15rem;">${esc(briefing.headline)}</h2>
            <p class="card-desc" style="margin-top:4px;">${esc(briefing.inflationSummary)}</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-ai btn-sm js-ai-run-sync" type="button">🚀 Atualizar Preços &amp; ROIs</button>
            ${compact
              ? '<button class="btn btn-secondary btn-sm js-ai-open-tab" type="button">Central IA →</button>'
              : '<button class="btn btn-secondary btn-sm js-ai-refresh-briefing" type="button">↻ Reanalisar</button>'}
          </div>
        </div>

        <div class="ai-actions-grid">
          ${actions.map((a) => {
            const pCls = a.prioridade === 'alta' ? 'badge-terracotta' : (a.prioridade === 'media' ? 'badge-amber' : 'badge-olive');
            return `
              <div class="ai-action-tile">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:5px;">
                  <span class="badge ${pCls}">${esc(a.prioridade || 'ação').toUpperCase()}</span>
                  <span style="font-size:0.75rem; font-weight:800; color:var(--olive);">${esc(a.impactoEstimado)}</span>
                </div>
                <strong style="font-size:0.88rem; display:block; margin-bottom:3px;">${esc(a.titulo)}</strong>
                <span style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">${esc(a.detalhe)}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="ai-briefing-footer-tips">
          <div class="ai-tip-pill">
            <strong>🌟 Oportunidade do Dia:</strong> ${esc(briefing.opportunityOfTheDay)}
          </div>
          <div class="ai-tip-pill">
            <strong>🛒 Dica de Mercado (SC):</strong> ${esc(briefing.buyingTip)}
          </div>
        </div>
      </div>
    `;
  }

  function renderDashboardBriefing() {
    const slot = document.getElementById('dashboard-ai-briefing');
    if (!slot) return;
    slot.innerHTML = buildBriefingHtml(aiState.lastBriefing, true);
  }

  function renderPricingAiBanner() {
    const slot = document.getElementById('pricing-ai-banner');
    if (!slot) return;
    const sync = aiState.previewSync || aiState.lastSync;
    const pendingAdj = (sync?.priceAdjustments || []).filter((a) => !a.applied);
    if (!pendingAdj.length) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = `
      <div class="alert-banner amber" style="margin-top:0; justify-content:space-between; flex-wrap:wrap;">
        <span>
          ✨ <strong>Alerta da IA:</strong> ${pendingAdj.length} produto(s) ficaram abaixo da margem mínima após os preços de mercado de hoje
          (${pendingAdj.map((p) => `${esc(p.nome)}: ${brl(p.oldDirect)} → ${brl(p.recommendedDirect)}`).join(' • ')}).
        </span>
        <button class="btn btn-primary btn-sm js-ai-apply-margin-fixes" type="button">Aplicar Reajustes Sugeridos</button>
      </div>
    `;
  }

  // ======================== RENDER DA ABA CENTRAL IA ========================
  function buildHistorySvgChart(history) {
    if (!history || history.length === 0) {
      return '<p class="card-desc" style="padding:18px 0;">O gráfico histórico aparecerá automaticamente após o primeiro sync diário de preços.</p>';
    }
    const pts = history.slice(-14);
    const width = 460;
    const height = 200;
    const padX = 40;
    const padY = 26;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2 - 18;

    const rois = pts.map((p) => Number(p.roiCicloComprasPct || 0));
    const cestas = pts.map((p) => Number(p.cestaBaseTotal || 0));
    const minRoi = Math.min(...rois) * 0.9;
    const maxRoi = Math.max(10, ...rois) * 1.1;
    const minCesta = Math.min(...cestas) * 0.9;
    const maxCesta = Math.max(10, ...cestas) * 1.1;

    const mapX = (i) => (pts.length === 1 ? padX + plotW / 2 : padX + (i / (pts.length - 1)) * plotW);
    const mapY = (v, minV, maxV) => padY + plotH - ((v - minV) / Math.max(1e-4, maxV - minV)) * plotH;

    const roiLine = pts.map((p, i) => `${mapX(i).toFixed(1)},${mapY(rois[i], minRoi, maxRoi).toFixed(1)}`).join(' ');
    const cestaLine = pts.map((p, i) => `${mapX(i).toFixed(1)},${mapY(cestas[i], minCesta, maxCesta).toFixed(1)}`).join(' ');

    const dotsRoi = pts.map((p, i) => {
      const x = mapX(i);
      const y = mapY(rois[i], minRoi, maxRoi);
      const dt = String(p.date || '').slice(5).split('-').reverse().join('/');
      return `
        <circle cx="${x}" cy="${y}" r="4" fill="var(--olive)" />
        <text x="${x}" y="${y - 9}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--olive)">${num(rois[i], 0)}%</text>
        <text x="${x}" y="${height - 6}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">${dt}</text>
      `;
    }).join('');

    const dotsCesta = pts.map((p, i) => {
      const x = mapX(i);
      const y = mapY(cestas[i], minCesta, maxCesta);
      return `<circle cx="${x}" cy="${y}" r="3.2" fill="var(--gold-baked)" />`;
    }).join('');

    return `
      <div style="display:flex; gap:14px; font-size:0.76rem; font-weight:700; margin-bottom:6px;">
        <span style="color:var(--olive);">● ROI do Ciclo (%)</span>
        <span style="color:var(--gold-dark);">● Índice Cesta Insumos (R$)</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="200" role="img" aria-label="Evolução diária de ROI e Cesta de Insumos">
        <line x1="${padX}" y1="${padY + plotH}" x2="${width - padX}" y2="${padY + plotH}" stroke="var(--border-gold)" stroke-width="1" />
        ${pts.length > 1 ? `<polyline fill="none" stroke="var(--gold-baked)" stroke-width="2" stroke-dasharray="4 3" points="${cestaLine}" />` : ''}
        ${pts.length > 1 ? `<polyline fill="none" stroke="var(--olive)" stroke-width="2.6" points="${roiLine}" />` : ''}
        ${dotsCesta}
        ${dotsRoi}
      </svg>
    `;
  }

  function renderAITab() {
    syncSettingsInputs();

    const activeSync = aiState.previewSync || aiState.lastSync;
    const isPreview = Boolean(aiState.previewSync);

    const modelBadge = document.getElementById('ai-model-badge');
    if (modelBadge) {
      const copilotModel = aiState.lastBriefing?.model || 'gemini-3.6-flash';
      modelBadge.textContent = `Copilot: ${copilotModel}`;
    }

    const schedBadge = document.getElementById('ai-schedule-badge');
    if (schedBadge) {
      schedBadge.textContent = `⏰ ${aiState.schedule?.humanLabel || 'Segundas e Quintas às 07:00 (Brasília)'}`;
    }

    const descEl = document.getElementById('ai-last-sync-desc');
    if (descEl) {
      if (activeSync) {
        const trig = activeSync.trigger === 'schedule' ? 'Automático (Seg/Qui 07h)' : (isPreview ? 'Simulação (não salva)' : 'Manual');
        descEl.innerHTML = `Última auditoria: <strong>${formatDateTimeBR(activeSync.syncedAt)}</strong> • Modo: <strong>${trig}</strong> • ${activeSync.matchedCount}/${activeSync.totalScanned} insumos cotados ao vivo nos mercados da sua rotina (Tapera, Centro e Estreito) em ${num((activeSync.durationMs || 0) / 1000, 1)}s.`;
      }
    }

    renderStoresHubsPanel();

    const rollbackBtn = document.getElementById('btn-ai-rollback');
    if (rollbackBtn) {
      rollbackBtn.style.display = aiState.hasRollback ? 'inline-flex' : 'none';
    }

    const applyPreviewBtn = document.getElementById('btn-ai-apply-all-preview');
    if (applyPreviewBtn) {
      applyPreviewBtn.style.display = isPreview ? 'inline-flex' : 'none';
    }

    // 1. Briefing
    const briefingBox = document.getElementById('ai-radar-briefing-box');
    if (briefingBox) {
      briefingBox.innerHTML = buildBriefingHtml(aiState.lastBriefing, false);
    }

    // 2. Impacto Antes vs Depois
    const impactBox = document.getElementById('ai-sync-impact-box');
    if (impactBox) {
      if (!activeSync || !activeSync.beforeMetrics || !activeSync.afterMetrics) {
        impactBox.innerHTML = '';
      } else {
        const b = activeSync.beforeMetrics;
        const a = activeSync.afterMetrics;
        const pct = (oldV, newV) => (oldV > 0 ? ((newV - oldV) / oldV) * 100 : 0);
        const roiDiff = Number(a.roiCicloComprasPct || 0) - Number(b.roiCicloComprasPct || 0);

        impactBox.innerHTML = `
          ${isPreview ? '<div class="alert-banner amber" style="margin-top:0; margin-bottom:14px;"><span>👁️ <strong>Modo Simulação:</strong> Veja abaixo o impacto real nos investimentos e ROIs antes de gravar no estoque.</span></div>' : ''}
          <div class="kpi-grid kpi-grid-5" style="margin-bottom:0;">
            <div class="kpi-card">
              <span class="kpi-label">Cesta de Insumos</span>
              <span class="kpi-value gold">${brl(a.cestaBaseTotal)}</span>
              <span class="kpi-sub">Antes: ${brl(b.cestaBaseTotal)} ${formatDeltaPill(pct(b.cestaBaseTotal, a.cestaBaseTotal), false)}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Invest. Compras (Ciclo)</span>
              <span class="kpi-value">${brl(a.investimentoCompraFechada)}</span>
              <span class="kpi-sub">Antes: ${brl(b.investimentoCompraFechada)} ${formatDeltaPill(pct(b.investimentoCompraFechada, a.investimentoCompraFechada), false)}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Invest. Total Geral</span>
              <span class="kpi-value">${brl(a.investimentoTotalInicial)}</span>
              <span class="kpi-sub">Falta comprar: ${brl(a.totalAComprarGeral)}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Lucro Projetado</span>
              <span class="kpi-value ${a.lucroLiquidoMix >= 0 ? 'olive' : 'terracotta'}">${brl(a.lucroLiquidoMix)}</span>
              <span class="kpi-sub">Antes: ${brl(b.lucroLiquidoMix)} ${formatDeltaPill(pct(b.lucroLiquidoMix, a.lucroLiquidoMix), true)}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">ROI do Ciclo Atualizado</span>
              <span class="kpi-value olive">${num(a.roiCicloComprasPct, 1)}%</span>
              <span class="kpi-sub">Antes: ${num(b.roiCicloComprasPct, 1)}% (${roiDiff >= 0 ? '+' : ''}${num(roiDiff, 1)} pp) • Payback: ${a.paybackCiclos ? `${num(a.paybackCiclos, 1)}x` : '—'}</span>
            </div>
          </div>
        `;
      }
    }

    // 3. Histórico SVG
    const histBox = document.getElementById('ai-history-chart');
    if (histBox) {
      histBox.innerHTML = buildHistorySvgChart(aiState.history);
    }

    // 4. Roteiro Inteligente de Compras por Mercado
    const routeBox = document.getElementById('ai-shopping-route-box');
    if (routeBox) {
      const route = activeSync?.shoppingRouteByStore || [];
      if (!route.length) {
        routeBox.innerHTML = '<p class="card-desc">Rode a pesquisa de preços ao vivo para ver em qual mercado da sua rotina sem carro (Tapera 88049-332, Centro ou Estreito) cada item sai mais vantajoso.</p>';
      } else {
        routeBox.innerHTML = `
          <div class="ai-route-list">
            ${route.map((st) => `
              <div class="ai-route-card ${st.isPreferred ? 'is-preferred' : ''}">
                <div class="ai-route-head">
                  <div>
                    <strong>${st.isPreferred ? '⭐' : '🏪'} ${esc(st.store)}</strong>
                    ${st.hubLabel ? `<span class="badge badge-olive" style="margin-left:6px;">${esc(st.hubLabel)}</span>` : ''}
                    ${st.address ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">📍 ${esc(st.address)}</div>` : ''}
                  </div>
                  <span class="badge badge-gold">${st.itemsCount} itens • ${brl(st.totalRS)}</span>
                </div>
                <div class="ai-route-items">
                  ${st.items.map((it) => `
                    <span class="ai-route-chip">
                      ${esc(it.nome)} (${it.packs}x • ${brl(it.custoCompra)})${it.productUrl ? ` <a href="${esc(it.productUrl)}" target="_blank" rel="noopener noreferrer">↗</a>` : ''}
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // 5. Reajustes de Preço Unitário (Proteção de Margem)
    const adjBox = document.getElementById('ai-price-adjustments-box');
    if (adjBox) {
      const adj = activeSync?.priceAdjustments || [];
      if (!adj.length) {
        adjBox.innerHTML = '';
      } else {
        const hasPending = adj.some((x) => !x.applied);
        adjBox.innerHTML = `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">🛡️ Proteção Automática de Preços Unitários &amp; Margens</h3>
                <p class="card-desc">Produtos cujo custo unitário subiu e exigem ajuste para preservar sua margem mínima.</p>
              </div>
              ${hasPending ? '<button class="btn btn-primary btn-sm js-ai-apply-margin-fixes" type="button">✓ Aplicar Reajustes Agora</button>' : '<span class="badge badge-olive">✓ Margens protegidas</span>'}
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th class="td-right">Custo Unit.</th>
                    <th class="td-right">Preço Direto Antes</th>
                    <th class="td-right">Preço Recomendado</th>
                    <th class="td-right">Novo iFood Básico</th>
                    <th class="td-right">Novo iFood Entrega</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${adj.map((p) => `
                    <tr>
                      <td><strong>${esc(p.nome)}</strong></td>
                      <td class="td-right">${brl(p.custoUnitario)}</td>
                      <td class="td-right">${brl(p.oldDirect)} (${num(p.oldMarginPct, 1)}%)</td>
                      <td class="td-right"><strong style="color:var(--olive);">${brl(p.recommendedDirect)}</strong> (${num(p.newMarginPct, 1)}%)</td>
                      <td class="td-right">${brl(p.newIfoodBasico)}</td>
                      <td class="td-right">${brl(p.newIfoodEntrega)}</td>
                      <td>${p.applied ? '<span class="badge badge-olive">Aplicado</span>' : '<span class="badge badge-amber">Pendente</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    // 6. Cotações de Equipamentos Pendentes
    const eqBox = document.getElementById('ai-equipments-quotes-box');
    if (eqBox) {
      const eqs = activeSync?.equipmentQuotes || [];
      if (!eqs.length) {
        eqBox.innerHTML = '';
      } else {
        eqBox.innerHTML = `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">🔧 Cotações ao Vivo de Equipamentos Pendentes</h3>
                <p class="card-desc">Referências encontradas hoje para atualizar seu orçamento de investimento inicial.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th class="td-right">Orçado Atual</th>
                    <th class="td-right">Melhor Oferta Hoje</th>
                    <th>Produto Encontrado</th>
                    <th class="td-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${eqs.map((e) => `
                    <tr>
                      <td><strong>${esc(e.nome)}</strong></td>
                      <td class="td-right">${brl(e.valorAtual)}</td>
                      <td class="td-right"><strong style="color:var(--gold-dark);">${brl(e.melhorOferta.price)}</strong></td>
                      <td>
                        <a href="${esc(e.melhorOferta.url)}" target="_blank" rel="noopener noreferrer" class="ai-product-link">
                          ${esc(e.melhorOferta.store)} — ${esc(e.melhorOferta.title)} ↗
                        </a>
                      </td>
                      <td class="td-right">
                        <button class="btn btn-secondary btn-sm js-ai-apply-equip" data-eq-id="${esc(e.equipmentId)}" data-eq-price="${e.melhorOferta.price}" type="button">Atualizar</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    // 7. Tabela Detalhada da Auditoria de Insumos
    const tbody = document.getElementById('ai-audit-tbody');
    if (tbody && activeSync && Array.isArray(activeSync.ingredientUpdates)) {
      tbody.innerHTML = activeSync.ingredientUpdates.map((u) => {
        const confCls = u.confidence === 'alta' ? 'badge-olive' : (u.confidence === 'media' ? 'badge-gold' : 'badge-amber');
        const altOffers = Array.isArray(u.topOffers)
          ? u.topOffers.filter((o) => o && o.storeId !== u.storeId).slice(0, 2)
          : [];
        const altHtml = altOffers.length
          ? `<div style="font-size:0.72rem; color:var(--text-soft); margin-top:2px;">Outras opções: ${altOffers.map((o) => `${esc(o.store)} (${brl(o.price)})`).join(' • ')}</div>`
          : '';

        const storeHtml = u.matched && u.store
          ? `
            <div>
              <strong>${u.isPreferred ? '⭐ ' : ''}${esc(u.store)}</strong>
              ${u.storeHubLabel ? `<span class="badge badge-olive" style="margin-left:5px; font-size:0.68rem;">${esc(u.storeHubLabel)}</span>` : ''}
              ${u.productUrl ? `<a href="${esc(u.productUrl)}" target="_blank" rel="noopener noreferrer" class="ai-product-link"> — ${esc(u.matchedProduct)} ↗</a>` : ` — ${esc(u.matchedProduct || '')}`}
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${esc(u.reason)}</div>
            ${altHtml}
          `
          : `<span style="font-size:0.8rem; color:var(--text-muted);">${esc(u.reason || 'Sem correspondência online hoje')}</span>`;

        const actionHtml = u.applied
          ? '<span class="badge badge-olive">✓ Aplicado</span>'
          : (u.matched && u.newPrice > 0
            ? `<button class="btn btn-secondary btn-sm js-ai-apply-single" data-ing-id="${esc(u.ingredientId)}" data-new-price="${u.newPrice}" type="button">Aplicar</button>`
            : '<span style="font-size:0.76rem; color:var(--text-soft);">Mantido</span>');

        return `
          <tr>
            <td>
              <strong>${esc(u.nome)}</strong>
              <div style="font-size:0.74rem; color:var(--text-muted);">${G().formatInputNumber(u.quantidade)} ${esc(u.unidade)}</div>
            </td>
            <td class="td-right">${brl(u.oldPrice)}</td>
            <td class="td-right"><strong style="color:var(--gold-dark);">${brl(u.newPrice)}</strong></td>
            <td class="td-right">${u.matched ? formatDeltaPill(u.deltaPct, false) : '<span style="color:var(--text-soft);">—</span>'}</td>
            <td style="min-width:240px;">${storeHtml}</td>
            <td><span class="badge ${confCls}">${esc(u.confidence)}</span></td>
            <td class="td-right">${actionHtml}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // ======================== AÇÕES DE SYNC DIÁRIO / MANUAL ========================
  async function runPriceSync({ mode = 'apply', ingredientIds = null, goToAiTab = true } = {}) {
    if (aiState.loading) return;
    if (goToAiTab && !ingredientIds) {
      G().switchTab('ia');
      switchAiSub('radar');
    }

    const label = ingredientIds
      ? 'Pesquisando preço ao vivo deste insumo nos mercados da rotina (Tapera, Centro e Estreito)...'
      : (mode === 'preview'
        ? 'Simulando pesquisa ao vivo nos mercados da sua rotina sem carro e calculando impacto nos ROIs...'
        : 'Pesquisando preços ao vivo (Fort Campeche/Estreito, Bistek, Angeloni, Hiper Select e Hippo) e atualizando ROIs com Gemini IA...');

    setBusy(true, label);
    try {
      const payload = {
        mode,
        state: G().getState(),
        includeEquipments: Boolean(aiState.settings.includeEquipmentsCheck),
      };
      if (ingredientIds) payload.ingredientIds = ingredientIds;

      const res = await apiFetch('/api/ai/price-sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.briefing) aiState.lastBriefing = res.briefing;

      if (mode === 'apply' && res.updatedState) {
        aiState.previewSync = null;
        aiState.lastSync = res.sync;
        if (res.report) {
          aiState.history = res.report.history || aiState.history;
          aiState.hasRollback = Boolean(res.report.hasRollback);
        }
        G().replaceState(res.updatedState, {
          persistLocal: true,
          pushCloud: false, // já foi salvo no Vercel Blob pelo servidor!
          updatedAt: res.stateUpdatedAt,
        });
        G().showToast(`✨ ${res.sync.updatedCount} insumo(s) atualizados • ROI do ciclo: ${num(res.sync.afterMetrics.roiCicloComprasPct, 1)}%`);
      } else {
        aiState.previewSync = res.sync;
        G().showToast('👁️ Simulação concluída! Revise o impacto nos ROIs abaixo.');
      }

      renderDashboardBriefing();
      renderPricingAiBanner();
      if (G().getActiveTab() === 'ia') renderAITab();
    } catch (err) {
      console.error('Erro no sync IA:', err);
      G().showToast(`Erro na IA: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function syncSingleIngredient(ingId, btnEl) {
    if (aiState.loading || !ingId) return;
    const prevTxt = btnEl ? btnEl.textContent : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '…';
    }
    try {
      await runPriceSync({ mode: 'apply', ingredientIds: [ingId], goToAiTab: false });
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = prevTxt;
      }
    }
  }

  async function applyAllPreviewToStock() {
    if (!aiState.previewSync) return;
    const state = G().getState();
    let count = 0;
    for (const u of aiState.previewSync.ingredientUpdates || []) {
      if (!u.matched || !(u.newPrice > 0)) continue;
      const ing = state.ingredients.find((i) => i.id === u.ingredientId);
      if (!ing) continue;
      ing.preco = u.newPrice;
      ing.aiMeta = {
        lastCheckedAt: aiState.previewSync.syncedAt,
        lastStore: u.store,
        matchedProduct: u.matchedProduct,
        productUrl: u.productUrl,
        previousPrice: u.oldPrice,
        deltaPct: u.deltaPct,
        confidence: u.confidence,
        applied: true,
      };
      u.applied = true;
      count += 1;
    }
    if (aiState.settings.autoProtectMargins) {
      for (const adj of aiState.previewSync.priceAdjustments || []) {
        const rec = state.recipes.find((r) => r.id === adj.recipeId);
        if (rec && adj.recommendedDirect > rec.precoVendaDireta) {
          rec.precoVendaDireta = adj.recommendedDirect;
          adj.applied = true;
        }
      }
    }
    aiState.lastSync = { ...aiState.previewSync, mode: 'apply', applied: true };
    aiState.previewSync = null;
    G().saveState();
    G().renderActiveTab();
    renderPricingAiBanner();
    G().showToast(`✓ ${count} preço(s) da simulação aplicados ao estoque e ROIs!`);
  }

  async function applyMarginFixes() {
    const sync = aiState.previewSync || aiState.lastSync;
    const pending = (sync?.priceAdjustments || []).filter((a) => !a.applied);
    if (!pending.length) return;
    const state = G().getState();
    let appliedCount = 0;
    for (const adj of pending) {
      const rec = state.recipes.find((r) => r.id === adj.recipeId);
      if (rec && adj.recommendedDirect > 0) {
        rec.precoVendaDireta = adj.recommendedDirect;
        adj.applied = true;
        appliedCount += 1;
      }
    }
    G().saveState();
    G().renderActiveTab();
    renderPricingAiBanner();
    G().showToast(`🛡️ ${appliedCount} preço(s) unitários ajustados para proteger sua margem!`);
  }

  async function rollbackLastSync() {
    if (!aiState.hasRollback) return;
    if (!confirm('Desfazer a última atualização automática da IA e restaurar os preços anteriores dos insumos e doces?')) return;
    setBusy(true, 'Restaurando snapshot anterior de preços e ROIs...');
    try {
      const res = await apiFetch('/api/ai/status', {
        method: 'PUT',
        body: JSON.stringify({ action: 'rollback', state: G().getState() }),
      });
      aiState.hasRollback = false;
      aiState.previewSync = null;
      if (res.restoredState) {
        G().replaceState(res.restoredState, {
          persistLocal: true,
          pushCloud: false,
          updatedAt: res.stateUpdatedAt,
        });
      }
      renderAITab();
      G().showToast('↩️ Preços anteriores restaurados com sucesso!');
    } catch (err) {
      G().showToast(`Erro ao desfazer: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function refreshBriefingOnly() {
    if (aiState.loading) return;
    setBusy(true, 'Analisando margens, investimentos e ROIs com Gemini IA...');
    try {
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({ action: 'briefing', state: G().getState() }),
      });
      aiState.lastBriefing = res.briefing;
      renderDashboardBriefing();
      if (G().getActiveTab() === 'ia') renderAITab();
      G().showToast('✨ Briefing Executivo atualizado!');
    } catch (err) {
      G().showToast(`Erro ao gerar briefing: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // ======================== CONSULTOR CFO IA (CHAT) ========================
  function appendChatBubble(role, htmlContent) {
    const box = document.getElementById('ai-chat-messages');
    if (!box) return null;
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = `ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}`;
    div.innerHTML = `
      <div class="ai-msg-avatar">${isUser ? '👩‍🍳' : '✨'}</div>
      <div class="ai-msg-bubble">${htmlContent}</div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }

  async function sendChatMessage(text) {
    const clean = String(text || '').trim();
    if (!clean || aiState.loading) return;

    const inputEl = document.getElementById('ai-chat-input');
    if (inputEl) inputEl.value = '';

    appendChatBubble('user', esc(clean));
    const thinkingNode = appendChatBubble('bot', '<span class="ai-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Analisando seus números ao vivo...');

    setBusy(true, 'Consultando Ana\'s CFO (Gemini IA)...');
    try {
      const res = await apiFetch('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          history: aiState.chatHistory.slice(-6),
          state: G().getState(),
        }),
      });
      aiState.chatHistory.push({ role: 'user', text: clean });
      aiState.chatHistory.push({ role: 'assistant', text: res.reply });
      if (thinkingNode) {
        const bubble = thinkingNode.querySelector('.ai-msg-bubble');
        if (bubble) {
          bubble.innerHTML = `${formatSimpleMarkdown(res.reply)}<div class="ai-msg-meta">Respondido por ${esc(res.model)}</div>`;
        }
      }
      const box = document.getElementById('ai-chat-messages');
      if (box) box.scrollTop = box.scrollHeight;
    } catch (err) {
      if (thinkingNode) {
        const bubble = thinkingNode.querySelector('.ai-msg-bubble');
        if (bubble) bubble.innerHTML = `<span style="color:var(--terracotta);">Erro: ${esc(err.message)}</span>`;
      }
    } finally {
      setBusy(false);
    }
  }

  // ======================== LEITOR DE NOTA FISCAL (GEMINI VISION) ========================
  function compressImageToBase64(file, maxDim = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagem inválido.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg' });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleReceiptFile(file) {
    if (!file || aiState.loading) return;
    const out = document.getElementById('ai-receipt-result');
    setBusy(true, 'Lendo itens e preços do cupom fiscal com Gemini Vision...');
    if (out) out.innerHTML = '<p class="card-desc">Extraindo produtos e cruzando com seu estoque...</p>';

    try {
      const { base64, mimeType } = await compressImageToBase64(file);
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({
          action: 'scan_receipt',
          imageBase64: base64,
          imageMimeType: mimeType,
          state: G().getState(),
        }),
      });
      aiState.lastReceipt = res.receipt;
      renderReceiptResult();
      G().showToast(`🧾 Nota lida! ${res.receipt.itensEncontrados.length} item(ns) detectado(s).`);
    } catch (err) {
      if (out) out.innerHTML = `<div class="alert-banner terracotta">${esc(err.message)}</div>`;
      G().showToast(`Erro ao ler nota: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function renderReceiptResult() {
    const out = document.getElementById('ai-receipt-result');
    const r = aiState.lastReceipt;
    if (!out || !r) return;
    const items = r.itensEncontrados || [];
    const matchedItems = items.filter((it) => it.matchedIngredientId);

    out.innerHTML = `
      <div class="channel-box highlight" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong>🏪 ${esc(r.mercadoDetectado)}</strong> ${r.dataCompra ? `• ${esc(r.dataCompra)}` : ''}
            <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">${esc(r.resumo)}</div>
          </div>
          ${matchedItems.length ? '<button id="btn-ai-apply-receipt" class="btn btn-primary btn-sm" type="button">✓ Aplicar Itens Marcados no Estoque</button>' : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:42px;">Usar</th>
              <th>Item no Cupom</th>
              <th>Insumo no Estoque</th>
              <th class="td-right">Antes</th>
              <th class="td-right">Novo Preço</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td>
                  <input type="checkbox" class="js-receipt-check" data-r-idx="${idx}" ${it.matchedIngredientId && it.confianca !== 'baixa' ? 'checked' : ''} ${!it.matchedIngredientId ? 'disabled' : ''} />
                </td>
                <td><strong>${esc(it.textoCupom)}</strong><div style="font-size:0.74rem;color:var(--text-muted);">Pago: ${brl(it.precoPagoEmbalagem)}</div></td>
                <td>${it.matchedIngredientId ? `<span class="badge badge-olive">${esc(it.matchedIngredientName)}</span>` : '<span class="badge badge-gold">Não cadastrado</span>'}</td>
                <td class="td-right">${it.oldPrice !== null ? brl(it.oldPrice) : '—'}</td>
                <td class="td-right"><strong style="color:var(--gold-dark);">${brl(it.precoNormalizadoParaCadastro)}</strong></td>
                <td style="font-size:0.78rem; color:var(--text-muted);">${esc(it.observacao)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center; padding:18px; color:var(--text-muted);">Nenhum item alimentício reconhecido na foto.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function applyCheckedReceiptItems() {
    const r = aiState.lastReceipt;
    if (!r) return;
    const state = G().getState();
    let count = 0;
    document.querySelectorAll('.js-receipt-check:checked').forEach((chk) => {
      const it = r.itensEncontrados[Number(chk.dataset.rIdx)];
      if (!it || !it.matchedIngredientId || !(it.precoNormalizadoParaCadastro > 0)) return;
      const ing = state.ingredients.find((i) => i.id === it.matchedIngredientId);
      if (!ing) return;
      const oldPrice = ing.preco;
      ing.preco = it.precoNormalizadoParaCadastro;
      ing.aiMeta = {
        lastCheckedAt: new Date().toISOString(),
        lastStore: `Cupom: ${r.mercadoDetectado}`,
        matchedProduct: it.textoCupom,
        productUrl: null,
        previousPrice: oldPrice,
        deltaPct: oldPrice > 0 ? Math.round(((ing.preco - oldPrice) / oldPrice) * 1000) / 10 : 0,
        confidence: 'alta',
        applied: true,
      };
      count += 1;
    });
    if (count > 0) {
      G().saveState();
      G().showToast(`✓ ${count} preço(s) da nota fiscal aplicados! Custos e ROIs recalculados.`);
      G().switchTab('insumos');
    } else {
      G().showToast('Marque ao menos um item correspondente para aplicar.');
    }
  }

  // ======================== IMPORTADOR & PRECIFICADOR DE RECEITAS (IA) ========================
  function round2(val) {
    return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
  }

  function round4(val) {
    return Math.round((Number(val || 0) + Number.EPSILON) * 10000) / 10000;
  }

  function isSmallUnitSub(sub) {
    const u = String(sub?.unidadeRendimento || '').trim().toLowerCase();
    const raw = Number(sub?._rawCustoUnitario ?? sub?.custoUnitario ?? 0);
    return u === 'g' || u === 'ml' || (raw > 0 && raw < 1);
  }

  function formatSubUnitCostText(sub) {
    const raw = Number(sub?._rawCustoUnitario ?? sub?.custoUnitario ?? 0);
    const dec = isSmallUnitSub(sub) ? 4 : 2;
    return `${brl(raw, dec)}/${sub?.unidadeRendimento || 'un'}`;
  }

  function normalizeName(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function makeSlug(str, maxLen = 20) {
    return normalizeName(str)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen) || 'item';
  }

  function findExistingIngredientByName(nome, ingredients) {
    const target = normalizeName(nome);
    if (!target) return null;
    return (ingredients || []).find((i) => normalizeName(i.nome) === target) || null;
  }

  function computeChannelPricingLocal(custoUnitario, precoDireto, config) {
    const safeCost = Math.max(0, Number(custoUnitario || 0));
    const safeDirect = Math.max(0, Number(precoDireto || 0));
    if (typeof calculateChannelPricing === 'function') {
      const ch = calculateChannelPricing(safeCost, safeDirect, config || {});
      return {
        custoUnitario: round2(ch.custoUnitario),
        precoDireto: round2(ch.precoDireto),
        lucroDireto: round2(ch.lucroDireto),
        margemDiretaPct: round2(ch.margemDiretaPct),
        roiUnitarioPct: round2(ch.roiUnitarioPct),
        precoMinimoRecomendado: round2(ch.precoMinimoRecomendado),
        precoIfoodBasico: round2(ch.ifoodBasico?.preco || 0),
        precoIfoodEntrega: round2(ch.ifoodEntrega?.preco || 0),
        status: ch.status || 'saudavel',
      };
    }

    const taxaBasico = Number(config?.taxaIfoodBasico || 15.2) / 100;
    const taxaEntrega = Number(config?.taxaIfoodEntrega || 26.2) / 100;
    const margemMin = Number(config?.margemMinima || 35);
    const lucroDireto = safeDirect - safeCost;
    const margemDiretaPct = safeDirect > 0 ? (lucroDireto / safeDirect) * 100 : 0;
    const roiUnitarioPct = safeCost > 0 ? (lucroDireto / safeCost) * 100 : 0;
    const precoIfoodBasico = taxaBasico < 1 ? safeDirect / (1 - taxaBasico) : safeDirect;
    const precoIfoodEntrega = taxaEntrega < 1 ? safeDirect / (1 - taxaEntrega) : safeDirect;
    const margemFrac = margemMin / 100;
    const precoMinimoRecomendado = margemFrac < 1 ? safeCost / (1 - margemFrac) : safeCost * 2;
    let status = 'saudavel';
    if (lucroDireto <= 0) status = 'prejuizo';
    else if (margemDiretaPct < margemMin) status = 'baixa';

    return {
      custoUnitario: round2(safeCost),
      precoDireto: round2(safeDirect),
      lucroDireto: round2(lucroDireto),
      margemDiretaPct: round2(margemDiretaPct),
      roiUnitarioPct: round2(roiUnitarioPct),
      precoMinimoRecomendado: round2(precoMinimoRecomendado),
      precoIfoodBasico: round2(precoIfoodBasico),
      precoIfoodEntrega: round2(precoIfoodEntrega),
      status,
    };
  }

  function buildVirtualImportState(draft) {
    const state = G().getState();
    const virtualIngredients = [...(state.ingredients || [])];

    for (const novo of draft.novosInsumos || []) {
      if (novo._matchedExistingId) {
        const existing = (state.ingredients || []).find((i) => i.id === novo._matchedExistingId);
        if (existing) {
          virtualIngredients.push({ ...existing, id: novo.tempId });
          continue;
        }
      }
      if (!novo._included) continue;
      virtualIngredients.push({
        id: novo.tempId,
        nome: novo.nome,
        categoria: novo.categoria || 'Outros',
        preco: Math.max(0, Number(novo.preco || 0)),
        quantidade: Math.max(0.01, Number(novo.quantidade || 100)),
        unidade: novo.unidade || 'g',
        obs: novo.obs || '',
      });
    }

    const virtualRecipes = [
      ...(state.recipes || []),
      ...(draft.subreceitas || []).map((s) => ({ ...s, id: s.tempId })),
      ...(draft.produtos || []).map((p) => ({ ...p, id: p.tempId })),
    ];

    return {
      config: state.config || { margemMinima: 35, taxaIfoodBasico: 15.2, taxaIfoodEntrega: 26.2 },
      ingredients: virtualIngredients,
      recipes: virtualRecipes,
    };
  }

  function recomputeImportDraftCosts(draft) {
    if (!draft) return;
    const virtualState = buildVirtualImportState(draft);
    const hasEngine = typeof calculateRecipeCost === 'function';

    for (const sub of draft.subreceitas || []) {
      if (hasEngine && Array.isArray(sub.itens) && sub.itens.length > 0) {
        const calc = calculateRecipeCost(sub.tempId, virtualState);
        sub.custoTotal = round2(calc.custoTotal);
        sub._rawCustoUnitario = Number(calc.custoUnitario || 0);
        sub.custoUnitario = isSmallUnitSub(sub) ? round4(calc.custoUnitario) : round2(calc.custoUnitario);
        sub._breakdown = calc.breakdown || [];
      } else {
        sub.custoTotal = round2(sub.custoTotal || 0);
        const fallbackRaw = Number(sub.rendimento || 0) > 0 && Number(sub.custoTotal || 0) > 0
          ? Number(sub.custoTotal) / Number(sub.rendimento)
          : Number(sub._rawCustoUnitario ?? sub.custoUnitario ?? 0);
        sub._rawCustoUnitario = fallbackRaw;
        sub.custoUnitario = isSmallUnitSub(sub) ? round4(fallbackRaw) : round2(fallbackRaw);
        sub._breakdown = [];
      }
    }

    for (const prod of draft.produtos || []) {
      let custoTotalLote = round2(prod.pricingPreview?.custoTotalLote || 0);
      let custoUnitario = round2(prod.pricingPreview?.custoUnitario || 0);
      if (hasEngine && Array.isArray(prod.itens) && prod.itens.length > 0) {
        const calc = calculateRecipeCost(prod.tempId, virtualState);
        custoTotalLote = round2(calc.custoTotal);
        custoUnitario = round2(calc.custoUnitario);
        prod._breakdown = calc.breakdown || [];
      } else {
        prod._breakdown = [];
      }

      const precoDireto = Math.max(0, round2(prod.precoVendaDireta));
      const ch = computeChannelPricingLocal(custoUnitario, precoDireto, virtualState.config);
      prod.pricingPreview = {
        ...ch,
        custoTotalLote,
      };
    }
  }

  function getImportStatusClasses(status) {
    if (status === 'prejuizo') {
      return { badge: 'badge-terracotta', text: 'terracotta', label: 'Prejuízo' };
    }
    if (status === 'baixa') {
      return { badge: 'badge-amber', text: 'amber', label: 'Margem baixa' };
    }
    return { badge: 'badge-olive', text: 'olive', label: 'Saudável' };
  }

  function resolveImportItemDisplay(item, draft, state) {
    const qty = Number(item.quantidade || 0);
    if (item.tipo === 'insumo') {
      const novo = (draft.novosInsumos || []).find((n) => n.tempId === item.refId);
      if (novo) {
        if (novo._matchedExistingId) {
          const ex = (state.ingredients || []).find((i) => i.id === novo._matchedExistingId);
          if (ex) {
            const uCost = ex.quantidade > 0 ? Number(ex.preco || 0) / Number(ex.quantidade) : 0;
            return {
              nome: ex.nome,
              unidade: ex.unidade || 'g',
              tag: 'Estoque',
              tagCls: 'tag-stock',
              cost: round2(uCost * qty),
              excluded: false,
            };
          }
        }
        const excluded = !novo._included;
        const uCost = !excluded && novo.quantidade > 0 ? Number(novo.preco || 0) / Number(novo.quantidade) : 0;
        return {
          nome: novo.nome,
          unidade: novo.unidade || 'g',
          tag: excluded ? 'Excluído' : 'Novo',
          tagCls: excluded ? 'tag-excluded' : 'tag-new',
          cost: round2(uCost * qty),
          excluded,
        };
      }
      const ex = (state.ingredients || []).find((i) => i.id === item.refId);
      if (ex) {
        const uCost = ex.quantidade > 0 ? Number(ex.preco || 0) / Number(ex.quantidade) : 0;
        return {
          nome: ex.nome,
          unidade: ex.unidade || 'g',
          tag: ex.categoria === 'Embalagens' ? 'Embalagem' : '',
          tagCls: 'tag-pack',
          cost: round2(uCost * qty),
          excluded: false,
        };
      }
      return { nome: item.refId, unidade: 'g', tag: '', tagCls: '', cost: 0, excluded: false };
    }

    const newSub = (draft.subreceitas || []).find((s) => s.tempId === item.refId);
    if (newSub) {
      const rawUnit = Number.isFinite(newSub._rawCustoUnitario)
        ? newSub._rawCustoUnitario
        : (Number(newSub.rendimento || 0) > 0 && Number(newSub.custoTotal || 0) > 0
          ? Number(newSub.custoTotal) / Number(newSub.rendimento)
          : Number(newSub.custoUnitario || 0));
      return {
        nome: newSub.nome,
        unidade: newSub.unidadeRendimento || 'un',
        tag: 'Nova Base',
        tagCls: 'tag-sub',
        cost: round2(rawUnit * qty),
        excluded: false,
      };
    }
    const exSub = (state.recipes || []).find((r) => r.id === item.refId);
    if (exSub) {
      let subUnit = 0;
      if (typeof calculateRecipeCost === 'function') {
        subUnit = calculateRecipeCost(exSub.id, state).custoUnitario;
      }
      return {
        nome: exSub.nome,
        unidade: exSub.unidadeRendimento || 'un',
        tag: 'Base',
        tagCls: 'tag-sub',
        cost: round2(subUnit * qty),
        excluded: false,
      };
    }
    return { nome: item.refId, unidade: 'un', tag: 'Base', tagCls: 'tag-sub', cost: 0, excluded: false };
  }

  function buildImportCommitSummaryText(draft) {
    if (!draft) return '';
    const newIngs = (draft.novosInsumos || []).filter((n) => n._included && !n._matchedExistingId).length;
    const reusedIngs = (draft.novosInsumos || []).filter((n) => Boolean(n._matchedExistingId)).length;
    const subs = (draft.subreceitas || []).length;
    const prods = (draft.produtos || []).length;
    const parts = [];
    if (newIngs > 0) parts.push(`<strong>${newIngs}</strong> novo(s) insumo(s)`);
    if (reusedIngs > 0) parts.push(`<strong>${reusedIngs}</strong> reutilizado(s) do estoque`);
    if (subs > 0) parts.push(`<strong>${subs}</strong> base(s)`);
    if (prods > 0) parts.push(`<strong>${prods}</strong> produto(s) final(is)`);
    return parts.length
      ? `Pronto para importar: ${parts.join(' • ')}.`
      : 'Nenhum novo item selecionado para importação.';
  }

  function updateImportDraftDomInPlace() {
    const draft = aiState.lastImportDraft;
    const out = document.getElementById('ai-import-output');
    if (!draft || !out) return;
    const state = G().getState();
    const margemMin = Number(state.config?.margemMinima || 35);

    // 1. Atualiza custo unitário de cada novo insumo
    (draft.novosInsumos || []).forEach((n, idx) => {
      const effectivePrice = n._matchedExistingId ? Number(n._matchedExistingPreco || 0) : Number(n.preco || 0);
      const effectiveQty = n._matchedExistingId ? Number(n._matchedExistingQtd || 1) : Number(n.quantidade || 1);
      const effectiveUnit = n._matchedExistingId ? (n._matchedExistingUnidade || n.unidade) : n.unidade;
      const unitCost = effectiveQty > 0 ? effectivePrice / effectiveQty : 0;
      const uEl = out.querySelector(`[data-ing-unit-cost="${idx}"]`);
      if (uEl) uEl.textContent = `${brl(unitCost, 4)}/${effectiveUnit}`;
    });

    // 2. Atualiza custos das bases / sub-receitas e seus itens
    (draft.subreceitas || []).forEach((sub, sIdx) => {
      const totEl = out.querySelector(`[data-sub-total="${sIdx}"]`);
      const unitEl = out.querySelector(`[data-sub-unit="${sIdx}"]`);
      if (totEl) totEl.textContent = brl(sub.custoTotal);
      if (unitEl) unitEl.textContent = formatSubUnitCostText(sub);

      (sub.itens || []).forEach((it, iIdx) => {
        const meta = resolveImportItemDisplay(it, draft, state);
        const itemCostEl = out.querySelector(`[data-sub-item-cost="${sIdx}-${iIdx}"]`);
        const itemRowEl = out.querySelector(`[data-sub-item-row="${sIdx}-${iIdx}"]`);
        if (itemCostEl) itemCostEl.textContent = meta.excluded ? 'Excluído' : brl(meta.cost);
        if (itemRowEl) itemRowEl.classList.toggle('is-excluded', meta.excluded);
      });
    });

    // 3. Atualiza custos, lucro, margem, ROI e preços iFood dos produtos finais
    (draft.produtos || []).forEach((prod, pIdx) => {
      const pv = prod.pricingPreview || {};
      const st = getImportStatusClasses(pv.status);

      const costEl = out.querySelector(`[data-prod-cost="${pIdx}"]`);
      const batchEl = out.querySelector(`[data-prod-batch-cost="${pIdx}"]`);
      const minEl = out.querySelector(`[data-prod-min-hint="${pIdx}"]`);
      const lucroEl = out.querySelector(`[data-prod-lucro="${pIdx}"]`);
      const margemEl = out.querySelector(`[data-prod-margem="${pIdx}"]`);
      const roiEl = out.querySelector(`[data-prod-roi="${pIdx}"]`);
      const ifbEl = out.querySelector(`[data-prod-ifood-basico="${pIdx}"]`);
      const ifeEl = out.querySelector(`[data-prod-ifood-entrega="${pIdx}"]`);

      if (costEl) costEl.textContent = brl(pv.custoUnitario);
      if (batchEl) {
        batchEl.textContent = Number(prod.rendimento || 1) > 1
          ? `Lote (${G().formatInputNumber(prod.rendimento)}): ${brl(pv.custoTotalLote)}`
          : `Mín. (${num(margemMin, 0)}%): ${brl(pv.precoMinimoRecomendado)}`;
      }
      if (minEl) minEl.textContent = `Mín (${num(margemMin, 0)}%): ${brl(pv.precoMinimoRecomendado)}`;
      if (lucroEl) {
        lucroEl.textContent = brl(pv.lucroDireto);
        lucroEl.className = `tabular ai-import-lucro ${st.text}`;
      }
      if (margemEl) {
        margemEl.textContent = `${num(pv.margemDiretaPct, 1)}%`;
        margemEl.className = `badge ${st.badge}`;
      }
      if (roiEl) {
        roiEl.textContent = `${num(pv.roiUnitarioPct, 1)}%`;
        roiEl.className = `tabular ai-import-roi ${Number(pv.roiUnitarioPct || 0) >= 0 ? 'olive' : 'terracotta'}`;
      }
      if (ifbEl) ifbEl.textContent = brl(pv.precoIfoodBasico);
      if (ifeEl) ifeEl.textContent = brl(pv.precoIfoodEntrega);

      (prod.itens || []).forEach((it, iIdx) => {
        const meta = resolveImportItemDisplay(it, draft, state);
        const itemCostEl = out.querySelector(`[data-prod-item-cost="${pIdx}-${iIdx}"]`);
        const itemRowEl = out.querySelector(`[data-prod-item-row="${pIdx}-${iIdx}"]`);
        if (itemCostEl) itemCostEl.textContent = meta.excluded ? 'Excluído' : brl(meta.cost);
        if (itemRowEl) itemRowEl.classList.toggle('is-excluded', meta.excluded);
      });
    });

    const summaryEl = document.getElementById('ai-import-commit-summary');
    if (summaryEl) summaryEl.innerHTML = buildImportCommitSummaryText(draft);
  }

  function renderImportPreview() {
    const out = document.getElementById('ai-import-output');
    const draft = aiState.lastImportDraft;
    if (!out) return;
    if (!draft) {
      out.innerHTML = '';
      return;
    }

    const state = G().getState();
    const taxaBasico = Number(state.config?.taxaIfoodBasico || 15.2);
    const taxaEntrega = Number(state.config?.taxaIfoodEntrega || 26.2);
    const margemMin = Number(state.config?.margemMinima || 35);

    const novos = draft.novosInsumos || [];
    const subs = draft.subreceitas || [];
    const prods = draft.produtos || [];

    const novosHtml = novos.length ? `
      <div class="ai-import-section">
        <div class="ai-import-section-head">
          <div>
            <h4 class="ai-import-section-title">📦 Novos Insumos (${novos.length})</h4>
            <p class="ai-import-section-sub">Revise ou edite o preço da embalagem — todos os custos e lucros abaixo recalculam ao vivo.</p>
          </div>
        </div>

        <div class="ai-import-ing-list">
          <div class="ai-import-ing-head">
            <span>Usar</span>
            <span>Insumo &amp; Embalagem</span>
            <span>Categoria</span>
            <span class="td-right">Preço Emb. (R$)</span>
            <span class="td-right">Custo Unit.</span>
          </div>
          ${novos.map((n, idx) => {
            const matched = Boolean(n._matchedExistingId);
            const effectivePrice = matched ? Number(n._matchedExistingPreco || 0) : Number(n.preco || 0);
            const effectiveQty = matched ? Number(n._matchedExistingQtd || 1) : Number(n.quantidade || 1);
            const effectiveUnit = matched ? (n._matchedExistingUnidade || n.unidade) : n.unidade;
            const unitCost = effectiveQty > 0 ? effectivePrice / effectiveQty : 0;
            const lq = n.liveQuote && typeof n.liveQuote === 'object' ? n.liveQuote : null;
            const lqTitle = lq ? (lq.title || lq.matchedProduct || '') : '';
            const lqUrl = lq ? (lq.url || lq.productUrl || '') : '';

            return `
              <div class="ai-import-ing-row ${!n._included && !matched ? 'is-excluded' : ''}" data-ing-row="${idx}">
                <div class="ai-import-ing-check">
                  <input type="checkbox" class="js-import-ing-toggle" data-ing-idx="${idx}" ${n._included ? 'checked' : ''} ${matched ? 'disabled title="Já existe no estoque — será reutilizado automaticamente"' : ''} aria-label="Incluir ${esc(n.nome)}" />
                </div>
                <div class="ai-import-ing-info">
                  <div class="ai-import-ing-name-line">
                    <strong>${esc(n.nome)}</strong>
                    ${matched
                      ? `<span class="badge badge-olive">✓ Já no estoque (${esc(n._matchedExistingName)})</span>`
                      : '<span class="badge badge-gold">Novo insumo</span>'}
                  </div>
                  <div class="ai-import-ing-meta">
                    Emb.: <strong>${G().formatInputNumber(effectiveQty)} ${esc(effectiveUnit)}</strong>${n.obs ? ` • ${esc(n.obs)}` : ''}
                  </div>
                  ${lq ? `
                    <div class="ai-import-live-quote">
                      <span>🏪 ${esc(lq.store || 'Cotação SC')}${lqTitle ? ` — ${esc(lqTitle)}` : ''}</span>
                      ${lqUrl ? `<a href="${esc(lqUrl)}" target="_blank" rel="noopener noreferrer" class="ai-product-link">oferta ↗</a>` : ''}
                    </div>
                  ` : ''}
                </div>
                <div class="ai-import-ing-cat">
                  <span class="badge badge-gold">${esc(n.categoria || 'Outros')}</span>
                </div>
                <div class="ai-import-ing-price-cell">
                  <span class="ai-import-mobile-lbl">Preço (R$)</span>
                  <input type="text" inputmode="decimal" class="input-inline input-num js-import-ing-price" data-ing-idx="${idx}" value="${num(effectivePrice, 2)}" ${matched || !n._included ? 'disabled' : ''} aria-label="Preço de ${esc(n.nome)}" />
                </div>
                <div class="ai-import-ing-unit-cell">
                  <span class="ai-import-mobile-lbl">Custo unit.</span>
                  <span class="tabular ai-import-unit-cost" data-ing-unit-cost="${idx}">${brl(unitCost, 4)}/${esc(effectiveUnit)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const subsHtml = subs.length ? `
      <div class="ai-import-section">
        <div class="ai-import-section-head">
          <div>
            <h4 class="ai-import-section-title">🥣 Bases &amp; Sub-receitas (${subs.length})</h4>
            <p class="ai-import-section-sub">Massas e recheios compartilhados — clique para conferir ingredientes e modo de preparo.</p>
          </div>
        </div>

        <div class="ai-import-subs-grid">
          ${subs.map((sub, sIdx) => `
            <details class="ai-import-sub-card" data-sub-idx="${sIdx}">
              <summary class="ai-import-sub-summary">
                <div class="ai-import-sub-main">
                  <div class="ai-import-sub-title-line">
                    <span class="badge badge-gold">🥣 Base</span>
                    <strong>${esc(sub.nome)}</strong>
                  </div>
                  <div class="ai-import-sub-meta">
                    Rende ${G().formatInputNumber(sub.rendimento)} ${esc(sub.unidadeRendimento || 'un')}${sub.pesoReferencia ? ` • ${esc(sub.pesoReferencia)}` : ''} • Indiretos ${num(sub.custosIndiretosPct || 0, 0)}%
                  </div>
                </div>
                <div class="ai-import-sub-costs">
                  <div>
                    <span class="ai-import-cost-lbl">Lote</span>
                    <strong class="tabular" data-sub-total="${sIdx}">${brl(sub.custoTotal)}</strong>
                  </div>
                  <div>
                    <span class="ai-import-cost-lbl">Unitário</span>
                    <strong class="tabular" data-sub-unit="${sIdx}">${brl(Number(sub._rawCustoUnitario ?? sub.custoUnitario ?? 0), isSmallUnitSub(sub) ? 4 : 2)}/${esc(sub.unidadeRendimento || 'un')}</strong>
                  </div>
                </div>
              </summary>

              <div class="ai-import-sub-body">
                <div class="ai-import-sub-block-title">Ingredientes (${(sub.itens || []).length})</div>
                <ul class="ai-import-items-list">
                  ${(sub.itens || []).map((it, iIdx) => {
                    const meta = resolveImportItemDisplay(it, draft, state);
                    return `
                      <li class="ai-import-item-line ${meta.excluded ? 'is-excluded' : ''}" data-sub-item-row="${sIdx}-${iIdx}">
                        <span>
                          <strong>${G().formatInputNumber(it.quantidade)} ${esc(meta.unidade)}</strong> • ${esc(meta.nome)}
                          ${meta.tag ? `<span class="ai-import-mini-tag ${meta.tagCls}">${esc(meta.tag)}</span>` : ''}
                        </span>
                        <span class="tabular ai-import-item-cost" data-sub-item-cost="${sIdx}-${iIdx}">${meta.excluded ? 'Excluído' : brl(meta.cost)}</span>
                      </li>
                    `;
                  }).join('') || '<li class="ai-import-item-line"><span>Sem itens vinculados.</span></li>'}
                </ul>
                ${Array.isArray(sub.passos) && sub.passos.length ? `
                  <div class="ai-import-sub-block-title" style="margin-top:10px;">Modo de Preparo (${sub.passos.length} passos)</div>
                  <ol class="recipe-steps-list">
                    ${sub.passos.map((p) => `<li>${esc(p)}</li>`).join('')}
                  </ol>
                ` : ''}
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    ` : '';

    const prodsHtml = prods.length ? `
      <div class="ai-import-section">
        <div class="ai-import-section-head">
          <div>
            <h4 class="ai-import-section-title">🧁 Produtos Finais &amp; Tabela de Precificação (${prods.length})</h4>
            <p class="ai-import-section-sub">Edite o <strong>Preço Direto</strong> inline para recalcular Lucro, Margem %, ROI % e preços iFood instantaneamente.</p>
          </div>
        </div>

        <div class="ai-import-prods-wrap">
          <div class="ai-import-prod-table-head">
            <span>Produto Final</span>
            <span class="td-right">Custo Unit.</span>
            <span class="td-right">Preço Direto (R$)</span>
            <span class="td-right">Lucro &amp; Margem</span>
            <span class="td-right">ROI Unit.</span>
            <span class="td-right">iFood Básico</span>
            <span class="td-right">iFood Entrega</span>
          </div>

          ${prods.map((prod, pIdx) => {
            const pv = prod.pricingPreview || {};
            const st = getImportStatusClasses(pv.status);
            return `
              <div class="ai-import-prod-item" data-prod-idx="${pIdx}">
                <div class="ai-import-prod-row">
                  <div class="ai-import-prod-col-name">
                    <div class="ai-import-prod-name-row">
                      <span class="badge badge-olive">🧁 Produto</span>
                      <strong class="ai-import-prod-name">${esc(prod.nome)}</strong>
                    </div>
                    <div class="ai-import-prod-meta">
                      Rende ${G().formatInputNumber(prod.rendimento)} ${esc(prod.unidadeRendimento || 'un')}${prod.pesoReferencia ? ` • ${esc(prod.pesoReferencia)}` : ''}
                    </div>
                  </div>

                  <div class="ai-import-metric-cell">
                    <span class="ai-import-mobile-lbl">Custo Unit.</span>
                    <strong class="tabular" data-prod-cost="${pIdx}">${brl(pv.custoUnitario)}</strong>
                    <span class="ai-import-cell-sub tabular" data-prod-batch-cost="${pIdx}">
                      ${Number(prod.rendimento || 1) > 1
                        ? `Lote (${G().formatInputNumber(prod.rendimento)}): ${brl(pv.custoTotalLote)}`
                        : `Mín. (${num(margemMin, 0)}%): ${brl(pv.precoMinimoRecomendado)}`}
                    </span>
                  </div>

                  <div class="ai-import-metric-cell ai-import-price-cell">
                    <span class="ai-import-mobile-lbl">Preço Direto (R$)</span>
                    <input type="text" inputmode="decimal" class="input-inline input-num ai-import-price-input js-import-prod-price" data-prod-idx="${pIdx}" value="${num(prod.precoVendaDireta, 2)}" aria-label="Preço Direto de ${esc(prod.nome)}" />
                    <span class="ai-import-cell-sub tabular" data-prod-min-hint="${pIdx}">Mín (${num(margemMin, 0)}%): ${brl(pv.precoMinimoRecomendado)}</span>
                  </div>

                  <div class="ai-import-metric-cell">
                    <span class="ai-import-mobile-lbl">Lucro &amp; Margem</span>
                    <strong class="tabular ai-import-lucro ${st.text}" data-prod-lucro="${pIdx}">${brl(pv.lucroDireto)}</strong>
                    <span class="badge ${st.badge}" data-prod-margem="${pIdx}">${num(pv.margemDiretaPct, 1)}%</span>
                  </div>

                  <div class="ai-import-metric-cell">
                    <span class="ai-import-mobile-lbl">ROI Unit.</span>
                    <strong class="tabular ai-import-roi ${Number(pv.roiUnitarioPct || 0) >= 0 ? 'olive' : 'terracotta'}" data-prod-roi="${pIdx}">${num(pv.roiUnitarioPct, 1)}%</strong>
                    <span class="ai-import-cell-sub">Retorno s/ custo</span>
                  </div>

                  <div class="ai-import-metric-cell">
                    <span class="ai-import-mobile-lbl">iFood Básico</span>
                    <strong class="tabular" data-prod-ifood-basico="${pIdx}">${brl(pv.precoIfoodBasico)}</strong>
                    <span class="ai-import-cell-sub">Taxa ${num(taxaBasico, 1)}%</span>
                  </div>

                  <div class="ai-import-metric-cell">
                    <span class="ai-import-mobile-lbl">iFood Entrega</span>
                    <strong class="tabular" data-prod-ifood-entrega="${pIdx}">${brl(pv.precoIfoodEntrega)}</strong>
                    <span class="ai-import-cell-sub">Taxa ${num(taxaEntrega, 1)}%</span>
                  </div>
                </div>

                <details class="ai-import-prod-details">
                  <summary class="ai-import-prod-details-summary">
                    <span>📋 Ver ingredientes (${(prod.itens || []).length}) e modo de preparo (${(prod.passos || []).length} passos)</span>
                    ${prod.justificativaComercial ? `<span class="ai-import-just-preview">${esc(prod.justificativaComercial)}</span>` : ''}
                  </summary>
                  <div class="ai-import-prod-details-body">
                    ${prod.justificativaComercial ? `<p class="ai-import-just-full">💡 <strong>Estratégia comercial:</strong> ${esc(prod.justificativaComercial)}</p>` : ''}
                    <div class="ai-import-details-cols">
                      <div>
                        <div class="ai-import-sub-block-title">Composição da Ficha (${(prod.itens || []).length})</div>
                        <ul class="ai-import-items-list">
                          ${(prod.itens || []).map((it, iIdx) => {
                            const meta = resolveImportItemDisplay(it, draft, state);
                            return `
                              <li class="ai-import-item-line ${meta.excluded ? 'is-excluded' : ''}" data-prod-item-row="${pIdx}-${iIdx}">
                                <span>
                                  <strong>${G().formatInputNumber(it.quantidade)} ${esc(meta.unidade)}</strong> • ${esc(meta.nome)}
                                  ${meta.tag ? `<span class="ai-import-mini-tag ${meta.tagCls}">${esc(meta.tag)}</span>` : ''}
                                </span>
                                <span class="tabular ai-import-item-cost" data-prod-item-cost="${pIdx}-${iIdx}">${meta.excluded ? 'Excluído' : brl(meta.cost)}</span>
                              </li>
                            `;
                          }).join('') || '<li class="ai-import-item-line"><span>Sem itens vinculados.</span></li>'}
                        </ul>
                      </div>
                      ${Array.isArray(prod.passos) && prod.passos.length ? `
                        <div>
                          <div class="ai-import-sub-block-title">Modo de Preparo (${prod.passos.length} passos)</div>
                          <ol class="recipe-steps-list">
                            ${prod.passos.map((p) => `<li>${esc(p)}</li>`).join('')}
                          </ol>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </details>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    out.innerHTML = `
      <div class="ai-import-preview-shell">
        <div class="ai-import-summary-bar">
          <div style="flex:1; min-width:220px;">
            <div class="ai-import-summary-badges">
              <span class="badge badge-ai">✨ ${esc(draft.model || 'Gemini IA')}</span>
              <span class="badge badge-gold">Margem alvo: ${num(draft.targetMargin || 50, 0)}%</span>
              ${novos.length ? `<span class="badge badge-gold">${novos.length} insumo(s)</span>` : ''}
              ${subs.length ? `<span class="badge badge-gold">${subs.length} base(s)</span>` : ''}
              ${prods.length ? `<span class="badge badge-olive">${prods.length} produto(s)</span>` : ''}
            </div>
            <p class="ai-import-summary-text">${esc(draft.summary || 'Receitas analisadas e precificadas com sucesso. Revise os valores abaixo antes de importar.')}</p>
          </div>
        </div>

        ${novosHtml}
        ${subsHtml}
        ${prodsHtml}

        <div class="ai-import-footer">
          <div id="ai-import-commit-summary" class="ai-import-commit-summary">
            ${buildImportCommitSummaryText(draft)}
          </div>
          <div class="ai-import-footer-actions">
            <button id="btn-ai-import-clear" class="btn btn-secondary" type="button">Limpar</button>
            <button id="btn-ai-import-commit" class="btn btn-primary" type="button">✓ Importar Tudo para Estoque &amp; Fichas Técnicas</button>
          </div>
        </div>
      </div>
    `;
  }

  async function parseImportRecipes() {
    if (aiState.loading) return;
    const ta = document.getElementById('ai-import-raw-text');
    const rawText = (ta?.value || '').trim();
    if (!rawText) {
      G().showToast('Cole o texto da receita ou conversa de WhatsApp primeiro!');
      ta?.focus();
      return;
    }

    const marginRaw = G().parseLocaleNumber(document.getElementById('ai-import-margin')?.value || 50);
    const targetMargin = Math.max(20, Math.min(80, Number.isFinite(marginRaw) && marginRaw > 0 ? marginRaw : 50));
    const livePriceNewIngredients = Boolean(document.getElementById('ai-import-live-prices')?.checked);
    const out = document.getElementById('ai-import-output');

    setBusy(
      true,
      livePriceNewIngredients
        ? 'Analisando receita com Gemini IA e cotando novos insumos ao vivo nos mercados SC...'
        : 'Analisando texto, estruturando fichas técnicas e calculando precificação com Gemini IA...',
    );

    try {
      const state = G().getState();
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({
          action: 'import_recipes',
          rawText,
          targetMargin,
          livePriceNewIngredients,
          state,
        }),
      });

      const novosInsumos = (Array.isArray(res.novosInsumos) ? res.novosInsumos : []).map((n, idx) => {
        const matched = findExistingIngredientByName(n.nome, state.ingredients);
        return {
          tempId: String(n.tempId || `new-ing-${idx + 1}`),
          nome: String(n.nome || `Insumo ${idx + 1}`).trim(),
          categoria: String(n.categoria || 'Outros').trim(),
          preco: Math.max(0, round2(n.preco)),
          quantidade: Math.max(0.01, Number(n.quantidade || 100)),
          unidade: ['g', 'ml', 'un'].includes(n.unidade) ? n.unidade : 'g',
          obs: String(n.obs || '').trim(),
          liveQuote: n.liveQuote || null,
          _included: !matched,
          _matchedExistingId: matched ? matched.id : null,
          _matchedExistingName: matched ? matched.nome : null,
          _matchedExistingPreco: matched ? Number(matched.preco || 0) : null,
          _matchedExistingQtd: matched ? Number(matched.quantidade || 1) : null,
          _matchedExistingUnidade: matched ? matched.unidade : null,
        };
      });

      const subreceitas = (Array.isArray(res.subreceitas) ? res.subreceitas : []).map((s, idx) => ({
        tempId: String(s.tempId || `new-sub-${idx + 1}`),
        nome: String(s.nome || `Base ${idx + 1}`).trim(),
        tipo: 'subreceita',
        rendimento: Math.max(0.01, Number(s.rendimento || 1)),
        unidadeRendimento: String(s.unidadeRendimento || 'un').trim(),
        pesoReferencia: String(s.pesoReferencia || '').trim(),
        custosIndiretosPct: Math.max(0, Number(s.custosIndiretosPct ?? 15)),
        itens: Array.isArray(s.itens) ? s.itens.map((it) => ({
          tipo: it.tipo === 'subreceita' ? 'subreceita' : 'insumo',
          refId: String(it.refId || ''),
          quantidade: Math.max(0, Number(it.quantidade || 0)),
        })) : [],
        passos: Array.isArray(s.passos) ? s.passos.filter(Boolean).map(String) : [],
        custoTotal: round2(s.custoTotal || 0),
        _rawCustoUnitario: Number(s.custoUnitario || 0),
        custoUnitario: Number(s.custoUnitario || 0),
      }));

      const produtos = (Array.isArray(res.produtos) ? res.produtos : []).map((p, idx) => {
        const directPrice = Math.max(0, round2(p.precoVendaDireta ?? p.pricingPreview?.precoDireto ?? 0));
        return {
          tempId: String(p.tempId || `new-prod-${idx + 1}`),
          nome: String(p.nome || `Produto ${idx + 1}`).trim(),
          tipo: 'produto',
          rendimento: Math.max(0.01, Number(p.rendimento || 1)),
          unidadeRendimento: String(p.unidadeRendimento || 'un').trim(),
          pesoReferencia: String(p.pesoReferencia || '').trim(),
          custosIndiretosPct: Math.max(0, Number(p.custosIndiretosPct ?? 0)),
          precoVendaDireta: directPrice,
          fornadasPlanejadas: Math.max(0, Number(p.fornadasPlanejadas || 0)),
          itens: Array.isArray(p.itens) ? p.itens.map((it) => ({
            tipo: it.tipo === 'subreceita' ? 'subreceita' : 'insumo',
            refId: String(it.refId || ''),
            quantidade: Math.max(0, Number(it.quantidade || 0)),
          })) : [],
          passos: Array.isArray(p.passos) ? p.passos.filter(Boolean).map(String) : [],
          justificativaComercial: String(p.justificativaComercial || '').trim(),
          pricingPreview: p.pricingPreview ? { ...p.pricingPreview } : null,
        };
      });

      const draft = {
        model: res.model || 'gemini-3.6-flash',
        summary: String(res.summary || '').trim(),
        targetMargin,
        novosInsumos,
        subreceitas,
        produtos,
      };

      recomputeImportDraftCosts(draft);
      aiState.lastImportDraft = draft;
      renderImportPreview();

      G().showToast(`✨ Analisado! ${novosInsumos.length} insumo(s), ${subreceitas.length} base(s) e ${produtos.length} produto(s) prontos para revisão.`);
      requestAnimationFrame(() => {
        out?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (err) {
      if (out) out.innerHTML = `<div class="alert-banner terracotta">${esc(err.message)}</div>`;
      G().showToast(`Erro ao analisar receita: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function clearImportDraft() {
    aiState.lastImportDraft = null;
    const out = document.getElementById('ai-import-output');
    if (out) out.innerHTML = '';
    const ta = document.getElementById('ai-import-raw-text');
    if (ta) {
      ta.value = '';
      ta.focus();
    }
  }

  function commitImportedRecipes() {
    const draft = aiState.lastImportDraft;
    if (!draft) return;

    const state = G().getState();
    const ts = Date.now();
    const tempIdMap = new Map();
    const excludedIngTempIds = new Set();

    const existingIngByName = new Map();
    for (const ing of state.ingredients || []) {
      const norm = normalizeName(ing.nome);
      if (norm && !existingIngByName.has(norm)) {
        existingIngByName.set(norm, ing);
      }
    }

    let addedIngs = 0;
    let addedSubs = 0;
    let addedProds = 0;

    // 1. Novos Insumos (evita duplicatas por nome normalizado e constrói tempIdMap)
    (draft.novosInsumos || []).forEach((novo, idx) => {
      const norm = normalizeName(novo.nome);
      const existing = existingIngByName.get(norm);
      if (existing) {
        tempIdMap.set(novo.tempId, existing.id);
        return;
      }
      if (!novo._included) {
        excludedIngTempIds.add(novo.tempId);
        return;
      }

      const realId = `ing-ia-${makeSlug(novo.nome)}-${ts}-${idx}`;
      const lq = novo.liveQuote && typeof novo.liveQuote === 'object' ? novo.liveQuote : null;
      const newIng = {
        id: realId,
        nome: String(novo.nome || `Insumo ${idx + 1}`).trim(),
        categoria: String(novo.categoria || 'Outros').trim(),
        preco: Math.max(0.01, round2(novo.preco)),
        quantidade: Math.max(0.01, Number(novo.quantidade || 100)),
        unidade: ['g', 'ml', 'un'].includes(novo.unidade) ? novo.unidade : 'g',
        obs: String(novo.obs || 'Importado via IA').trim(),
      };
      if (lq) {
        newIng.aiMeta = {
          lastCheckedAt: new Date().toISOString(),
          lastStore: String(lq.store || 'Mercado SC'),
          matchedProduct: String(lq.title || lq.matchedProduct || newIng.nome),
          productUrl: lq.url || lq.productUrl || null,
          previousPrice: null,
          deltaPct: 0,
          confidence: lq.confidence || 'media',
          applied: true,
        };
      }

      state.ingredients.push(newIng);
      if (norm) existingIngByName.set(norm, newIng);
      tempIdMap.set(novo.tempId, realId);
      addedIngs += 1;
    });

    // 2. Gera IDs permanentes para todas as sub-receitas antes de remapear itens (suporta base -> base)
    const subEntries = (draft.subreceitas || []).map((sub, idx) => {
      const realId = `sub-ia-${makeSlug(sub.nome)}-${ts}-${idx}`;
      tempIdMap.set(sub.tempId, realId);
      return { sub, realId };
    });

    const validIngIds = new Set((state.ingredients || []).map((i) => i.id));
    const validSubIds = new Set([
      ...(state.recipes || []).filter((r) => r.tipo === 'subreceita').map((r) => r.id),
      ...subEntries.map((e) => e.realId),
    ]);

    const remapItems = (itens) => (Array.isArray(itens) ? itens : [])
      .map((it) => {
        const tipo = it.tipo === 'subreceita' ? 'subreceita' : 'insumo';
        const quantidade = Number(it.quantidade || 0);
        if (tipo === 'insumo' && excludedIngTempIds.has(it.refId)) return null;
        const mappedRefId = tempIdMap.get(it.refId) || it.refId;
        if (!(quantidade > 0)) return null;
        if (tipo === 'insumo' && !validIngIds.has(mappedRefId)) return null;
        if (tipo === 'subreceita' && !validSubIds.has(mappedRefId)) return null;
        return { tipo, refId: mappedRefId, quantidade };
      })
      .filter(Boolean);

    // 3. Adiciona Sub-receitas com refIds remapeados
    for (const { sub, realId } of subEntries) {
      state.recipes.push({
        id: realId,
        nome: String(sub.nome || 'Base Importada').trim(),
        tipo: 'subreceita',
        rendimento: Math.max(0.01, Number(sub.rendimento || 1)),
        unidadeRendimento: String(sub.unidadeRendimento || 'un').trim(),
        pesoReferencia: String(sub.pesoReferencia || '').trim(),
        custosIndiretosPct: Math.max(0, Number(sub.custosIndiretosPct ?? 15)),
        itens: remapItems(sub.itens),
        passos: Array.isArray(sub.passos) ? sub.passos.filter(Boolean).map(String) : [],
      });
      addedSubs += 1;
    }

    // 4. Adiciona Produtos Finais com refIds remapeados
    (draft.produtos || []).forEach((prod, idx) => {
      const realId = `prod-ia-${makeSlug(prod.nome)}-${ts}-${idx}`;
      tempIdMap.set(prod.tempId, realId);
      state.recipes.push({
        id: realId,
        nome: String(prod.nome || 'Produto Importado').trim(),
        tipo: 'produto',
        rendimento: Math.max(0.01, Number(prod.rendimento || 1)),
        unidadeRendimento: String(prod.unidadeRendimento || 'un').trim(),
        pesoReferencia: String(prod.pesoReferencia || '').trim(),
        custosIndiretosPct: Math.max(0, Number(prod.custosIndiretosPct ?? 0)),
        precoVendaDireta: Math.max(0, round2(prod.precoVendaDireta ?? prod.pricingPreview?.precoDireto ?? 0)),
        fornadasPlanejadas: Math.max(0, Number(prod.fornadasPlanejadas || 0)),
        itens: remapItems(prod.itens),
        passos: Array.isArray(prod.passos) ? prod.passos.filter(Boolean).map(String) : [],
      });
      addedProds += 1;
    });

    if (addedIngs === 0 && addedSubs === 0 && addedProds === 0) {
      G().showToast('Nenhum item selecionado para importar.');
      return;
    }

    aiState.lastImportDraft = null;
    const out = document.getElementById('ai-import-output');
    if (out) out.innerHTML = '';
    const ta = document.getElementById('ai-import-raw-text');
    if (ta) ta.value = '';

    G().saveState();
    G().switchTab('receitas');
    G().showToast(`✨ Importado! ${addedIngs} insumo(s), ${addedSubs} base(s) e ${addedProds} produto(s) adicionados.`);
  }

  function openRecipeImporter() {
    G().switchTab('ia');
    switchAiSub('lab');
    requestAnimationFrame(() => {
      const card = document.getElementById('ai-import-recipe-card');
      const ta = document.getElementById('ai-import-raw-text');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        ta?.focus({ preventScroll: true });
      }, 220);
    });
  }

  // ======================== LABORATÓRIO CRIATIVO IA ========================
  async function generateAiRecipe() {
    const idea = (document.getElementById('ai-recipe-idea')?.value || '').trim();
    const targetMargin = G().parseLocaleNumber(document.getElementById('ai-recipe-margin')?.value || 50) || 50;
    if (!idea) {
      G().showToast('Descreva a ideia da receita primeiro!');
      return;
    }

    const out = document.getElementById('ai-recipe-output');
    setBusy(true, 'Criando ficha técnica completa usando seus insumos reais...');
    try {
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_recipe', idea, targetMargin, state: G().getState() }),
      });
      const rec = res.recipe;
      aiState.lastGeneratedRecipe = rec;

      const state = G().getState();
      const ingMap = new Map(state.ingredients.map((i) => [i.id, i]));
      const subMap = new Map(state.recipes.map((r) => [r.id, r]));

      const itensList = (rec.itens || []).map((it) => {
        const ref = it.tipo === 'insumo' ? ingMap.get(it.refId) : subMap.get(it.refId);
        const unit = it.tipo === 'insumo' ? (ref?.unidade || 'g') : (ref?.unidadeRendimento || 'un');
        return `<li><strong>${G().formatInputNumber(it.quantidade)} ${esc(unit)}</strong> • ${esc(ref?.nome || it.refId)}</li>`;
      }).join('');

      const novosList = (rec.novosInsumosSugeridos || []).map((n) => (
        `<li><strong>${G().formatInputNumber(n.quantidadeNaReceita)} ${esc(n.unidade)}</strong> • ${esc(n.nome)} <em>(novo insumo est.: ${brl(n.precoEstimado)} / ${n.quantidadeEmb}${esc(n.unidade)})</em></li>`
      )).join('');

      out.innerHTML = `
        <div class="channel-box highlight" style="margin-top:6px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <div>
              <span class="badge badge-olive">${rec.tipo === 'subreceita' ? '🥣 Base' : '🧁 Produto Final'}</span>
              <h4 style="margin:6px 0 2px; font-family:var(--font-display); font-size:1.1rem;">${esc(rec.nome)}</h4>
              <div style="font-size:0.8rem; color:var(--text-muted);">Rende ${G().formatInputNumber(rec.rendimento)} ${esc(rec.unidadeRendimento)} • ${esc(rec.pesoReferencia)} • Preço sugerido: <strong>${brl(rec.precoVendaDireta)}</strong></div>
            </div>
            <button id="btn-ai-save-recipe" class="btn btn-primary btn-sm" type="button">+ Salvar nas Fichas Técnicas</button>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 8px;">${esc(rec.justificativaComercial)}</p>
          <ul class="ai-md-list">${itensList}${novosList}</ul>
          <details style="margin-top:8px;">
            <summary style="cursor:pointer; font-size:0.8rem; font-weight:700; color:var(--gold-dark);">Ver modo de preparo (${(rec.passos || []).length} passos)</summary>
            <ol class="recipe-steps-list">${(rec.passos || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
          </details>
        </div>
      `;
    } catch (err) {
      out.innerHTML = `<div class="alert-banner terracotta">${esc(err.message)}</div>`;
    } finally {
      setBusy(false);
    }
  }

  function saveGeneratedRecipeToState() {
    const rec = aiState.lastGeneratedRecipe;
    if (!rec) return;
    const state = G().getState();
    const finalItems = [...(rec.itens || [])];

    // Se a IA sugeriu insumos novos, cadastra-os automaticamente no estoque e vincula na receita!
    for (const novo of rec.novosInsumosSugeridos || []) {
      const newId = 'ing-ia-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      state.ingredients.unshift({
        id: newId,
        nome: novo.nome,
        categoria: novo.categoria || 'Outros',
        preco: Math.max(0.1, Number(novo.precoEstimado || 10)),
        quantidade: Math.max(1, Number(novo.quantidadeEmb || 100)),
        unidade: novo.unidade || 'g',
        obs: 'Cadastrado automaticamente pela IA',
      });
      finalItems.push({
        tipo: 'insumo',
        refId: newId,
        quantidade: Math.max(0.1, Number(novo.quantidadeNaReceita || 1)),
      });
    }

    state.recipes.push({
      id: 'rec-ia-' + Date.now(),
      nome: rec.nome,
      tipo: rec.tipo === 'subreceita' ? 'subreceita' : 'produto',
      rendimento: Math.max(1, Number(rec.rendimento || 1)),
      unidadeRendimento: rec.unidadeRendimento || 'un',
      pesoReferencia: rec.pesoReferencia || '',
      custosIndiretosPct: Math.max(0, Number(rec.custosIndiretosPct ?? 15)),
      precoVendaDireta: Math.max(0, Number(rec.precoVendaDireta || 10)),
      fornadasPlanejadas: 0,
      itens: finalItems,
      passos: Array.isArray(rec.passos) ? rec.passos : [],
    });

    G().saveState();
    G().showToast(`🧁 "${rec.nome}" salva nas Fichas Técnicas!`);
    G().switchTab('receitas');
  }

  async function optimizeGoalPlan() {
    const targetProfit = G().parseLocaleNumber(document.getElementById('ai-goal-profit')?.value || 1500) || 1500;
    const periodo = document.getElementById('ai-goal-period')?.value || 'Mensal';
    const maxUnits = G().parseLocaleNumber(document.getElementById('ai-goal-max-units')?.value || 250) || 250;
    const out = document.getElementById('ai-goal-output');

    setBusy(true, 'Calculando o plano ideal de fornadas para maximizar seu ROI...');
    try {
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({
          action: 'optimize_goal',
          targetProfit,
          periodo,
          maxUnits,
          state: G().getState(),
        }),
      });
      aiState.lastGoalPlan = { periodo: res.periodo, plan: res.plan };
      const plan = res.plan;

      out.innerHTML = `
        <div class="channel-box highlight" style="margin-top:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <span class="badge ${plan.metaAtingivel ? 'badge-olive' : 'badge-amber'}">${plan.metaAtingivel ? '✓ Meta atingível' : '⚡ Requer escala extra'}</span>
            <button id="btn-ai-apply-goal-plan" class="btn btn-primary btn-sm" type="button">Aplicar no Planejador (${esc(res.periodo)})</button>
          </div>
          <p style="font-size:0.84rem; margin:0 0 10px;">${esc(plan.resumoEstrategia)}</p>
          <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px;">
            ${(plan.planoFornadas || []).filter((f) => f.fornadasRecomendadas > 0).map((f) => `
              <div style="display:flex; justify-content:space-between; gap:8px; font-size:0.82rem; padding:4px 0; border-bottom:1px dashed var(--border-gold);">
                <span><strong>${esc(f.nome)}</strong> <span style="color:var(--text-muted);">— ${esc(f.motivo)}</span></span>
                <strong class="tabular" style="white-space:nowrap; color:var(--gold-dark);">${f.fornadasRecomendadas} forn.</strong>
              </div>
            `).join('')}
          </div>
          <ul class="ai-md-list">${(plan.dicasParaBaterMeta || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        </div>
      `;
    } catch (err) {
      out.innerHTML = `<div class="alert-banner terracotta">${esc(err.message)}</div>`;
    } finally {
      setBusy(false);
    }
  }

  function applyGoalPlanToState() {
    if (!aiState.lastGoalPlan) return;
    const state = G().getState();
    state.periodo = aiState.lastGoalPlan.periodo || state.periodo;
    const planMap = new Map(
      (aiState.lastGoalPlan.plan?.planoFornadas || []).map((p) => [p.recipeId, Math.max(0, Math.round(Number(p.fornadasRecomendadas || 0)))]),
    );
    for (const rec of state.recipes) {
      if (rec.tipo === 'produto' && planMap.has(rec.id)) {
        rec.fornadasPlanejadas = planMap.get(rec.id);
      }
    }
    G().saveState();
    G().showToast('🎯 Plano de fornadas de alto ROI aplicado! Veja sua nova lista de compras e Payback.');
    G().switchTab('investimento');
  }

  async function generateMarketingCopy() {
    const occasion = (document.getElementById('ai-mkt-occasion')?.value || '').trim();
    const out = document.getElementById('ai-mkt-output');
    setBusy(true, 'Escrevendo textos de divulgação para os doces de maior ROI...');
    try {
      const res = await apiFetch('/api/ai/tools', {
        method: 'POST',
        body: JSON.stringify({ action: 'marketing_copy', occasion, state: G().getState() }),
      });
      const c = res.copy;
      out.innerHTML = `
        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">
          <strong>🎯 Estratégia da IA:</strong> ${esc(c.focoEstrategico)}
        </div>
        <div class="grid-3">
          <div class="channel-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="channel-label" style="margin:0;">📱 WhatsApp / Lista</span>
              <button class="btn btn-secondary btn-sm js-copy-text" type="button">Copiar</button>
            </div>
            <pre class="ai-copy-pre">${esc(c.whatsappStatus)}</pre>
          </div>
          <div class="channel-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="channel-label" style="margin:0;">📸 Legenda Instagram</span>
              <button class="btn btn-secondary btn-sm js-copy-text" type="button">Copiar</button>
            </div>
            <pre class="ai-copy-pre">${esc(c.instagramLegenda)}</pre>
          </div>
          <div class="channel-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="channel-label" style="margin:0;">💬 Mensagem Direta</span>
              <button class="btn btn-secondary btn-sm js-copy-text" type="button">Copiar</button>
            </div>
            <pre class="ai-copy-pre">${esc(c.abordagemClientes)}</pre>
          </div>
        </div>
      `;
    } catch (err) {
      out.innerHTML = `<div class="alert-banner terracotta">${esc(err.message)}</div>`;
    } finally {
      setBusy(false);
    }
  }

  // ======================== EVENTOS ========================
  function bindAiEvents() {
    // Sub-tabs dentro da Central IA
    document.querySelectorAll('.ai-subtab').forEach((btn) => {
      btn.addEventListener('click', () => switchAiSub(btn.dataset.aiSub));
    });

    // Atalhos globais de Sync / Nota Fiscal / Importação de Receitas em outras abas
    document.getElementById('btn-topbar-ai-sync')?.addEventListener('click', () => runPriceSync({ mode: 'apply' }));
    document.getElementById('btn-insumos-ai-sync')?.addEventListener('click', () => runPriceSync({ mode: 'apply' }));
    document.getElementById('btn-invest-ai-sync')?.addEventListener('click', () => runPriceSync({ mode: 'apply' }));
    document.getElementById('btn-insumos-scan-receipt')?.addEventListener('click', () => {
      G().switchTab('ia');
      switchAiSub('receipt');
    });
    document.getElementById('btn-open-ai-import-recipe')?.addEventListener('click', openRecipeImporter);

    // Botões principais da Central IA
    document.getElementById('btn-ai-sync-now')?.addEventListener('click', () => runPriceSync({ mode: 'apply' }));
    document.getElementById('btn-ai-preview-sync')?.addEventListener('click', () => runPriceSync({ mode: 'preview' }));
    document.getElementById('btn-ai-rollback')?.addEventListener('click', rollbackLastSync);
    document.getElementById('btn-ai-apply-all-preview')?.addEventListener('click', applyAllPreviewToStock);

    // Configurações de automação
    ['ai-cfg-auto-apply', 'ai-cfg-protect-margins', 'ai-cfg-prefer-fort', 'ai-cfg-fort-tol', 'ai-cfg-check-equip', 'ai-cfg-max-delta'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => saveAiSettings());
    });

    // Seleção de mercados locais pelos 3 polos (Tapera, Centro, Estreito)
    document.getElementById('ai-stores-hubs-card')?.addEventListener('change', (e) => {
      const cb = e.target.closest('.js-ai-store-toggle');
      if (!cb) return;
      const checkedCount = document.querySelectorAll('#ai-stores-hubs-card .js-ai-store-toggle:checked').length;
      if (checkedCount === 0) {
        cb.checked = true;
        G().showToast('Mantenha pelo menos 1 mercado ativo para a pesquisa.');
        return;
      }
      saveAiSettings();
    });

    // Chat CFO IA
    document.getElementById('ai-chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendChatMessage(document.getElementById('ai-chat-input')?.value);
    });
    document.getElementById('ai-chat-chips')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-chip');
      if (chip) sendChatMessage(chip.dataset.prompt);
    });
    document.getElementById('btn-ai-chat-clear')?.addEventListener('click', () => {
      aiState.chatHistory = [];
      const box = document.getElementById('ai-chat-messages');
      if (box) {
        box.innerHTML = `
          <div class="ai-msg ai-msg-bot">
            <div class="ai-msg-avatar">✨</div>
            <div class="ai-msg-bubble">Conversa limpa! Pergunte qualquer coisa sobre custos, margens, preços iFood ou ROIs da Ana's Bakery.</div>
          </div>
        `;
      }
    });

    // Nota Fiscal (Vision)
    const fileInput = document.getElementById('ai-receipt-file');
    const dropzone = document.getElementById('ai-receipt-dropzone');
    document.getElementById('btn-ai-pick-receipt')?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('click', (e) => {
      if (e.target.id !== 'btn-ai-pick-receipt') fileInput?.click();
    });
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleReceiptFile(file);
    });
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleReceiptFile(file);
      e.target.value = '';
    });

    // Laboratório Criativo IA & Importador de Receitas
    document.getElementById('btn-ai-import-parse')?.addEventListener('click', parseImportRecipes);
    document.getElementById('btn-ai-create-recipe')?.addEventListener('click', generateAiRecipe);
    document.getElementById('btn-ai-optimize-goal')?.addEventListener('click', optimizeGoalPlan);
    document.getElementById('btn-ai-generate-mkt')?.addEventListener('click', generateMarketingCopy);

    // Edição inline ao vivo no Preview do Importador de Receitas
    const importOut = document.getElementById('ai-import-output');
    importOut?.addEventListener('input', (e) => {
      const draft = aiState.lastImportDraft;
      if (!draft) return;

      if (e.target.classList.contains('js-import-ing-price')) {
        const idx = Number(e.target.dataset.ingIdx);
        const novo = draft.novosInsumos?.[idx];
        if (!novo || novo._matchedExistingId) return;
        novo.preco = Math.max(0, round2(G().parseLocaleNumber(e.target.value)));
        recomputeImportDraftCosts(draft);
        updateImportDraftDomInPlace();
      } else if (e.target.classList.contains('js-import-prod-price')) {
        const idx = Number(e.target.dataset.prodIdx);
        const prod = draft.produtos?.[idx];
        if (!prod) return;
        prod.precoVendaDireta = Math.max(0, round2(G().parseLocaleNumber(e.target.value)));
        const custoUnitario = Number(prod.pricingPreview?.custoUnitario || 0);
        const custoTotalLote = Number(prod.pricingPreview?.custoTotalLote || 0);
        const ch = computeChannelPricingLocal(custoUnitario, prod.precoVendaDireta, G().getState().config);
        prod.pricingPreview = { ...ch, custoTotalLote };
        updateImportDraftDomInPlace();
      }
    });

    importOut?.addEventListener('change', (e) => {
      const draft = aiState.lastImportDraft;
      if (!draft) return;

      if (e.target.classList.contains('js-import-ing-toggle')) {
        const idx = Number(e.target.dataset.ingIdx);
        const novo = draft.novosInsumos?.[idx];
        if (!novo || novo._matchedExistingId) return;
        novo._included = Boolean(e.target.checked);
        const row = importOut.querySelector(`[data-ing-row="${idx}"]`);
        row?.classList.toggle('is-excluded', !novo._included);
        const priceInput = importOut.querySelector(`.js-import-ing-price[data-ing-idx="${idx}"]`);
        if (priceInput) priceInput.disabled = !novo._included;
        recomputeImportDraftCosts(draft);
        updateImportDraftDomInPlace();
      } else if (e.target.classList.contains('js-import-ing-price')) {
        const idx = Number(e.target.dataset.ingIdx);
        const novo = draft.novosInsumos?.[idx];
        if (!novo || novo._matchedExistingId) return;
        e.target.value = num(novo.preco, 2);
      } else if (e.target.classList.contains('js-import-prod-price')) {
        const idx = Number(e.target.dataset.prodIdx);
        const prod = draft.produtos?.[idx];
        if (!prod) return;
        e.target.value = num(prod.precoVendaDireta, 2);
      }
    });

    // Delegação global para botões dinâmicos gerados pela IA
    document.addEventListener('click', (e) => {
      if (e.target.closest('.js-ai-run-sync')) {
        runPriceSync({ mode: 'apply' });
      } else if (e.target.closest('.js-ai-open-tab')) {
        G().switchTab('ia');
      } else if (e.target.closest('.js-ai-refresh-briefing')) {
        refreshBriefingOnly();
      } else if (e.target.closest('.js-ai-apply-margin-fixes')) {
        applyMarginFixes();
      } else if (e.target.id === 'btn-ai-apply-receipt') {
        applyCheckedReceiptItems();
      } else if (e.target.id === 'btn-ai-save-recipe') {
        saveGeneratedRecipeToState();
      } else if (e.target.id === 'btn-ai-apply-goal-plan') {
        applyGoalPlanToState();
      } else if (e.target.id === 'btn-ai-import-commit') {
        commitImportedRecipes();
      } else if (e.target.id === 'btn-ai-import-clear') {
        clearImportDraft();
      } else if (e.target.classList.contains('js-ai-apply-single')) {
        const ingId = e.target.dataset.ingId;
        const newPrice = Number(e.target.dataset.newPrice);
        const state = G().getState();
        const ing = state.ingredients.find((i) => i.id === ingId);
        const sync = aiState.previewSync || aiState.lastSync;
        const row = sync?.ingredientUpdates?.find((u) => u.ingredientId === ingId);
        if (ing && newPrice > 0) {
          ing.preco = newPrice;
          if (row) {
            row.applied = true;
            ing.aiMeta = {
              lastCheckedAt: sync.syncedAt,
              lastStore: row.store,
              matchedProduct: row.matchedProduct,
              productUrl: row.productUrl,
              previousPrice: row.oldPrice,
              deltaPct: row.deltaPct,
              confidence: row.confidence,
              applied: true,
            };
          }
          G().saveState();
          renderAITab();
          G().showToast(`✓ ${ing.nome} atualizado para ${brl(newPrice)}!`);
        }
      } else if (e.target.classList.contains('js-ai-apply-equip')) {
        const eqId = e.target.dataset.eqId;
        const price = Number(e.target.dataset.eqPrice);
        const state = G().getState();
        const eq = state.equipments.find((x) => x.id === eqId);
        if (eq && price > 0) {
          eq.valor = price;
          G().saveState();
          G().showToast(`🔧 ${eq.nome} atualizado para ${brl(price)}!`);
        }
      } else if (e.target.classList.contains('js-copy-text')) {
        const pre = e.target.closest('.channel-box')?.querySelector('.ai-copy-pre');
        if (pre) {
          navigator.clipboard?.writeText(pre.textContent || '').then(() => {
            G().showToast('Texto copiado para a área de transferência!');
          });
        }
      }
    });
  }

  // Expõe API para gestao.js
  window.AnasAI = {
    renderAITab,
    renderDashboardBriefing,
    renderPricingAiBanner,
    syncSingleIngredient,
    runPriceSync,
    loadAiStatus,
    openRecipeImporter,
    commitImportedRecipes,
  };

  bindAiEvents();
  renderDashboardBriefing();
  loadAiStatus({ silent: true });
})();
