// Request router and API handlers.
//
// Route table: docs/CONFIGURATION.md
// Consent model: docs/CONSENT.md
//
// The schema is not created at runtime; apply schema.sql and migrations/ via wrangler.

import {
  type Env,
  checkRateLimit,
  cleanupExpired,
  html,
  isoPlusDays,
  json,
  logConsent,
  newId,
  newToken,
  normalizeEmail,
  normalizePhone,
  cleanName,
  splitName,
  safeEqual,
  escapeHtml,
  sendEmail,
  sendSms,
  twiml,
  unsubscribeUrlFor,
  validateTwilioSignature,
} from './lib';
import {
  confirmEmail,
  contactPage,
  groupsPage,
  homePage,
  notFoundPage,
  privacyPage,
  resourcesPage,
  resultPage,
  smsTermsPage,
  updatesPage,
  howItWorksPage,
  issuesPage,
  mutualAidPage,
} from './pages';
import { LOGO_PNG, LOGO_REVERSE_PNG, assetResponse } from './assets';

interface SubscriberRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  email_status: string;
  phone_status: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    // ~2% of requests trigger housekeeping, off the critical path.
    if (Math.random() < 0.02) ctx.waitUntil(cleanupExpired(env));

    try {
      if (method === 'GET' || method === 'HEAD') {
        switch (path) {
          case '/':
            return html(homePage(env));
          case '/groups':
          case '/chapters':
            return html(groupsPage(env));
          case '/updates':
          case '/news':
            return html(updatesPage(env));
          case '/resources':
            return html(resourcesPage(env));
          case '/issues':
          case '/campaigns':
            return html(issuesPage(env));
          case '/mutual-aid':
            return html(mutualAidPage(env));
          case '/how-it-works':
          case '/about':
            return html(howItWorksPage(env));
          case '/contact':
            return html(contactPage(env));
          case '/privacy':
            return html(privacyPage(env));
          case '/sms-terms':
          case '/sms':
          case '/terms':
            return html(smsTermsPage(env));
          case '/confirm':
            return handleConfirm(request, env, url);
          case '/unsubscribe':
            return handleUnsubscribe(request, env, url);
          case '/api/admin/stats':
            return handleStats(request, env);
          case '/api/admin/export':
            return handleExport(request, env);
          case '/api/admin/messages':
            return handleMessages(request, env);
          case '/api/admin/diagnostics':
            return handleDiagnostics(request, env);
          case '/assets/logo.png':
            return assetResponse(LOGO_PNG);
          case '/assets/logo-reverse.png':
            return assetResponse(LOGO_REVERSE_PNG);
          case '/health':
            return json({ ok: true, time: new Date().toISOString() });
        }
      }

      if (method === 'POST') {
        if (path === '/api/subscribe') return handleSubscribe(request, env);
        if (path === '/api/contact') return handleContact(request, env);
        if (path === '/api/admin/test-email') return handleTestEmail(request, env);
        if (path === '/api/sms') return handleInboundSms(request, env, url);
      }

      if (path.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return html(notFoundPage(env), 404);
    } catch (err) {
      console.error('unhandled', err);
      if (path.startsWith('/api/')) return json({ error: 'Server error' }, 500);
      return html(
        resultPage(env, {
          title: 'Error',
          glyph: '&#9888;',
          heading: 'Something went wrong',
          body: `Please try again, or email <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>.`,
        }),
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;

/* ------------------------------------------------------------- /api/subscribe */

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const ua = request.headers.get('User-Agent') ?? null;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot field, hidden from users. Returns success without storing anything.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true, message: 'Thanks! Check your email to confirm.' });
  }

  const wantsEmail = body.email_consent === true;
  const wantsSms = body.sms_consent === true;
  if (!wantsEmail && !wantsSms) {
    return json({ error: 'Please check at least one box so we know how to reach you.' }, 400);
  }

  const email = wantsEmail ? normalizeEmail(body.email) : null;
  const phone = wantsSms ? normalizePhone(body.phone) : null;

  if (wantsEmail && !email) {
    return json({ error: 'That email address doesn’t look right. Please check it.' }, 400);
  }
  if (wantsSms && !phone) {
    return json(
      { error: 'That mobile number doesn’t look right. Use a 10-digit US number.' },
      400,
    );
  }

  // Applied after validation so malformed submissions do not consume quota. The
  // limited resource is outbound mail and SMS, not requests.
  if (!(await checkRateLimit(env, `subscribe:${ip}`, 8, 60))) {
    return json({ error: 'Too many signups from this connection. Please try again later.' }, 429);
  }

  const fullName = cleanName(body.name);
  const { first, last } = splitName(fullName);
  const zip =
    typeof body.zip === 'string' && /^\d{5}$/.test(body.zip.trim()) ? body.zip.trim() : null;
  const county = cleanName(body.county, 40);

  // Match on either channel so repeat signups merge rather than duplicate.
  const existing = await env.DB.prepare(
    `SELECT * FROM subscribers
      WHERE (? IS NOT NULL AND email = ?) OR (? IS NOT NULL AND phone = ?)
      LIMIT 1`,
  )
    .bind(email, email, phone, phone)
    .first<SubscriberRow>();

  const id = existing?.id ?? newId();
  const notices: string[] = [];

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscribers SET
         first_name = COALESCE(?, first_name),
         last_name  = COALESCE(?, last_name),
         email      = COALESCE(?, email),
         phone      = COALESCE(?, phone),
         zip        = COALESCE(?, zip),
         county     = COALESCE(?, county),
         consent_ip = ?, consent_user_agent = ?, consent_version = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(first, last, email, phone, zip, county, ip, ua, env.CONSENT_VERSION, id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO subscribers
         (id, first_name, last_name, email, phone, zip, county,
          consent_ip, consent_user_agent, consent_source, consent_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'website', ?)`,
    )
      .bind(id, first, last, email, phone, zip, county, ip, ua, env.CONSENT_VERSION)
      .run();
  }

  /* ---- email channel ---- */
  if (email) {
    if (existing?.email_status === 'confirmed') {
      notices.push('You were already on our email list.');
    } else {
      const token = newToken();
      await env.DB.prepare(
        `INSERT INTO tokens (token, subscriber_id, purpose, expires_at) VALUES (?, ?, 'confirm_email', ?)`,
      )
        .bind(token, id, isoPlusDays(7))
        .run();

      await env.DB.prepare(
        `UPDATE subscribers SET email_status = 'pending', updated_at = datetime('now')
          WHERE id = ? AND email_status != 'confirmed'`,
      )
        .bind(id)
        .run();

      const unsubscribeUrl = await unsubscribeUrlFor(env, id);
      const msg = confirmEmail(env, {
        firstName: first,
        confirmUrl: `${env.SITE_URL}/confirm?token=${token}`,
        unsubscribeUrl,
      });
      // Delivery failure must not discard the signup; the row and token are already
      // written. Recorded so the failure is visible via /api/admin/diagnostics.
      const sent = await sendEmail(env, { to: email, ...msg, unsubscribeUrl });
      if (!sent.ok) {
        console.error('confirm email failed', sent.error);
        await logConsent(env, {
          subscriberId: id,
          channel: 'email',
          action: 'send_failed',
          detail: `Confirmation email did not send: ${sent.error ?? 'unknown error'}`,
          ip,
          userAgent: ua,
        });
      }

      await logConsent(env, {
        subscriberId: id,
        channel: 'email',
        action: 'requested',
        detail: `Website form. Consent shown: "I agree to receive emails from ${env.CHAPTER_NAME} about meetings, events, and campaigns." version=${env.CONSENT_VERSION}`,
        ip,
        userAgent: ua,
      });
      notices.push('Check your email and click the confirmation link.');
    }
  }

  /* ---- SMS channel ---- */
  if (phone) {
    if (existing?.phone_status === 'confirmed') {
      notices.push('Your number is already on our text list.');
    } else if (existing?.phone_status === 'unsubscribed') {
      // Previously opted out. Carrier rules require the subscriber to send START
      // themselves; re-adding via the web form is not permitted.
      notices.push(
        `This number previously opted out of texts. To rejoin, text START to ${env.TWILIO_PHONE_NUMBER}.`,
      );
    } else {
      await env.DB.prepare(
        `UPDATE subscribers SET phone_status = 'pending', updated_at = datetime('now')
          WHERE id = ? AND phone_status != 'confirmed'`,
      )
        .bind(id)
        .run();

      const sent = await sendSms(
        env,
        phone,
        `${env.CHAPTER_NAME}: Reply YES to confirm you want chapter text updates. ` +
          `Approx 2-6 msgs/month. Msg&data rates may apply. Reply HELP for help, STOP to cancel. ` +
          `${env.SITE_URL}/sms-terms`,
      );
      if (!sent.ok) {
        console.error('confirm sms failed', sent.error);
        await logConsent(env, {
          subscriberId: id,
          channel: 'sms',
          action: 'send_failed',
          detail: `Confirmation text did not send: ${sent.error ?? 'unknown error'}`,
          ip,
          userAgent: ua,
        });
      }

      await logConsent(env, {
        subscriberId: id,
        channel: 'sms',
        action: 'requested',
        detail: `Website form. Consent shown: "I agree to receive recurring automated text messages from ${env.CHAPTER_NAME} at the mobile number I provided... Consent is not a condition of membership. Approx 2-6 msgs/month. Msg & data rates may apply. Reply STOP to cancel, HELP for help." version=${env.CONSENT_VERSION}`,
        ip,
        userAgent: ua,
      });
      notices.push('We texted you — reply YES to that message to finish signing up for texts.');
    }
  }

  return json({ ok: true, message: notices.join(' ') });
}

/* --------------------------------------------------------------- /api/contact */

/**
 * Public contact form. Deliberately does NOT touch `subscribers` — asking a
 * question is not consent to be on a mailing list, and quietly adding people
 * who write in is exactly the behaviour that gets senders reported.
 */
async function handleContact(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const ua = request.headers.get('User-Agent') ?? null;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true, message: 'Thanks — we got your message.' });
  }

  const message = typeof body.body === 'string' ? body.body.trim().slice(0, 5000) : '';
  if (!message) return json({ error: 'Please write a message.' }, 400);

  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  if (!email && !phone) {
    return json({ error: 'Please leave an email or phone number so we can reply.' }, 400);
  }

  if (!(await checkRateLimit(env, `contact:${ip}`, 5, 60))) {
    return json({ error: 'Too many messages from this connection. Please try again later.' }, 429);
  }

  await env.DB.prepare(
    `INSERT INTO messages (id, name, email, phone, county, topic, body, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      cleanName(body.name),
      email,
      phone,
      cleanName(body.county, 40),
      cleanName(body.topic, 100),
      message,
      ip,
      ua,
    )
    .run();

  // Best-effort notification. If it fails the message is still saved.
  const sent = await sendEmail(env, {
    to: env.CONTACT_EMAIL,
    subject: `[${env.CHAPTER_NAME}] ${cleanName(body.topic, 60) ?? 'New message'}`,
    text:
      `From:   ${cleanName(body.name) ?? '(no name)'}\n` +
      `Email:  ${email ?? '(none)'}\n` +
      `Phone:  ${phone ?? '(none)'}\n` +
      `County: ${cleanName(body.county, 40) ?? '(none)'}\n` +
      `Topic:  ${cleanName(body.topic, 100) ?? '(none)'}\n\n${message}\n`,
    html: `<p><strong>From:</strong> ${escapeHtml(cleanName(body.name) ?? '(no name)')}<br>
<strong>Email:</strong> ${escapeHtml(email ?? '(none)')}<br>
<strong>Phone:</strong> ${escapeHtml(phone ?? '(none)')}<br>
<strong>County:</strong> ${escapeHtml(cleanName(body.county, 40) ?? '(none)')}<br>
<strong>Topic:</strong> ${escapeHtml(cleanName(body.topic, 100) ?? '(none)')}</p>
<hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });
  if (!sent.ok) console.error('contact notification failed', sent.error);

  return json({
    ok: true,
    message: 'Thanks — we got your message. We’re all volunteers, so give us a few days.',
  });
}

/* ------------------------------------------------------------------ /confirm */

async function handleConfirm(request: Request, env: Env, url: URL): Promise<Response> {
  const token = url.searchParams.get('token') ?? '';
  const row = await env.DB.prepare(
    `SELECT t.token, t.subscriber_id, t.purpose, t.expires_at, t.used_at, s.email, s.first_name
       FROM tokens t JOIN subscribers s ON s.id = t.subscriber_id
      WHERE t.token = ? AND t.purpose = 'confirm_email'`,
  )
    .bind(token)
    .first<{
      subscriber_id: string;
      expires_at: string;
      used_at: string | null;
      email: string | null;
      first_name: string | null;
    }>();

  if (!row) {
    return html(
      resultPage(env, {
        title: 'Link not valid',
        glyph: '&#9888;',
        heading: 'That link isn&rsquo;t valid',
        body: `It may have already been used. If you&rsquo;re not sure whether you&rsquo;re signed up, <a href="/">sign up again</a> — it won&rsquo;t create a duplicate.`,
      }),
      404,
    );
  }

  if (row.used_at) {
    return html(
      resultPage(env, {
        title: 'Already confirmed',
        glyph: '&#10003;',
        heading: 'You&rsquo;re already confirmed',
        body: 'You&rsquo;re on the email list. Nothing more to do.',
      }),
    );
  }

  if (Date.parse(row.expires_at) < Date.now()) {
    return html(
      resultPage(env, {
        title: 'Link expired',
        glyph: '&#9200;',
        heading: 'That link expired',
        body: 'Confirmation links are good for 7 days. Please <a href="/">sign up again</a> to get a fresh one.',
      }),
      410,
    );
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE tokens SET used_at = datetime('now') WHERE token = ?`).bind(token),
    env.DB.prepare(
      `UPDATE subscribers
          SET email_status = 'confirmed', email_confirmed_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?`,
    ).bind(row.subscriber_id),
  ]);

  await logConsent(env, {
    subscriberId: row.subscriber_id,
    channel: 'email',
    action: 'confirmed',
    detail: 'Clicked confirmation link in double opt-in email.',
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  });

  return html(
    resultPage(env, {
      title: 'Confirmed',
      glyph: '&#10003;',
      heading: 'You&rsquo;re on the list',
      body: `We&rsquo;ll email you about meetings, events, and local organizing. Every email has an unsubscribe link. Want texts too? <a href="/">Add your mobile number</a>.`,
    }),
  );
}

/* -------------------------------------------------------------- /unsubscribe */

async function handleUnsubscribe(request: Request, env: Env, url: URL): Promise<Response> {
  const token = url.searchParams.get('token') ?? '';
  const row = await env.DB.prepare(
    `SELECT subscriber_id FROM tokens WHERE token = ? AND purpose = 'unsubscribe_email'`,
  )
    .bind(token)
    .first<{ subscriber_id: string }>();

  if (!row) {
    return html(
      resultPage(env, {
        title: 'Link not valid',
        glyph: '&#9888;',
        heading: 'That link isn&rsquo;t valid',
        body: `Email <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a> and we&rsquo;ll remove you by hand.`,
      }),
      404,
    );
  }

  await env.DB.prepare(
    `UPDATE subscribers SET email_status = 'unsubscribed', updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(row.subscriber_id)
    .run();

  await logConsent(env, {
    subscriberId: row.subscriber_id,
    channel: 'email',
    action: 'opt_out',
    detail: 'Clicked unsubscribe link.',
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  });

  return html(
    resultPage(env, {
      title: 'Unsubscribed',
      glyph: '&#128075;',
      heading: 'You&rsquo;re unsubscribed',
      body: 'You won&rsquo;t get any more emails from us. If this was a mistake you can <a href="/">sign up again</a> any time.',
    }),
  );
}

/* ------------------------------------------------------------------ /api/sms */

const STOP_WORDS = new Set([
  'STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT', 'OPT-OUT',
]);
const START_WORDS = new Set(['START', 'UNSTOP', 'RESUBSCRIBE', 'OPTIN', 'OPT-IN']);
const HELP_WORDS = new Set(['HELP', 'INFO', 'SUPPORT']);
const YES_WORDS = new Set(['YES', 'Y', 'YEAH', 'YEP', 'CONFIRM', 'JOIN', 'SUBSCRIBE']);

async function handleInboundSms(request: Request, env: Env, url: URL): Promise<Response> {
  const raw = await request.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  // Twilio signs over the exact public URL it was configured with.
  const publicUrl = `${env.SITE_URL}${url.pathname}`;
  if (!(await validateTwilioSignature(env, request, publicUrl, params))) {
    console.error('bad twilio signature');
    return new Response('Forbidden', { status: 403 });
  }

  const from = normalizePhone(params.From);
  const text = (params.Body ?? '').trim().toUpperCase().replace(/[.!?,]+$/, '');
  if (!from) return twiml();

  const sub = await env.DB.prepare(`SELECT * FROM subscribers WHERE phone = ?`)
    .bind(from)
    .first<SubscriberRow>();

  /* HELP — must always work, even for unknown numbers. */
  if (HELP_WORDS.has(text)) {
    if (sub) {
      await logConsent(env, { subscriberId: sub.id, channel: 'sms', action: 'help', detail: text });
    }
    return twiml(
      `${env.CHAPTER_NAME} chapter alerts. Approx 2-6 msgs/month. Msg&data rates may apply. ` +
        `Reply STOP to cancel. Help: ${env.CONTACT_EMAIL} or ${env.SITE_URL}/sms-terms`,
    );
  }

  /* STOP — must always work. */
  if (STOP_WORDS.has(text)) {
    if (sub) {
      await env.DB.prepare(
        `UPDATE subscribers SET phone_status = 'unsubscribed', updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(sub.id)
        .run();
      await logConsent(env, {
        subscriberId: sub.id,
        channel: 'sms',
        action: 'opt_out',
        detail: `Inbound SMS: ${text}`,
      });
    }
    // Twilio's Advanced Opt-Out sends the confirmation; empty TwiML avoids a duplicate.
    return twiml();
  }

  if (!sub) {
    // Unknown number: respond once with the website address and take no further action.
    return twiml(
      `${env.CHAPTER_NAME}: we don't have this number on file. To join, visit ${env.SITE_URL}. Reply HELP for help.`,
    );
  }

  /* START — rejoin after a previous STOP. */
  if (START_WORDS.has(text)) {
    await env.DB.prepare(
      `UPDATE subscribers SET phone_status = 'confirmed', phone_confirmed_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(sub.id)
      .run();
    await logConsent(env, {
      subscriberId: sub.id,
      channel: 'sms',
      action: 'resubscribe',
      detail: `Inbound SMS: ${text}`,
    });
    return twiml(
      `${env.CHAPTER_NAME}: you're back on the text list. Approx 2-6 msgs/month. Reply STOP to cancel, HELP for help.`,
    );
  }

  /* YES — completes double opt-in. */
  if (YES_WORDS.has(text)) {
    if (sub.phone_status === 'confirmed') {
      return twiml(`${env.CHAPTER_NAME}: you're already signed up for texts. Reply STOP to cancel.`);
    }
    await env.DB.prepare(
      `UPDATE subscribers SET phone_status = 'confirmed', phone_confirmed_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(sub.id)
      .run();
    await logConsent(env, {
      subscriberId: sub.id,
      channel: 'sms',
      action: 'confirmed',
      detail: `Inbound SMS: ${text}. Double opt-in completed.`,
    });
    return twiml(
      `${env.CHAPTER_NAME}: you're confirmed! You'll get chapter updates, approx 2-6 msgs/month. ` +
        `Msg&data rates may apply. Reply STOP to cancel, HELP for help.`,
    );
  }

  /* Anything else. */
  return twiml(
    `${env.CHAPTER_NAME}: thanks for your message. This number isn't monitored for replies — ` +
      `email ${env.CONTACT_EMAIL} to reach a person. Reply STOP to cancel, HELP for help.`,
  );
}

/* --------------------------------------------------------------------- admin */

function authorized(request: Request, env: Env): boolean {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(env.ADMIN_TOKEN) && safeEqual(token, env.ADMIN_TOKEN);
}

async function handleStats(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const row = await env.DB.prepare(
    `SELECT
       COUNT(*)                                                       AS total,
       SUM(CASE WHEN email_status = 'confirmed'    THEN 1 ELSE 0 END) AS email_confirmed,
       SUM(CASE WHEN email_status = 'pending'      THEN 1 ELSE 0 END) AS email_pending,
       SUM(CASE WHEN email_status = 'unsubscribed' THEN 1 ELSE 0 END) AS email_unsubscribed,
       SUM(CASE WHEN phone_status = 'confirmed'    THEN 1 ELSE 0 END) AS sms_confirmed,
       SUM(CASE WHEN phone_status = 'pending'      THEN 1 ELSE 0 END) AS sms_pending,
       SUM(CASE WHEN phone_status = 'unsubscribed' THEN 1 ELSE 0 END) AS sms_unsubscribed
     FROM subscribers`,
  ).first();
  return json(row);
}

/**
 * Reports configuration and delivery status: which secrets are set, whether the sending
 * domain is verified, and recent delivery failures. Read-only; sends nothing. Reports
 * only whether each secret is present, never its value.
 */
async function handleDiagnostics(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);

  const secrets = {
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
    ADMIN_TOKEN: Boolean(env.ADMIN_TOKEN),
    TWILIO_ACCOUNT_SID: Boolean(env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: Boolean(env.TWILIO_AUTH_TOKEN),
    TWILIO_MESSAGING_SERVICE_SID: Boolean(env.TWILIO_MESSAGING_SERVICE_SID),
  };

  // Ask Resend which domains it considers verified. This is the single most common
  // reason confirmation mail vanishes: DNS is published but the domain was never
  // verified in the dashboard, so every send is rejected.
  let resend: Record<string, unknown> = { checked: false };
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      const body = await r.text();
      if (!r.ok) {
        // A "restricted_api_key" 401 is NOT a broken key. Resend's sending-only keys
        // can send mail but cannot read /domains, which is the correct least-privilege
        // setup — it's what you want in production. Treating it as a failure sends you
        // off rotating a perfectly good key.
        const restricted = body.includes('restricted_api_key');
        resend = {
          checked: true,
          ok: false,
          restricted_send_only_key: restricted,
          status: r.status,
          error: body.slice(0, 400),
          verdict: restricted
            ? 'API key is valid and can send, but is scoped send-only so it cannot read domain status. That is the right kind of key to use. Check verification at resend.com/domains, or run a real test send: POST /api/admin/test-email'
            : 'Resend rejected the key. Check RESEND_API_KEY, or generate a new one at resend.com/api-keys.',
        };
      } else {
        let domains: { name?: string; status?: string; region?: string }[] = [];
        try {
          const parsed = JSON.parse(body) as { data?: typeof domains };
          domains = parsed.data ?? [];
        } catch {
          /* fall through with empty list */
        }
        const from = (env.FROM_EMAIL.match(/<([^>]+)>/)?.[1] ?? env.FROM_EMAIL).split('@')[1];
        const match = domains.find((d) => d.name && from?.endsWith(d.name));
        resend = {
          checked: true,
          ok: true,
          sending_domain_in_from: from,
          domains: domains.map((d) => ({ name: d.name, status: d.status })),
          from_domain_registered: Boolean(match),
          from_domain_verified: match?.status === 'verified',
          verdict: !match
            ? `No Resend domain matches "${from}". Add and verify it at resend.com/domains, or change FROM_EMAIL to a domain you have verified.`
            : match.status === 'verified'
              ? 'Sending domain is verified. If mail still is not arriving, check spam and the Resend logs.'
              : `Domain "${match.name}" is registered but status is "${match.status}". Finish verification at resend.com/domains.`,
        };
      }
    } catch (err) {
      resend = { checked: true, ok: false, error: String(err) };
    }
  } else {
    resend = { checked: false, verdict: 'RESEND_API_KEY is not set. Run: wrangler secret put RESEND_API_KEY' };
  }

  // Recent send failures recorded against consent events.
  const { results: failures } = await env.DB.prepare(
    `SELECT channel, action, substr(detail,1,300) AS detail, created_at
       FROM consent_events WHERE action = 'send_failed'
      ORDER BY created_at DESC LIMIT 10`,
  ).all();

  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS subscribers,
            SUM(CASE WHEN email_status='pending' THEN 1 ELSE 0 END) AS email_pending,
            SUM(CASE WHEN email_status='confirmed' THEN 1 ELSE 0 END) AS email_confirmed
       FROM subscribers`,
  ).first();

  return json({
    secrets,
    resend,
    twilio: {
      ready: secrets.TWILIO_ACCOUNT_SID && secrets.TWILIO_AUTH_TOKEN,
      note: secrets.TWILIO_AUTH_TOKEN
        ? 'Credentials present. Texts still require an approved A2P campaign.'
        : 'TWILIO_AUTH_TOKEN missing — inbound STOP/YES webhooks will be rejected (403) and outbound sends will fail auth.',
    },
    database: counts,
    recent_send_failures: failures,
  });
}

/**
 * Sends one real email through Resend and returns the raw API response.
 *
 * This is the definitive test. With a send-only key we cannot read domain status, so
 * inspection can only get us so far — actually sending is the only way to know whether
 * the sending domain is verified. Returns Resend's own error text rather than a
 * summary, because that text names the exact problem (unverified domain, wrong from
 * address, sandbox restriction).
 *
 *   POST /api/admin/test-email   {"to":"you@example.com"}
 */
async function handleTestEmail(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);

  let to: string | null = null;
  try {
    const body = (await request.json()) as { to?: unknown };
    to = normalizeEmail(body.to);
  } catch {
    /* handled below */
  }
  if (!to) return json({ error: 'Provide {"to":"you@example.com"}' }, 400);

  // Sends real mail from a verified domain to an arbitrary address; rate limited
  // independently of authentication.
  if (!(await checkRateLimit(env, 'test-email', 10, 60))) {
    return json({ error: 'Test-send limit reached (10/hour). Try again later.' }, 429);
  }

  // Sends the live confirmation template so the test exercises real markup. The token
  // is inert; the button resolves to an expired-link page.
  const stamp = new Date().toISOString();
  const preview = confirmEmail(env, {
    firstName: null,
    confirmUrl: `${env.SITE_URL}/confirm?token=test-send-not-a-real-token`,
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      subject: `[TEST] ${preview.subject}`,
      html: preview.html,
      text: `[TEST SEND ${stamp}] This is the real confirmation email. The button below is
inert — it uses a fake token and will show an expired-link page.

${preview.text}`,
    }),
  });

  const raw = await res.text();
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* keep raw text */
  }

  let verdict: string;
  if (res.ok) {
    verdict = `Sent. Check ${to} — including spam. If it arrives, signup confirmations will too.`;
  } else if (raw.includes('domain is not verified') || raw.includes('not verified')) {
    verdict =
      `Resend refuses to send from "${env.FROM_EMAIL}" because that domain is not verified. ` +
      `Verify it at resend.com/domains — the DNS records are already published.`;
  } else if (raw.includes('testing emails') || raw.includes('own email address')) {
    verdict =
      `The Resend account is still in test mode and can only send to the address that owns it. ` +
      `Verify a sending domain to lift that.`;
  } else if (res.status === 401 || res.status === 403) {
    verdict = 'Resend rejected the API key for sending. Generate a new one with sending permission.';
  } else {
    verdict = 'Send failed. Resend response below names the reason.';
  }

  // Always 200. This is a diagnostic: the HTTP status reports whether the *check ran*,
  // not whether the thing being checked passed. Returning 5xx made Invoke-RestMethod
  // throw, which hid the Resend error message that is the entire point of the endpoint.
  // `ok` in the body carries the real result.
  return json({
    ok: res.ok,
    resend_status: res.status,
    to,
    from: env.FROM_EMAIL,
    verdict,
    resend_response: parsed,
  });
}

async function handleMessages(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, phone, county, topic, body, handled_at, created_at
       FROM messages ORDER BY created_at DESC LIMIT 200`,
  ).all();
  return json(results);
}

async function handleExport(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT first_name, last_name, email, phone, email_status, phone_status,
            email_confirmed_at, phone_confirmed_at, county, zip,
            consent_source, consent_version, created_at
       FROM subscribers ORDER BY created_at DESC`,
  ).all<Record<string, string | null>>();

  const cols = [
    'first_name', 'last_name', 'email', 'phone', 'email_status', 'phone_status',
    'email_confirmed_at', 'phone_confirmed_at', 'county', 'zip',
    'consent_source', 'consent_version', 'created_at',
  ];
  const esc = (v: string | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...results.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dsa-list-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
