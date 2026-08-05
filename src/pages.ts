// Central PA DSA — server-rendered pages.
// Everything is inline (no external CSS/JS/fonts) so the whole site is one
// Worker deploy with nothing else to host, and so Twilio's automated
// screenshot check during campaign vetting always sees fully-rendered content.

import type { Env } from './lib';
import {
  GROUPS,
  KNOWN_COUNTIES,
  NEARBY_COUNTIES,
  NATIONAL_CHAPTER_MAP,
  NATIONAL_JOIN,
  NATIONAL_ZIP_LOOKUP,
  STATUS_LABEL,
  STATUS_NOTE,
  type Group,
} from './groups';

const RED = '#ec1f27';

const ALL_COUNTIES = Array.from(new Set([...KNOWN_COUNTIES, ...NEARBY_COUNTIES])).sort();

function countyOptions(): string {
  return ALL_COUNTIES.map((c) => `<option>${c}</option>`).join('') +
    `<option value="Other">Somewhere else in PA</option>`;
}

function groupCard(g: Group): string {
  const badge =
    g.status === 'chapter' ? '#14532d' : g.status === 'organizing' ? '#7a4a00' : RED;
  return `
<div style="border:1px solid var(--line); border-radius:11px; padding:20px; background:#fff; margin-top:14px">
  <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap">
    <strong style="font-size:18px">${g.name}</strong>
    <span style="font-size:11.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
                 color:${badge}; border:1px solid ${badge}33; background:${badge}0f;
                 padding:3px 8px; border-radius:20px">${STATUS_LABEL[g.status]}</span>
  </div>
  <p style="margin:9px 0 6px; color:#2c2c33">${g.blurb}</p>
  <p style="margin:0 0 10px; font-size:13.5px; color:var(--muted)">${STATUS_NOTE[g.status]}</p>
  <p style="margin:0; font-size:14.5px">
    ${g.links.map((l) => `<a href="${l.href}" style="margin-right:14px">${l.label}</a>`).join('')}
  </p>
</div>`;
}

function layout(env: Env, opts: { title: string; desc: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title} — ${env.SITE_NAME}</title>
<meta name="description" content="${opts.desc}">
<style>
  :root { --red: ${RED}; --ink: #16161a; --muted: #5c5c66; --line: #e3e3e8; --bg: #fbfaf8; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  a { color: var(--red); }
  header { background: var(--ink); color:#fff; padding: 14px 20px; }
  header .wrap { max-width: 860px; margin:0 auto; display:flex; align-items:center; gap:12px;
                 flex-wrap:wrap; justify-content:space-between; }
  .brand { font-weight:800; letter-spacing:.02em; font-size:17px; color:#fff; text-decoration:none; }
  .brand span { color: var(--red); }
  nav a { color:#d8d8de; text-decoration:none; margin-left:18px; font-size:14px; }
  nav a:hover { color:#fff; }
  main { max-width: 860px; margin: 0 auto; padding: 0 20px 72px; }
  .hero { padding: 56px 0 32px; border-bottom: 3px solid var(--red); }
  .hero h1 { font-size: clamp(30px, 5.5vw, 46px); line-height:1.12; margin:0 0 14px; letter-spacing:-.02em; }
  .hero p { font-size: 18px; color: var(--muted); max-width: 60ch; margin:0; }
  h2 { font-size: 24px; margin: 40px 0 12px; letter-spacing:-.01em; }
  h3 { font-size: 17px; margin: 26px 0 6px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:28px; margin-top:28px; }
  label { display:block; font-weight:600; font-size:14px; margin: 16px 0 6px; }
  input[type=text], input[type=email], input[type=tel] {
    width:100%; padding:11px 13px; font-size:16px; border:1px solid #c9c9d2;
    border-radius:8px; background:#fff; font-family:inherit; }
  input:focus { outline:2px solid var(--red); outline-offset:1px; border-color:var(--red); }
  .hint { font-size:13px; color:var(--muted); margin-top:4px; }
  .consent { display:flex; gap:11px; align-items:flex-start; margin:20px 0;
             padding:15px; background:#f6f6f9; border-radius:9px; border:1px solid var(--line); }
  .consent input { margin-top:4px; width:18px; height:18px; flex:none; accent-color: var(--red); }
  .consent label { margin:0; font-weight:400; font-size:14px; line-height:1.55; }
  .consent label b { display:block; font-weight:700; margin-bottom:3px; font-size:15px; }
  button { margin-top:22px; background:var(--red); color:#fff; border:0; border-radius:9px;
           padding:14px 30px; font-size:16px; font-weight:700; cursor:pointer; font-family:inherit; }
  button:hover { background:#c9161d; }
  button:disabled { opacity:.55; cursor:not-allowed; }
  .msg { margin-top:18px; padding:13px 15px; border-radius:9px; font-size:15px; display:none; }
  .msg.err { display:block; background:#fdeaea; color:#8e1116; border:1px solid #f3c2c4; }
  .msg.ok  { display:block; background:#e9f7ee; color:#14532d; border:1px solid #bfe5cd; }
  .hp { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }
  footer { border-top:1px solid var(--line); margin-top:56px; padding:26px 20px 60px;
           font-size:13.5px; color:var(--muted); }
  footer .wrap { max-width:860px; margin:0 auto; }
  footer a { margin-right:16px; }
  .legal { max-width: 72ch; }
  .legal p, .legal li { color:#2c2c33; }
  .legal .updated { color:var(--muted); font-size:14px; }
  .center { text-align:center; padding: 60px 0; }
  .center .big { font-size:52px; line-height:1; margin-bottom:14px; }
  table { border-collapse: collapse; width:100%; margin:14px 0; font-size:14.5px; }
  th, td { text-align:left; padding:9px 11px; border:1px solid var(--line); vertical-align:top; }
  th { background:#f6f6f9; font-weight:700; }
  code { background:#f0f0f4; padding:1px 5px; border-radius:4px; font-size:.92em; }
</style>
</head>
<body>
<header><div class="wrap">
  <a class="brand" href="/">${env.SITE_NAME.replace('DSA', '<span>DSA</span>')}</a>
  <nav>
    <a href="/">Home</a>
    <a href="/groups">Local groups</a>
    <a href="/contact">Contact</a>
    <a href="/privacy">Privacy</a>
  </nav>
</div></header>
<main>${opts.body}</main>
<footer><div class="wrap">
  <a href="/contact">Contact</a>
  <a href="/privacy">Privacy Policy</a>
  <a href="/sms-terms">SMS Terms</a>
  <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>
  <p style="margin-top:14px">
    ${env.SITE_NAME} is a shared regional resource for DSA groups in Central Pennsylvania.
    It is not itself a chartered chapter. The mailing list on this site is operated by
    <strong>${env.CHAPTER_NAME}</strong>, ${env.MAILING_ADDRESS}.
  </p>
  <p style="margin-top:6px">Not authorized by any candidate or candidate&rsquo;s committee.</p>
</div></footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------- home */

export function homePage(env: Env): string {
  return layout(env, {
    title: 'Join the list',
    desc: `Get email and text updates from ${env.CHAPTER_NAME} about meetings, events, and local organizing.`,
    body: `
<section class="hero">
  <h1>Democratic socialists in Central Pennsylvania.</h1>
  <p>Working people organizing where we live &mdash; in Centre County, in Clearfield County,
     and in the towns in between. Find your local group, or add yourself to the list and
     we&rsquo;ll tell you when things are happening near you.</p>
</section>

<div class="card" id="find">
  <h2 style="margin-top:0">Find your local group</h2>
  <p class="hint" style="font-size:15px">Central PA is a big area and different counties have
     different groups. Tell us where you are.</p>
  <label for="find_county">Your county</label>
  <select id="find_county">
    <option value="">Select your county…</option>
    ${countyOptions()}
  </select>
  <div id="find_result" style="margin-top:6px"></div>
</div>

<div class="card">
  <h2 style="margin-top:0">Join our email and text list</h2>
  <p class="hint" style="font-size:15px">
    Pick whichever you want &mdash; email, text, or both. We&rsquo;ll send you one message to confirm.
    You are not on a list until you confirm.
  </p>

  <form id="signup" novalidate>
    <label for="name">Name</label>
    <input id="name" name="name" type="text" autocomplete="name" placeholder="Your name">

    <label for="email">Email address</label>
    <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com">

    <label for="phone">Mobile number</label>
    <input id="phone" name="phone" type="tel" autocomplete="tel" placeholder="(717) 555-0123">
    <div class="hint">US mobile numbers only. Landlines can&rsquo;t receive our texts.</div>

    <label for="county">County</label>
    <select id="county" name="county">
      <option value="">Select your county…</option>
      ${countyOptions()}
    </select>
    <div class="hint">Helps us tell you about organizing near you instead of an hour away.</div>

    <label for="zip">ZIP code <span style="font-weight:400;color:#5c5c66">(optional)</span></label>
    <input id="zip" name="zip" type="text" inputmode="numeric" maxlength="5" placeholder="16830">

    <div class="consent">
      <input type="checkbox" id="email_consent" name="email_consent">
      <label for="email_consent">
        <b>Email me chapter updates.</b>
        I agree to receive emails from ${env.CHAPTER_NAME} about meetings, events, and campaigns.
        Roughly 2&ndash;6 emails per month. Unsubscribe any time using the link in any email.
      </label>
    </div>

    <div class="consent">
      <input type="checkbox" id="sms_consent" name="sms_consent">
      <label for="sms_consent">
        <b>Text me chapter updates.</b>
        I agree to receive recurring automated text messages from ${env.CHAPTER_NAME} at the mobile
        number I provided, including messages sent using an automatic telephone dialing system.
        Consent is not a condition of membership or of any purchase.
        Message frequency varies, approximately 2&ndash;6 messages per month.
        Message and data rates may apply. Reply <b style="display:inline">STOP</b> to cancel or
        <b style="display:inline">HELP</b> for help.
        See our <a href="/sms-terms" target="_blank">SMS Terms</a> and
        <a href="/privacy" target="_blank">Privacy Policy</a>.
      </label>
    </div>

    <div class="hp" aria-hidden="true">
      <label for="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>

    <button type="submit" id="submit">Sign me up</button>
    <div class="msg" id="msg" role="status" aria-live="polite"></div>
  </form>
</div>

<h2>What we&rsquo;ll send you</h2>
<p>Meeting announcements and agendas, event invitations, local campaign updates, and the
   occasional ask to show up somewhere. That&rsquo;s it. We do not sell, rent, trade, or share
   your contact information with anyone &mdash; read the
   <a href="/privacy">Privacy Policy</a> for the details.</p>

<h2>Already signed up and want out?</h2>
<p>Click the unsubscribe link at the bottom of any email, reply <code>STOP</code> to any text,
   or email <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a> and we&rsquo;ll remove you.</p>

<script>
// --- local group finder -------------------------------------------------
(function () {
  var GROUPS = ${JSON.stringify(
    GROUPS.map((g) => ({
      name: g.name,
      counties: g.counties,
      status: STATUS_LABEL[g.status],
      note: STATUS_NOTE[g.status],
      blurb: g.blurb,
      links: g.links,
    })),
  )};
  var sel = document.getElementById('find_county');
  var out = document.getElementById('find_result');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }

  sel.addEventListener('change', function () {
    var county = sel.value;
    if (!county) { out.innerHTML = ''; return; }

    var matches = GROUPS.filter(function (g) {
      return g.counties.some(function (c) { return c.toLowerCase() === county.toLowerCase(); });
    });

    if (matches.length) {
      out.innerHTML = matches.map(function (g) {
        return '<div style="border:1px solid #e3e3e8;border-radius:11px;padding:18px;margin-top:14px;background:#f9f9fc">'
          + '<strong style="font-size:17px">' + esc(g.name) + '</strong>'
          + ' <span style="font-size:12px;color:#5c5c66">— ' + esc(g.status) + '</span>'
          + '<p style="margin:8px 0 6px">' + esc(g.blurb) + '</p>'
          + '<p style="margin:0 0 10px;font-size:13.5px;color:#5c5c66">' + esc(g.note) + '</p>'
          + '<p style="margin:0;font-size:14.5px">' + g.links.map(function (l) {
              return '<a href="' + esc(l.href) + '" style="margin-right:14px">' + esc(l.label) + '</a>';
            }).join('') + '</p></div>';
      }).join('');
    } else {
      out.innerHTML = '<div style="border:1px solid #e3e3e8;border-radius:11px;padding:18px;'
        + 'margin-top:14px;background:#f9f9fc">'
        + '<p style="margin:0 0 10px"><strong>We don\\'t have a group in ' + esc(county) + ' yet.</strong></p>'
        + '<p style="margin:0 0 10px">There may still be a DSA chapter covering you — national keeps '
        + 'the authoritative list. If there isn\\'t one, that\\'s how our group started too.</p>'
        + '<p style="margin:0;font-size:14.5px">'
        + '<a href="${NATIONAL_ZIP_LOOKUP}" style="margin-right:14px">Look up by ZIP code</a>'
        + '<a href="${NATIONAL_CHAPTER_MAP}" style="margin-right:14px">National chapter map</a>'
        + '<a href="/contact">Talk to us</a></p></div>';
    }
  });
})();

// --- signup form --------------------------------------------------------
(function () {
  var form = document.getElementById('signup');
  var btn  = document.getElementById('submit');
  var msg  = document.getElementById('msg');

  function show(kind, text) { msg.className = 'msg ' + kind; msg.textContent = text; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    show('', ''); msg.className = 'msg';

    var payload = {
      name:          document.getElementById('name').value,
      email:         document.getElementById('email').value,
      phone:         document.getElementById('phone').value,
      county:        document.getElementById('county').value,
      zip:           document.getElementById('zip').value,
      email_consent: document.getElementById('email_consent').checked,
      sms_consent:   document.getElementById('sms_consent').checked,
      website:       document.getElementById('website').value
    };

    if (!payload.email_consent && !payload.sms_consent) {
      return show('err', 'Please check at least one box so we know how you want to hear from us.');
    }
    if (payload.email_consent && !payload.email.trim()) {
      return show('err', 'Please enter your email address.');
    }
    if (payload.sms_consent && !payload.phone.trim()) {
      return show('err', 'Please enter your mobile number.');
    }

    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      var res  = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (res.ok) { show('ok', data.message); form.reset(); }
      else        { show('err', data.error || 'Something went wrong. Please try again.'); }
    } catch (err) {
      show('err', 'Could not reach the server. Please check your connection and try again.');
    } finally {
      btn.disabled = false; btn.textContent = 'Sign me up';
    }
  });
})();
</script>`,
  });
}

/* ----------------------------------------------------------------- groups */

export function groupsPage(env: Env): string {
  return layout(env, {
    title: 'Local groups',
    desc: 'Democratic Socialists of America groups organizing across Central Pennsylvania.',
    body: `
<section class="hero">
  <h1>Local groups.</h1>
  <p>Central Pennsylvania is spread out. These are the groups organizing here, what stage
     each one is at, and how to reach them.</p>
</section>

${GROUPS.map(groupCard).join('')}

<h2>Don&rsquo;t see your county?</h2>
<p>We only list groups we can vouch for. DSA national maintains the authoritative directory
   of every chapter in the country &mdash; if there&rsquo;s one covering you, it&rsquo;ll be there.</p>
<p>
  <a href="${NATIONAL_ZIP_LOOKUP}" style="margin-right:16px">Look up your ZIP code</a>
  <a href="${NATIONAL_CHAPTER_MAP}" style="margin-right:16px">National chapter map</a>
</p>

<h2>There&rsquo;s nothing near me. Now what?</h2>
<p>Start one. That&rsquo;s not a brush-off &mdash; it&rsquo;s how the Clearfield County group began,
   and DSA has a whole pipeline for it with staff support. If you&rsquo;re within reach of us,
   <a href="/contact">get in touch</a> and we&rsquo;ll help however we can.</p>
<p>You can also <a href="${NATIONAL_JOIN}">join DSA nationally</a> even if there&rsquo;s no local
   group yet. National knows where its members live, and enough members in one place is exactly
   how a new group gets started.</p>

<h2 id="status">What the labels mean</h2>
<table>
  <tr><th>Label</th><th>What it means</th></tr>
  <tr><td><strong>Chartered chapter</strong></td><td>${STATUS_NOTE.chapter}</td></tr>
  <tr><td><strong>Organizing committee</strong></td><td>${STATUS_NOTE.organizing}</td></tr>
  <tr><td><strong>Getting started</strong></td><td>${STATUS_NOTE.forming}</td></tr>
</table>
<p class="hint" style="font-size:14.5px">We label these honestly rather than making everything
   sound official. A group that&rsquo;s just getting started is often the most useful one to walk
   into &mdash; there&rsquo;s more to do and more say in how it&rsquo;s done.</p>`,
  });
}

/* ---------------------------------------------------------------- contact */

export function contactPage(env: Env): string {
  return layout(env, {
    title: 'Contact us',
    desc: `Get in touch with ${env.CHAPTER_NAME}. Ask a question, tell us about an issue, or find out when we meet.`,
    body: `
<section class="hero">
  <h1>Get in touch.</h1>
  <p>Questions about who we are, when we meet, or how to get involved. Something happening in
     your community we should know about. Or you just want to talk to a person.</p>
</section>

<div class="card">
  <h2 style="margin-top:0">Send us a message</h2>
  <p class="hint" style="font-size:15px">
    This does <strong>not</strong> add you to any list. If you want meeting announcements,
    <a href="/">sign up here</a> instead — or say so below and we&rsquo;ll point you the right way.
  </p>

  <form id="contact" novalidate>
    <label for="c_name">Name</label>
    <input id="c_name" name="name" type="text" autocomplete="name" placeholder="Your name">

    <label for="c_email">Email <span style="font-weight:400;color:#5c5c66">(so we can write back)</span></label>
    <input id="c_email" name="email" type="email" autocomplete="email" placeholder="you@example.com">

    <label for="c_phone">Phone <span style="font-weight:400;color:#5c5c66">(optional)</span></label>
    <input id="c_phone" name="phone" type="tel" autocomplete="tel" placeholder="(814) 555-0123">
    <div class="hint">Only used to reply to you. Giving it here does not sign you up for texts.</div>

    <label for="c_county">County</label>
    <select id="c_county" name="county">
      <option value="">Select…</option>
      <option>Clearfield</option>
      <option>Centre</option>
      <option>Elk</option>
      <option>Cambria</option>
      <option>Jefferson</option>
      <option>Indiana</option>
      <option>Blair</option>
      <option value="Other">Somewhere else</option>
    </select>

    <label for="c_topic">What&rsquo;s this about?</label>
    <select id="c_topic" name="topic">
      <option value="">Select…</option>
      <option>When and where do you meet?</option>
      <option>I want to get involved</option>
      <option>An issue in my community</option>
      <option>Media or press</option>
      <option>Remove me from your list</option>
      <option>Something else</option>
    </select>

    <label for="c_body">Message</label>
    <textarea id="c_body" name="body" rows="6"
      style="width:100%;padding:11px 13px;font-size:16px;border:1px solid #c9c9d2;border-radius:8px;font-family:inherit"
      placeholder="Tell us what's on your mind."></textarea>

    <div class="hp" aria-hidden="true">
      <label for="c_website">Leave this field empty</label>
      <input id="c_website" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>

    <button type="submit" id="c_submit">Send message</button>
    <div class="msg" id="c_msg" role="status" aria-live="polite"></div>
  </form>
</div>

<h2>Other ways to reach us</h2>
<p><strong>Email:</strong> <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a><br>
   <strong>Mail:</strong> ${env.MAILING_ADDRESS}</p>
<p class="hint" style="font-size:15px">We&rsquo;re all volunteers with jobs, so give us a few days.
   If it&rsquo;s urgent, say so in the subject and we&rsquo;ll move faster.</p>

<script>
(function () {
  var form = document.getElementById('contact');
  var btn  = document.getElementById('c_submit');
  var msg  = document.getElementById('c_msg');
  function show(kind, text) { msg.className = 'msg ' + kind; msg.textContent = text; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.className = 'msg';

    var payload = {
      name:    document.getElementById('c_name').value,
      email:   document.getElementById('c_email').value,
      phone:   document.getElementById('c_phone').value,
      county:  document.getElementById('c_county').value,
      topic:   document.getElementById('c_topic').value,
      body:    document.getElementById('c_body').value,
      website: document.getElementById('c_website').value
    };

    if (!payload.body.trim())  return show('err', 'Please write a message so we know what you need.');
    if (!payload.email.trim() && !payload.phone.trim()) {
      return show('err', 'Please leave an email or a phone number so we can write back.');
    }

    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      var res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (res.ok) { show('ok', data.message); form.reset(); }
      else        { show('err', data.error || 'Something went wrong. Please try again.'); }
    } catch (err) {
      show('err', 'Could not reach the server. Email ${env.CONTACT_EMAIL} instead.');
    } finally {
      btn.disabled = false; btn.textContent = 'Send message';
    }
  });
})();
</script>`,
  });
}

/* -------------------------------------------------------------- SMS terms */

export function smsTermsPage(env: Env): string {
  return layout(env, {
    title: 'SMS Terms & Conditions',
    desc: `Terms and conditions for the ${env.CHAPTER_NAME} SMS messaging program.`,
    body: `
<div class="legal">
<h1 style="margin-top:44px">SMS Terms &amp; Conditions</h1>
<p class="updated">Last updated: August 5, 2026</p>

<h3>Program description</h3>
<p>${env.CHAPTER_NAME} operates an SMS program that sends chapter announcements to people who
   have asked to receive them. Messages cover meeting times and locations, event announcements,
   local campaign updates, and volunteer requests.</p>

<h3>How to opt in</h3>
<p>You opt in by entering your mobile number at <a href="${env.SITE_URL}">${env.SITE_URL}</a> and
   checking the box consenting to receive text messages, or by giving your number and written
   consent on a paper sign-up sheet at one of our in-person events. In both cases we then send a
   single confirmation text, and you must reply <strong>YES</strong> before we send you anything
   else. If you do not reply YES, you receive no further messages.</p>

<h3>Message frequency</h3>
<p>Message frequency varies. You should expect approximately 2&ndash;6 messages per month.</p>

<h3>Cost</h3>
<p>Message and data rates may apply. ${env.CHAPTER_NAME} does not charge for these messages, but
   your mobile carrier may charge you according to your plan. Contact your carrier for details.</p>

<h3>How to opt out</h3>
<p>Reply <strong>STOP</strong> to any message from us at any time. You will receive one final
   message confirming you have been unsubscribed, and then no further messages. You can also
   email <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a> to be removed.
   To rejoin later, reply <strong>START</strong> or sign up again on our website.</p>

<h3>How to get help</h3>
<p>Reply <strong>HELP</strong> to any message for support information, or email
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>.</p>

<h3>Supported carriers</h3>
<p>Carriers are not liable for delayed or undelivered messages. Delivery is subject to effective
   transmission by your carrier and is not guaranteed.</p>

<h3>Consent</h3>
<p>By opting in you agree to receive recurring automated marketing and informational text messages
   from ${env.CHAPTER_NAME} at the mobile number you provided, including messages sent using an
   automatic telephone dialing system. <strong>Consent is not a condition of membership in
   ${env.CHAPTER_NAME} or of any purchase.</strong></p>

<h3>Privacy</h3>
<p>We do not sell, rent, trade, or share your mobile number or any other information you give us
   with third parties for their own marketing purposes. Mobile opt-in data and consent records are
   never shared with third parties for marketing. See our
   <a href="/privacy">Privacy Policy</a>.</p>

<h3>Changes</h3>
<p>We may update these terms. The current version always lives at
   <a href="${env.SITE_URL}/sms-terms">${env.SITE_URL}/sms-terms</a> with the last-updated date above.</p>

<h3>Contact</h3>
<p>${env.CHAPTER_NAME}<br>
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a></p>
</div>`,
  });
}

/* ----------------------------------------------------------------- privacy */

export function privacyPage(env: Env): string {
  return layout(env, {
    title: 'Privacy Policy',
    desc: `How ${env.CHAPTER_NAME} collects, uses, and protects your contact information.`,
    body: `
<div class="legal">
<h1 style="margin-top:44px">Privacy Policy</h1>
<p class="updated">Last updated: August 5, 2026</p>

<p>${env.CHAPTER_NAME} runs an email and text message list so members and supporters know when
   things are happening. This policy explains exactly what we collect, why, and what we will
   never do with it.</p>

<h3>The short version</h3>
<p>We collect your name, email, mobile number, and ZIP code, only if you give them to us. We use
   them to send you chapter announcements. We do not sell, rent, trade, or share your information
   with anyone outside the chapter. You can leave at any time and we delete your data on request.</p>

<h3>What we collect</h3>
<table>
  <tr><th>Data</th><th>Why we collect it</th></tr>
  <tr><td>Name</td><td>So messages are addressed to a person, and so we can find your record if you ask us to.</td></tr>
  <tr><td>Email address</td><td>To send chapter emails, if you opted in to email.</td></tr>
  <tr><td>Mobile number</td><td>To send chapter texts, if you opted in to texts.</td></tr>
  <tr><td>ZIP code (optional)</td><td>To tell you about organizing happening near you rather than across the region.</td></tr>
  <tr><td>Consent record</td><td>The date, time, IP address, and browser you used when you opted in, plus the exact wording you agreed to. Mobile carriers require us to be able to prove consent, and this is how we do it.</td></tr>
</table>

<h3>What we do with it</h3>
<p>We send you chapter announcements over the channels you chose. Nothing else. We do not build
   advertising profiles, we do not run analytics or tracking on this site, and there are no
   third-party cookies, pixels, or trackers on any page here.</p>

<h3>What we never do</h3>
<p>We do not sell your information. We do not rent, trade, or give it to other organizations,
   campaigns, candidates, vendors, or data brokers. Your mobile number and SMS consent are never
   shared with third parties for their marketing purposes, and are not shared with other
   organizations even for organizing purposes.</p>

<h3>Who can see your information</h3>
<p>Chapter members elected or appointed to handle communications, and only for the purpose of
   sending chapter messages. Access is limited to those people.</p>

<h3>Service providers</h3>
<p>We use a small number of vendors to actually deliver messages and store the list. They process
   data on our behalf and are not permitted to use it for their own purposes.</p>
<table>
  <tr><th>Provider</th><th>What they handle</th></tr>
  <tr><td>Twilio</td><td>Sends and receives text messages.</td></tr>
  <tr><td>Resend</td><td>Sends emails.</td></tr>
  <tr><td>Cloudflare</td><td>Hosts this website and stores the contact database.</td></tr>
</table>

<h3>How long we keep it</h3>
<p>We keep your contact record while you are on the list. If you unsubscribe, we keep a minimal
   record &mdash; your email or number and the fact that you opted out &mdash; so that we do not
   accidentally message you again, and so we can show carriers we honored your opt-out. Ask us to
   delete everything and we will, except where a consent or opt-out record must be retained to
   comply with telecom rules.</p>

<h3>Your choices</h3>
<ul>
  <li><strong>Leave the email list:</strong> click unsubscribe at the bottom of any email.</li>
  <li><strong>Leave the text list:</strong> reply STOP to any text.</li>
  <li><strong>See what we have on you, correct it, or delete it:</strong> email
      <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a> and we&rsquo;ll handle it.</li>
</ul>

<h3>Security</h3>
<p>The site is served over HTTPS. The contact database is not publicly accessible and
   administrative access requires a secret token held by chapter communications volunteers.
   No system is perfectly secure, and we will notify affected people promptly if we ever learn
   of a breach involving their information.</p>

<h3>Children</h3>
<p>This list is not directed to children under 13 and we do not knowingly collect their
   information. If you believe a child has signed up, email us and we will remove the record.</p>

<h3>Changes to this policy</h3>
<p>If we make a material change we will post the updated policy here with a new date, and notify
   the list if the change affects how we use your information.</p>

<h3>Contact</h3>
<p>${env.CHAPTER_NAME}<br>
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a></p>
</div>`,
  });
}

/* ------------------------------------------------------------ result pages */

export function resultPage(
  env: Env,
  opts: { title: string; glyph: string; heading: string; body: string },
): string {
  return layout(env, {
    title: opts.title,
    desc: opts.heading,
    body: `
<div class="center">
  <div class="big">${opts.glyph}</div>
  <h1 style="margin:0 0 12px">${opts.heading}</h1>
  <p style="color:#5c5c66; max-width:52ch; margin:0 auto 26px">${opts.body}</p>
  <p><a href="/">Back to ${env.CHAPTER_NAME}</a></p>
</div>`,
  });
}

export function notFoundPage(env: Env): string {
  return resultPage(env, {
    title: 'Not found',
    glyph: '&#9888;',
    heading: 'Page not found',
    body: 'That link doesn&rsquo;t go anywhere. It may have expired or been mistyped.',
  });
}

/* ------------------------------------------------------------ email bodies */

export function confirmEmail(
  env: Env,
  opts: { firstName: string | null; confirmUrl: string },
): { subject: string; html: string; text: string } {
  const hi = opts.firstName ? `Hi ${opts.firstName},` : 'Hi,';
  return {
    subject: `Confirm your ${env.CHAPTER_NAME} signup`,
    text: `${hi}

Someone (we hope you) signed up for ${env.CHAPTER_NAME} updates using this email address.

Confirm your signup:
${opts.confirmUrl}

This link expires in 7 days. If you didn't sign up, just ignore this email — we won't
add you to anything and you won't hear from us again.

${env.CHAPTER_NAME}
${env.CONTACT_EMAIL}
${env.SITE_URL}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fbfaf8;
  font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16161a">
<div style="max-width:560px;margin:0 auto;padding:34px 22px">
  <div style="border-top:4px solid ${RED};background:#fff;border-radius:0 0 12px 12px;
              padding:32px 30px;border:1px solid #e3e3e8;border-top:4px solid ${RED}">
    <p style="margin:0 0 16px">${hi}</p>
    <p style="margin:0 0 16px">Someone (we hope you) signed up for <strong>${env.CHAPTER_NAME}</strong>
       updates using this email address.</p>
    <p style="margin:0 0 26px">Click below to confirm and start getting chapter announcements.</p>
    <p style="margin:0 0 26px">
      <a href="${opts.confirmUrl}" style="display:inline-block;background:${RED};color:#fff;
         text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">Confirm my signup</a>
    </p>
    <p style="margin:0 0 8px;font-size:13.5px;color:#5c5c66">
      Or paste this into your browser:<br>
      <a href="${opts.confirmUrl}" style="color:${RED};word-break:break-all">${opts.confirmUrl}</a>
    </p>
    <p style="margin:22px 0 0;font-size:13.5px;color:#5c5c66">
      This link expires in 7 days. If you didn&rsquo;t sign up, ignore this email &mdash; we won&rsquo;t
      add you to anything and you won&rsquo;t hear from us again.
    </p>
  </div>
  <p style="font-size:12.5px;color:#5c5c66;text-align:center;margin:20px 0 0">
    ${env.CHAPTER_NAME} &middot;
    <a href="mailto:${env.CONTACT_EMAIL}" style="color:#5c5c66">${env.CONTACT_EMAIL}</a> &middot;
    <a href="${env.SITE_URL}/privacy" style="color:#5c5c66">Privacy</a>
  </p>
</div></body></html>`,
  };
}

/**
 * Re-permission email for the ~55 people already on the paper/spreadsheet list.
 * This is what makes it defensible to keep emailing them, and the only lawful
 * way to move any of them onto the SMS list.
 */
export function rePermissionEmail(
  env: Env,
  opts: { firstName: string | null; confirmUrl: string },
): { subject: string; html: string; text: string } {
  const hi = opts.firstName ? `Hi ${opts.firstName},` : 'Hi,';
  return {
    subject: `Confirm you still want ${env.CHAPTER_NAME} updates`,
    text: `${hi}

You're on the ${env.CHAPTER_NAME} contact list because you signed up at a meeting or event.

We're moving to a proper system with real unsubscribe links, and we're asking everyone to
confirm rather than assuming you still want to hear from us.

Confirm you want to keep getting chapter updates:
${opts.confirmUrl}

If you don't click, you'll stop hearing from us. No hard feelings.

Want texts too? Once you confirm, you can add your mobile number at ${env.SITE_URL}.
We are not adding anyone's phone number to the text list without them asking for it.

${env.CHAPTER_NAME}
${env.CONTACT_EMAIL}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fbfaf8;
  font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16161a">
<div style="max-width:560px;margin:0 auto;padding:34px 22px">
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px 30px;
              border:1px solid #e3e3e8;border-top:4px solid ${RED}">
    <p style="margin:0 0 16px">${hi}</p>
    <p style="margin:0 0 16px">You&rsquo;re on the <strong>${env.CHAPTER_NAME}</strong> contact list
       because you signed up at a meeting or event.</p>
    <p style="margin:0 0 26px">We&rsquo;re moving to a proper system with real unsubscribe links, and
       we&rsquo;re asking everyone to confirm rather than assuming you still want to hear from us.</p>
    <p style="margin:0 0 26px">
      <a href="${opts.confirmUrl}" style="display:inline-block;background:${RED};color:#fff;
         text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">Yes, keep me on the list</a>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#5c5c66">
      If you don&rsquo;t click, you&rsquo;ll stop hearing from us. No hard feelings.
    </p>
    <p style="margin:0;padding-top:18px;border-top:1px solid #e3e3e8;font-size:14px;color:#5c5c66">
      <strong style="color:#16161a">Want texts too?</strong> Once you confirm, add your mobile number
      at <a href="${env.SITE_URL}" style="color:${RED}">${env.SITE_URL}</a>. We are not adding
      anyone&rsquo;s phone number to the text list without them asking for it.
    </p>
  </div>
  <p style="font-size:12.5px;color:#5c5c66;text-align:center;margin:20px 0 0">
    ${env.CHAPTER_NAME} &middot;
    <a href="mailto:${env.CONTACT_EMAIL}" style="color:#5c5c66">${env.CONTACT_EMAIL}</a> &middot;
    <a href="${env.SITE_URL}/privacy" style="color:#5c5c66">Privacy</a>
  </p>
</div></body></html>`,
  };
}
