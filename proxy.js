import { next } from '@vercel/functions';
import {
  COOKIE_NAME,
  SESSION_TTL_MS,
  safeEqualText,
  getSigningKey,
  signToken,
  verifyRequestSession,
} from './lib/auth.js';

function renderLoginHtml({ errorMsg = '', notConfigured = false } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Acesso Restrito — Ana's Bakery</title>
  <link rel="icon" type="image/png" href="/assets/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('anas_bakery_theme');
        var dark = saved ? saved === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      color-scheme: light;
      --bg: #FDF7E7;
      --card: #FFFDF9;
      --border: #E6D5B8;
      --border-input: #D4BA8E;
      --text: #3C1F15;
      --muted: #765748;
      --accent: #C58C3E;
      --accent-hover: #A67129;
      --accent-text: #FFFDF9;
      --input-bg: #FFFFFF;
      --caret: #3C1F15;
      --sel-bg: rgba(197, 140, 62, 0.28);
      --sel-text: #3C1F15;
      --alert-bg: #FCECE9;
      --alert-border: #ECC3BC;
      --alert-text: #B94A39;
      --code-bg: #FAF2DF;
      --shadow: rgba(60, 31, 21, 0.08);
    }
    html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #18100C;
      --card: #241813;
      --border: #4A3325;
      --border-input: #6A4B37;
      --text: #FAF2DF;
      --muted: #D1BCA5;
      --accent: #E5A93B;
      --accent-hover: #F0BE59;
      --accent-text: #1E120C;
      --input-bg: #1D130E;
      --caret: #E5A93B;
      --sel-bg: rgba(229, 169, 59, 0.36);
      --sel-text: #FAF2DF;
      --alert-bg: rgba(240, 128, 112, 0.14);
      --alert-border: rgba(240, 128, 112, 0.35);
      --alert-text: #F08070;
      --code-bg: #2F2019;
      --shadow: rgba(0, 0, 0, 0.42);
    }
    * { box-sizing: border-box; }
    ::selection { background: var(--sel-bg); color: var(--sel-text); }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .card {
      position: relative;
      width: 100%;
      max-width: 400px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 28px;
      box-shadow: 0 12px 32px var(--shadow);
      text-align: center;
    }
    .theme-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: auto;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--code-bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .theme-btn:hover {
      background: var(--border);
    }
    .logo {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      border: 2px solid var(--accent);
      object-fit: cover;
      margin-bottom: 14px;
    }
    h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.5rem;
      margin: 0 0 6px;
      color: var(--text);
    }
    p {
      margin: 0 0 22px;
      font-size: 0.88rem;
      color: var(--muted);
      line-height: 1.45;
    }
    .field {
      text-align: left;
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }
    input[type="password"] {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid var(--border-input);
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      background: var(--input-bg);
      color: var(--text);
      caret-color: var(--caret);
    }
    input[type="password"]::placeholder {
      color: var(--muted);
      opacity: 0.75;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(197, 140, 62, 0.22);
    }
    button[type="submit"] {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: var(--accent);
      color: var(--accent-text);
      font-family: inherit;
      font-size: 0.94rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.16s ease;
    }
    button[type="submit"]:hover { background: var(--accent-hover); }
    .alert {
      background: var(--alert-bg);
      border: 1px solid var(--alert-border);
      color: var(--alert-text);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.84rem;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: left;
    }
    .back {
      display: inline-block;
      margin-top: 18px;
      font-size: 0.82rem;
      color: var(--muted);
      text-decoration: none;
      font-weight: 600;
    }
    .back:hover { text-decoration: underline; }
    code {
      background: var(--code-bg);
      color: var(--text);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.82rem;
    }
  </style>
</head>
<body>
  <main class="card">
    <button id="login-theme-toggle" class="theme-btn" type="button" aria-label="Alternar tema claro/escuro">🌙 Escuro</button>
    <img src="/assets/logo.png" alt="Ana's Bakery" class="logo" />
    <h1>Área Interna — Ana's Bakery</h1>
    <p>O planejador financeiro e a calculadora de precificação são restritos à equipe.</p>
    ${notConfigured
      ? `<div class="alert">Acesso bloqueado: configure a variável de ambiente <code>GESTAO_PASSWORD</code> no projeto Vercel para liberar o login.</div>`
      : `
        ${errorMsg ? `<div class="alert">${errorMsg}</div>` : ''}
        <form method="POST" action="/gestao">
          <div class="field">
            <label for="password">Senha da Equipe</label>
            <input id="password" name="password" type="password" required autofocus autocomplete="current-password" placeholder="Digite sua senha de acesso" />
          </div>
          <button type="submit">Entrar no Painel</button>
        </form>
      `}
    <a href="/" class="back">← Voltar para a loja</a>
  </main>
  <script>
    (function () {
      var btn = document.getElementById('login-theme-toggle');
      if (!btn) return;
      function syncBtn() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.textContent = isDark ? '☀️ Claro' : '🌙 Escuro';
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      }
      syncBtn();
      btn.addEventListener('click', function () {
        var nextDark = document.documentElement.getAttribute('data-theme') !== 'dark';
        if (nextDark) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('anas_bakery_theme', nextDark ? 'dark' : 'light'); } catch (e) {}
        syncBtn();
      });
    })();
  </script>
</body>
</html>`;
}

export default async function proxy(request) {
  const url = new URL(request.url);
  const isPageRequest = url.pathname === '/gestao' || url.pathname === '/gestao.html';
  const password = process.env.GESTAO_PASSWORD;
  const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const secureFlag = isHttps ? '; Secure' : '';

  const baseHeaders = {
    'x-robots-tag': 'noindex, nofollow',
    'cache-control': 'private, no-store, max-age=0',
  };

  if (!password) {
    if (!isPageRequest) {
      return new Response('Acesso restrito não configurado.', { status: 403, headers: baseHeaders });
    }
    return new Response(renderLoginHtml({ notConfigured: true }), {
      status: 403,
      headers: { ...baseHeaders, 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (isPageRequest && url.searchParams.get('logout') === '1') {
    return new Response(null, {
      status: 303,
      headers: {
        ...baseHeaders,
        location: '/gestao',
        'set-cookie': `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`,
      },
    });
  }

  const signingKey = getSigningKey(password);

  if (isPageRequest && request.method === 'POST') {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const submitted = params.get('password') || '';

    if (submitted && safeEqualText(submitted, password)) {
      const token = signToken(Date.now() + SESSION_TTL_MS, signingKey);
      return new Response(null, {
        status: 303,
        headers: {
          ...baseHeaders,
          location: '/gestao',
          'set-cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureFlag}`,
        },
      });
    }

    return new Response(renderLoginHtml({ errorMsg: 'Senha incorreta. Tente novamente.' }), {
      status: 401,
      headers: { ...baseHeaders, 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const session = verifyRequestSession(request);
  if (!session.authenticated) {
    if (!isPageRequest) {
      return new Response('Acesso não autorizado.', { status: 401, headers: baseHeaders });
    }
    return new Response(renderLoginHtml(), {
      status: 401,
      headers: { ...baseHeaders, 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return next({ headers: baseHeaders });
}
