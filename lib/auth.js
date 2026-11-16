import crypto from 'node:crypto';

export const COOKIE_NAME = 'anas_gestao_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest();
}

export function safeEqualText(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

export function getSigningKey(password) {
  const explicit = process.env.GESTAO_AUTH_SECRET;
  if (explicit) return sha256(explicit);
  return sha256(`anas-bakery-gestao::${password}`);
}

export function signToken(expMs, key) {
  const payload = String(expMs);
  const sig = crypto.createHmac('sha256', key).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token, key) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sigHex] = parts;
  const expMs = Number(payload);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;

  const expectedHex = crypto.createHmac('sha256', key).update(payload).digest('hex');
  const sigBuf = Buffer.from(sigHex, 'utf8');
  const expBuf = Buffer.from(expectedHex, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export function parseCookies(headerValue) {
  const cookies = {};
  if (!headerValue) return cookies;
  for (const part of headerValue.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

export function verifyRequestSession(request) {
  const password = process.env.GESTAO_PASSWORD;
  if (!password) return { configured: false, authenticated: false };
  const cookies = parseCookies(request.headers.get('cookie'));
  const signingKey = getSigningKey(password);
  return {
    configured: true,
    authenticated: verifyToken(cookies[COOKIE_NAME], signingKey),
  };
}
