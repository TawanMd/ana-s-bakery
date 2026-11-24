import { verifyRequestSession } from './auth.js';

export const NO_STORE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store, max-age=0',
  'x-robots-tag': 'noindex, nofollow',
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export function requireAuth(request) {
  const session = verifyRequestSession(request);
  if (!session.configured) {
    return jsonResponse({ error: 'Servidor não configurado (GESTAO_PASSWORD ausente).' }, 403);
  }
  if (!session.authenticated) {
    return jsonResponse({ error: 'Não autorizado.' }, 401);
  }
  return null;
}
