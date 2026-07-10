import { createHmac, timingSafeEqual } from 'crypto';

export const AUTH_COOKIE_NAME = 'ep_auth';
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const signPayload = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('hex');

export const createSessionToken = (secret: string) => {
  const expiresAt = Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const signature = signPayload(payload, secret);
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
};

export const verifySessionToken = (token: string, secret: string) => {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [payload, signature] = decoded.split('.');

    if (!payload || !signature) {
      return false;
    }

    const expectedSignature = signPayload(payload, secret);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
      return false;
    }

    const expiresAt = Number(payload);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
};

export const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const matched = cookies.find(cookie => cookie.startsWith(`${name}=`));

  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : null;
};

export const createSessionCookie = (token: string) =>
  `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`;

export const clearSessionCookie = () =>
  `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
