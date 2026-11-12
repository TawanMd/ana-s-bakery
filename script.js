/* ==========================================================================
   ANA'S BAKERY — INTERATIVIDADE, INTRO (0-1.5s), PARALLAX E REDIRECT IFOOD
   Ana Mayra Viganigo Martins · CNPJ 61.538.015/0001-00
   ========================================================================== */

/**
 * CONFIGURAÇÃO DE REDIRECIONAMENTO DO IFOOD
 * Quando inaugurar a loja no iFood:
 * 1. Altere `isLive` para `true`
 * 2. Cole o link oficial da loja em `storeUrl`
 */
const IFOOD_CONFIG = {
  isLive: false,
  storeUrl: 'https://www.ifood.com.br/delivery/florianopolis-sc/anas-bakery'
};

document.addEventListener('DOMContentLoaded', () => {
  const introOverlay = document.getElementById('intro-overlay');
  const introStage = document.getElementById('intro-stage');
  const navLogoTarget = document.getElementById('nav-logo-target');
  const btnReplayIntro = document.getElementById('btn-replay-intro');
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  const scrollCrumbsLayer = document.getElementById('scroll-crumbs-layer');
  const toastEl = document.getElementById('toast-notification');
  const cartCountEl = document.getElementById('cart-count');
  const btnIfoodRedirect = document.getElementById('btn-ifood-redirect');
  const btnIfoodText = document.getElementById('btn-ifood-text');
  const ifoodStatusBadge = document.getElementById('ifood-status-badge');

  let cartCount = 2;
  let toastTimer = null;

  /* ------------------------------------------------------------------------
     0. INICIALIZAÇÃO DO REDIRECT DO IFOOD
     ------------------------------------------------------------------------ */
  function handleIfoodRedirect(e) {
    if (IFOOD_CONFIG.isLive && IFOOD_CONFIG.storeUrl) {
      // Redireciona diretamente para a loja oficial no iFood
      window.open(IFOOD_CONFIG.storeUrl, '_blank', 'noopener,noreferrer');
    } else {
      if (e) e.preventDefault();
      showToast('🛵 Nossa loja no iFood abrirá em breve! O redirecionamento automático já está pronto.');
    }
  }

  if (btnIfoodRedirect) {
    if (IFOOD_CONFIG.isLive && IFOOD_CONFIG.storeUrl) {
      btnIfoodRedirect.setAttribute('href', IFOOD_CONFIG.storeUrl);
      btnIfoodRedirect.setAttribute('target', '_blank');
      btnIfoodRedirect.setAttribute('rel', 'noopener noreferrer');
      btnIfoodRedirect.setAttribute('data-ifood-ready', 'true');
      if (btnIfoodText) btnIfoodText.textContent = 'Pedir Agora pelo iFood';
      if (ifoodStatusBadge) {
        ifoodStatusBadge.innerHTML = '<span class="ifood-dot"></span> Loja Aberta no iFood • Faça sua Encomenda';
      }
    } else {
      btnIfoodRedirect.addEventListener('click', handleIfoodRedirect);
    }
  }

  /* ------------------------------------------------------------------------
     1. ANIMAÇÃO DE INTRODUÇÃO / CARREGAMENTO (0 - 1.5s)
        - 0.00s - 0.65s: Desenho em linha (sketch draw-line) da logo no centro
        - 0.65s - 1.05s: Preenchimento colorido com chocolate e dourado
        - 1.05s - 1.50s: Transição de escala e deslocamento até o canto superior esquerdo
        - 1.45s+: Entrada com bounce (0.5s cubic-bezier(0.25, 1, 0.50, 1)) da Headline e CTA
     ------------------------------------------------------------------------ */
  function runIntroAnimation() {
    document.body.classList.remove('intro-complete');
    introOverlay.classList.remove('is-hidden', 'phase-fill', 'phase-move');
    introStage.style.transform = 'translate3d(0, 0, 0) scale(1)';

    const sketchPaths = introOverlay.querySelectorAll('.sketch-path');
    sketchPaths.forEach((p) => {
      p.style.animation = 'none';
      void p.offsetWidth;
      p.style.animation = '';
    });

    setTimeout(() => {
      introOverlay.classList.add('phase-fill');
    }, 620);

    setTimeout(() => {
      introOverlay.classList.add('phase-move');
      if (navLogoTarget && introStage) {
        const stageRect = introStage.getBoundingClientRect();
        const targetRect = navLogoTarget.getBoundingClientRect();

        const stageCenterX = stageRect.left + stageRect.width / 2;
        const stageCenterY = stageRect.top + stageRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        const dx = targetCenterX - stageCenterX;
        const dy = targetCenterY - stageCenterY;
        const scale = targetRect.width / 210;

        introStage.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
      }
    }, 1020);

    setTimeout(() => {
      introOverlay.classList.add('is-hidden');
      document.body.classList.add('intro-complete');
    }, 1480);
  }

  runIntroAnimation();

  if (btnReplayIntro) {
    btnReplayIntro.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(runIntroAnimation, 150);
    });
  }

  /* ------------------------------------------------------------------------
     2. INTERAÇÃO COM O MOUSE (PARALLAX ESCALA: 0.05)
     ------------------------------------------------------------------------ */
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    targetMouseX = e.clientX - centerX;
    targetMouseY = e.clientY - centerY;
  });

  function updateParallax() {
    currentMouseX += (targetMouseX - currentMouseX) * 0.1;
    currentMouseY += (targetMouseY - currentMouseY) * 0.1;

    parallaxLayers.forEach((layer) => {
      const depth = parseFloat(layer.getAttribute('data-depth') || '0.05');
      const moveX = -currentMouseX * depth;
      const moveY = -currentMouseY * depth;
      layer.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
    });

    requestAnimationFrame(updateParallax);
  }
  requestAnimationFrame(updateParallax);

  /* ------------------------------------------------------------------------
     3. PROGRESSÃO DE SCROLL — MIGALHAS E RESPINGOS FLUTUANDO PARA CIMA
     ------------------------------------------------------------------------ */
  const crumbSpecs = [
    { left: '6%', top: '78%', size: 12, color: '#3C1F15', speed: 0.28, shape: 'circle' },
    { left: '14%', top: '88%', size: 9, color: '#E5A93B', speed: 0.42, shape: 'circle' },
    { left: '24%', top: '72%', size: 14, color: '#C58C3E', speed: 0.35, shape: 'drop' },
    { left: '46%', top: '84%', size: 10, color: '#3C1F15', speed: 0.50, shape: 'circle' },
    { left: '62%', top: '90%', size: 13, color: '#E5A93B', speed: 0.38, shape: 'drop' },
    { left: '78%', top: '82%', size: 11, color: '#3C1F15', speed: 0.46, shape: 'circle' },
    { left: '89%', top: '76%', size: 15, color: '#C58C3E', speed: 0.31, shape: 'drop' },
    { left: '94%', top: '92%', size: 8, color: '#3C1F15', speed: 0.54, shape: 'circle' }
  ];

  const crumbNodes = [];
  if (scrollCrumbsLayer) {
    crumbSpecs.forEach((spec, idx) => {
      const el = document.createElement('div');
      el.className = 'scroll-crumb';
      el.style.left = spec.left;
      el.style.top = spec.top;
      el.style.width = `${spec.size}px`;
      el.style.height = `${spec.size}px`;
      el.style.backgroundColor = spec.color;
      el.style.borderRadius = spec.shape === 'drop' ? '60% 40% 70% 30%' : '50%';
      el.style.transform = `rotate(${idx * 35}deg)`;
      scrollCrumbsLayer.appendChild(el);
      crumbNodes.push({ el, speed: spec.speed, rot: idx * 35 });
    });
  }

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    crumbNodes.forEach((item, index) => {
      const yOffset = -scrollY * item.speed;
      const xWave = Math.sin(scrollY * 0.01 + index) * 12;
      const rotation = item.rot + scrollY * 0.08;
      item.el.style.transform = `translate3d(${xWave.toFixed(1)}px, ${yOffset.toFixed(1)}px, 0) rotate(${rotation.toFixed(1)}deg)`;
    });
  }, { passive: true });

  /* ------------------------------------------------------------------------
     4. FILTROS DO CARDÁPIO, BUSCA E ENCOMENDAS (100% PT-BR)
     ------------------------------------------------------------------------ */
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3400);
  }

  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.getAttribute('data-filter');
      productCards.forEach((card) => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'todos' || cardCat === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  const searchForm = document.getElementById('hero-search-form');
  const searchInput = document.getElementById('hero-search-input');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim().toLowerCase();
      const cardapioSection = document.getElementById('cardapio');
      if (cardapioSection) {
        cardapioSection.scrollIntoView({ behavior: 'smooth' });
      }

      if (!query) {
        productCards.forEach((c) => (c.style.display = 'flex'));
        showToast('Mostrando todos os doces sob encomenda do cardápio!');
        return;
      }

      let found = 0;
      productCards.forEach((card) => {
        const text = (card.textContent + ' ' + (card.getAttribute('data-name') || '')).toLowerCase();
        if (text.includes(query)) {
          card.style.display = 'flex';
          found++;
        } else {
          card.style.display = 'none';
        }
      });

      if (found > 0) {
        showToast(`Encontramos ${found} doce(s) para "${searchInput.value}"!`);
      } else {
        productCards.forEach((c) => (c.style.display = 'flex'));
        showToast(`Nenhum doce exato para "${searchInput.value}" — exibindo todas as opções!`);
      }
    });
  }

  document.querySelectorAll('.btn-add-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemName = btn.getAttribute('data-item') || 'Doce Artesanal';
      cartCount++;
      if (cartCountEl) cartCountEl.textContent = String(cartCount);
      if (IFOOD_CONFIG.isLive && IFOOD_CONFIG.storeUrl) {
        window.open(IFOOD_CONFIG.storeUrl, '_blank', 'noopener,noreferrer');
      } else {
        showToast(`🍪 "${itemName}" adicionado à sua lista de encomenda!`);
      }
    });
  });

  const btnCartToggle = document.getElementById('btn-cart-toggle');
  if (btnCartToggle) {
    btnCartToggle.addEventListener('click', (e) => {
      if (IFOOD_CONFIG.isLive && IFOOD_CONFIG.storeUrl) {
        handleIfoodRedirect(e);
      } else {
        showToast(`🛍️ Você selecionou ${cartCount} itens para encomenda! Em breve pedidos direto pelo iFood.`);
      }
    });
  }

  const heroInteractiveItems = document.querySelectorAll(
    '.floating-cookie-left, .floating-cookie-bottom, .floating-truffle-cone, .floating-choc-cube, #hero-logo-anchor'
  );
  heroInteractiveItems.forEach((el) => {
    el.addEventListener('click', () => {
      const label = el.getAttribute('title') || 'Ana\'s Bakery Florianópolis';
      showToast(`✨ ${label}`);
    });
  });
});
