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
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: #FDF7E7;
      color: #3C1F15;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .card {
      width: 100%;
      max-width: 400px;
      background: #FFFDF9;
      border: 1px solid #E6D5B8;
      border-radius: 20px;
      padding: 32px 28px;
      box-shadow: 0 12px 32px rgba(60, 31, 21, 0.08);
      text-align: center;
    }
    .logo {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      border: 2px solid #C58C3E;
      object-fit: cover;
      margin-bottom: 14px;
    }
    h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.5rem;
      margin: 0 0 6px;
    }
    p {
      margin: 0 0 22px;
      font-size: 0.88rem;
      color: #765748;
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
      color: #765748;
      margin-bottom: 6px;
    }
    input[type="password"] {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid #D4BA8E;
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      background: #fff;
      color: #3C1F15;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #C58C3E;
      box-shadow: 0 0 0 3px rgba(197, 140, 62, 0.18);
    }
    button {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: #C58C3E;
      color: #FFFDF9;
      font-family: inherit;
      font-size: 0.94rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.16s ease;
    }
    button:hover { background: #A67129; }
    .alert {
      background: #FCECE9;
      border: 1px solid #ECC3BC;
      color: #B94A39;
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
      color: #765748;
      text-decoration: none;
      font-weight: 600;
    }
    .back:hover { text-decoration: underline; }
    code {
      background: #FAF2DF;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.82rem;
    }
  </style>
</head>
<body>
  <main class="card">
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
