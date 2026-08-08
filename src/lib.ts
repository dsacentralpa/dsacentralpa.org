// Central PA DSA — shared helpers for the Worker.

export interface Env {
  DB: D1Database;
  // vars (wrangler.toml)
  SITE_URL: string;
  SITE_NAME: string;
  TWILIO_PHONE_NUMBER: string;
  FROM_EMAIL: string;
  CHAPTER_NAME: string;
  CONTACT_EMAIL: string;
  CONSENT_VERSION: string;
  MAILING_ADDRESS: string;
  /** 'true' reveals unpublished issue and mutual aid entries. Off in production. */
  DRAFT_MODE?: string;
  // secrets (npx wrangler secret put ...)
  RESEND_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_MESSAGING_SERVICE_SID?: string;
  ADMIN_TOKEN: string;
}

/* ---------------------------------------------------------------- parsing */

/** US/CA numbers only. Returns E.164 or null. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const e = input.trim().toLowerCase();
  if (e.length > 254) return null;
  // Deliberately permissive; Resend will reject anything truly malformed.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  return e;
}

export function cleanName(input: unknown, max = 80): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/\s+/g, ' ').slice(0, max);
  return s.length ? s : null;
}

export function splitName(full: string | null): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/* ----------------------------------------------------------------- crypto */

export function newId(): string {
  return crypto.randomUUID();
}

export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Constant-time-ish string compare. Avoids leaking token length via early exit. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------- data */

export async function logConsent(
  env: Env,
  row: {
    subscriberId: string | null;
    channel: 'email' | 'sms';
    action:
      | 'requested'
      | 'confirmed'
      | 'opt_out'
      | 'resubscribe'
      | 'help'
      | 'bounced'
      | 'send_failed';
    detail?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO consent_events (id, subscriber_id, channel, action, detail, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      row.subscriberId,
      row.channel,
      row.action,
      row.detail ?? null,
      row.ip ?? null,
      row.userAgent ?? null,
    )
    .run();
}

/**
 * Fixed-window throttle. `limit` requests per `windowMinutes` per bucket key.
 * Returns true when the caller is allowed to proceed.
 */
export async function checkRateLimit(
  env: Env,
  bucket: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT count, window_start FROM rate_limits WHERE bucket = ?`,
  )
    .bind(bucket)
    .first<{ count: number; window_start: string }>();

  const now = Date.now();

  if (!row) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, datetime('now'))`,
    )
      .bind(bucket)
      .run();
    return true;
  }

  const started = Date.parse(row.window_start.replace(' ', 'T') + 'Z');
  const expired = Number.isNaN(started) || now - started > windowMinutes * 60_000;

  if (expired) {
    await env.DB.prepare(
      `UPDATE rate_limits SET count = 1, window_start = datetime('now') WHERE bucket = ?`,
    )
      .bind(bucket)
      .run();
    return true;
  }

  if (row.count >= limit) return false;

  await env.DB.prepare(`UPDATE rate_limits SET count = count + 1 WHERE bucket = ?`)
    .bind(bucket)
    .run();
  return true;
}

/**
 * Prunes expired unused tokens and closed rate-limit windows. Invoked via
 * ctx.waitUntil so it adds no request latency. Used tokens are retained;
 * consent_events is never modified.
 */
export async function cleanupExpired(env: Env): Promise<void> {
  try {
    await env.DB.batch([
      env.DB.prepare(
        `DELETE FROM tokens WHERE used_at IS NULL AND expires_at < datetime('now', '-30 days')`,
      ),
      env.DB.prepare(`DELETE FROM rate_limits WHERE window_start < datetime('now', '-1 day')`),
    ]);
  } catch (err) {
    console.error('cleanup failed', err);
  }
}

/* ------------------------------------------------------------- outbound IO */

/**
 * Long-lived unsubscribe token, reused across sends. Unlike confirmation tokens these do
 * not expire: opt-out links must remain functional in archived mail.
 */
export async function unsubscribeUrlFor(env: Env, subscriberId: string): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT token FROM tokens WHERE subscriber_id = ? AND purpose = 'unsubscribe_email' LIMIT 1`,
  )
    .bind(subscriberId)
    .first<{ token: string }>();

  if (existing) return `${env.SITE_URL}/unsubscribe?token=${existing.token}`;

  const token = newToken();
  await env.DB.prepare(
    `INSERT INTO tokens (token, subscriber_id, purpose, expires_at) VALUES (?, ?, 'unsubscribe_email', ?)`,
  )
    .bind(token, subscriberId, isoPlusDays(3650))
    .run();
  return `${env.SITE_URL}/unsubscribe?token=${token}`;
}

export async function sendEmail(
  env: Env,
  msg: {
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Enables one-click unsubscribe headers. Omit only for genuinely transactional mail. */
    unsubscribeUrl?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    // One-click unsubscribe headers, required by major providers for bulk senders.
    // Enables mail-client unsubscribe without opening the message.
    const headers: Record<string, string> = msg.unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${msg.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : {};

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    });
    if (!res.ok) return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendSms(
  env: Env,
  to: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new URLSearchParams({ To: to, Body: body });
    // Prefer the Messaging Service once the A2P campaign is attached to it.
    if (env.TWILIO_MESSAGING_SERVICE_SID) {
      form.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
    } else {
      form.set('From', env.TWILIO_PHONE_NUMBER);
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    );
    if (!res.ok) return { ok: false, error: `twilio ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Verifies Twilio's request signature: HMAC-SHA1 over the full URL concatenated with
 * sorted parameter key/value pairs, base64-encoded, keyed by the account auth token.
 * Unsigned or mismatched requests must be rejected.
 */
export async function validateTwilioSignature(
  env: Env,
  request: Request,
  fullUrl: string,
  params: Record<string, string>,
): Promise<boolean> {
  const signature = request.headers.get('X-Twilio-Signature');
  if (!signature) return false;

  let data = fullUrl;
  for (const key of Object.keys(params).sort()) data += key + params[key];

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return safeEqual(expected, signature);
}

export function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Everything on this site is inline by design (no external CSS/JS/fonts), so the
      // policy is: no external scripts can EVER run, even if an attacker gets markup
      // into a page. default-src 'none' turns everything off; each directive below
      // re-enables only what the site actually uses.
      'Content-Security-Policy':
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
        "img-src 'self' data:; connect-src 'self'; form-action 'self'; " +
        "base-uri 'none'; frame-ancestors 'none'",
      // No includeSubDomains: mail.dsacentralpa.org and friends belong to Brevo/Resend
      // and we shouldn't make HTTPS promises for infrastructure we don't operate.
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
  });
}

export function twiml(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeHtml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
}
