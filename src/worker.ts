// Central PA DSA — email + SMS list backend.
//
// Routes
//   GET  /                     chapter landing page with the opt-in form
//   GET  /privacy              privacy policy
//   GET  /sms-terms            SMS terms & conditions
//   POST /api/subscribe        form target; starts double opt-in
//   GET  /confirm?token=…      email confirmation link
//   GET  /unsubscribe?token=…  one-click email unsubscribe
//   POST /api/sms              Twilio inbound webhook (YES / STOP / START / HELP)
//   GET  /api/admin/stats      list counts        (Bearer ADMIN_TOKEN)
//   GET  /api/admin/export     CSV of the list    (Bearer ADMIN_TOKEN)
//
// The schema is NOT created here — apply schema.sql with wrangler once.

import {
  type Env,
  checkRateLimit,
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
  validateTwilioSignature,
} from './lib';
import {
  confirmEmail,
  contactPage,
  groupsPage,
  homePage,
  notFoundPage,
  privacyPage,
  resultPage,
  smsTermsPage,
} from './pages';

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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    try {
      if (method === 'GET' || method === 'HEAD') {
        switch (path) {
          case '/':
            return html(homePage(env));
          case '/groups':
          case '/chapters':
            return html(groupsPage(env));
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
          case '/health':
            return json({ ok: true, time: new Date().toISOString() });
        }
      }

      if (method === 'POST') {
        if (path === '/api/subscribe') return handleSubscribe(request, env);
        if (path === '/api/contact') return handleContact(request, env);
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

  // Honeypot: real people never see this field, bots fill everything.
  // Return success so the bot doesn't learn anything.
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

  // Throttle only once we know the submission is well-formed. Checking earlier
  // meant someone fat-fingering their own email four times got locked out for an
  // hour; the thing actually worth rate-limiting is sending real mail and texts.
  // 8 valid signups per IP per hour still allows a household or a table of people
  // at a meeting sharing one hotspot.
  if (!(await checkRateLimit(env, `subscribe:${ip}`, 8, 60))) {
    return json({ error: 'Too many signups from this connection. Please try again later.' }, 429);
  }

  const fullName = cleanName(body.name);
  const { first, last } = splitName(fullName);
  const zip =
    typeof body.zip === 'string' && /^\d{5}$/.test(body.zip.trim()) ? body.zip.trim() : null;
  const county = cleanName(body.county, 40);

  // Find an existing record by either channel so we merge rather than duplicate.
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

      const msg = confirmEmail(env, {
        firstName: first,
        confirmUrl: `${env.SITE_URL}/confirm?token=${token}`,
      });
      const sent = await sendEmail(env, { to: email, ...msg });
      if (!sent.ok) console.error('confirm email failed', sent.error);

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
      // They previously texted STOP. Carrier rules say we may not simply
      // re-add them from a web form; they must text START themselves.
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
      if (!sent.ok) console.error('confirm sms failed', sent.error);

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
    // Twilio's Advanced Opt-Out normally sends the final confirmation itself.
    // Returning empty TwiML avoids sending a duplicate.
    return twiml();
  }

  if (!sub) {
    // Unknown number texting in. Don't start a conversation with someone who
    // never gave us their number — point them at the website and stop.
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
