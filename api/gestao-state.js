import { get, put, del } from '@vercel/blob';
import { verifyRequestSession } from '../lib/auth.js';

const STATE_PATH = 'gestao/state.json';

const NO_STORE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store, max-age=0',
  'x-robots-tag': 'noindex, nofollow',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function requireAuth(request) {
  const session = verifyRequestSession(request);
  if (!session.configured) {
    return jsonResponse({ error: 'Servidor não configurado (GESTAO_PASSWORD ausente).' }, 403);
  }
  if (!session.authenticated) {
    return jsonResponse({ error: 'Não autorizado.' }, 401);
  }
  return null;
}

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const result = await get(STATE_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return jsonResponse({ exists: false, data: null, updatedAt: null });
    }

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return jsonResponse({
      exists: true,
      data: parsed.data || null,
      updatedAt: parsed.updatedAt || null,
    });
  } catch (err) {
    console.error('Erro ao ler estado no Vercel Blob:', err);
    return jsonResponse({ error: 'Falha ao ler dados na nuvem.' }, 500);
  }
}

export async function PUT(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = body && body.data;
    if (!data || !Array.isArray(data.ingredients) || !Array.isArray(data.recipes)) {
      return jsonResponse({ error: 'Payload inválido.' }, 400);
    }

    const updatedAt = new Date().toISOString();
    await put(
      STATE_PATH,
      JSON.stringify({ data, updatedAt }),
      {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      },
    );

    return jsonResponse({ ok: true, updatedAt });
  } catch (err) {
    console.error('Erro ao salvar estado no Vercel Blob:', err);
    return jsonResponse({ error: 'Falha ao salvar dados na nuvem.' }, 500);
  }
}

export async function DELETE(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    await del(STATE_PATH);
  } catch (err) {
    // Ignora se ainda não existir
  }
  return jsonResponse({ ok: true });
}
