// Central PA DSA — server-rendered pages.
//
// Layout and design tokens follow Chicago DSA's Haymarket theme, which in turn takes
// its palette and typography from the DSA National Design Guide. See NOTICE.md.
// Everything is inline (no external CSS/JS/font requests) so the whole site is a
// single Worker deploy, and so Twilio's automated screenshot check during campaign
// vetting always sees fully-rendered content.

import type { Env } from './lib';
import {
  COUNTIES,
  COUNTY_STATE_COLOR,
  COUNTY_STATE_LABEL,
  GROUPS,
  NATIONAL_CHAPTER_MAP,
  NATIONAL_JOIN,
  NATIONAL_ZIP_LOOKUP,
  STATUS_LABEL,
  STATUS_NOTE,
  type Group,
} from './groups';

/* ------------------------------------------------------------------ palette */
// Haymarket / DSA National Design Guide.
const RED = '#EC1F27'; // DSA Red
const PURPLE = '#3B2462'; // Haymarket accent — buttons, tiles
const YELLOW = '#FAD434'; // Announcement bar
const BODY = '#394246'; // Body text
const HEAD = '#22282A'; // Headings
const MUTED = '#67777E'; // Small caps, captions
const LINE = '#E3E7E8'; // Borders and rules
const LINK = '#1E6BB8'; // Links

function countyOptions(): string {
  return (
    COUNTIES.map((c) => `<option>${c.name}</option>`).join('') +
    `<option value="Other">Somewhere else in PA</option>`
  );
}

function groupCard(g: Group): string {
  return `
<div class="note" style="border-left:0.3rem solid ${RED}">
  <h4 style="margin:0 0 .25rem">${g.name}</h4>
  <h6 style="margin:0 0 .75rem">${STATUS_LABEL[g.status]}</h6>
  <p style="margin:0 0 .5rem">${g.blurb}</p>
  <p style="margin:0 0 .75rem;font-size:1rem;color:${MUTED}">${STATUS_NOTE[g.status]}</p>
  <p style="margin:0;font-size:1rem">
    ${g.links.map((l) => `<a href="${l.href}" style="margin-right:1rem">${l.label}</a>`).join('')}
  </p>
</div>`;
}

/* ------------------------------------------------------------------- layout */

interface PageOpts {
  title: string;
  desc: string;
  /** Big white headline inside the red header. */
  headline: string;
  /** Optional line under the headline. */
  subhead?: string;
  body: string;
  /** Optional yellow announcement strip above everything. */
  announcement?: { text: string; href?: string };
}

function layout(env: Env, o: PageOpts): string {
  const ann = o.announcement
    ? `<div id="announcement"><div class="wrap">${
        o.announcement.href
          ? `<a href="${o.announcement.href}">${o.announcement.text}</a>`
          : o.announcement.text
      }</div></div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title} | ${env.SITE_NAME}</title>
<meta name="description" content="${o.desc}">
<meta name="theme-color" content="${RED}">
<link rel="icon" href="/assets/logo.png">
<style>
  /* If the chapter licenses Manifold DSA from the Design Elements folder, drop the
     woff2 into the worker and uncomment. Until then we use the same fallback stack
     Haymarket uses, which is what most visitors see there anyway.
  @font-face { font-family:"ManifoldDSA"; src:url("/assets/manifold.woff2") format("woff2");
               font-weight:700; font-display:swap; }
  */
  :root {
    --red:${RED}; --purple:${PURPLE}; --yellow:${YELLOW};
    --body:${BODY}; --head:${HEAD}; --muted:${MUTED}; --line:${LINE}; --link:${LINK};
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;padding:0;overflow-x:hidden;background:#fff;color:var(--body);
       font-family:"ManifoldDSA","Helvetica Neue",Helvetica,Arial,sans-serif;
       font-size:18px;line-height:1.5;-webkit-font-smoothing:antialiased}

  h1,h2,h3,h4,h5,h6{margin-top:2rem;font-weight:bold;line-height:1.2}
  h1,h2,h3,h4,th{color:var(--head)}
  h1{font-size:2.25rem}
  h2{font-size:1.6875rem}
  h3{font-size:1.25rem}
  h4,th{font-size:1.125rem}
  h5,h6{color:var(--muted);text-transform:uppercase;letter-spacing:.125em;font-weight:bold}
  h5{font-size:.9375rem}
  h6{font-size:.75rem}
  p{margin-bottom:1em}
  a{color:var(--link);text-decoration:none}
  a:hover{text-decoration:underline}
  a:focus{outline:2px dashed var(--link);outline-offset:2px}

  .wrap{max-width:56rem;margin:0 auto;padding:0 1rem}
  @media screen and (min-width:42em){.wrap{padding:0 4rem}}
  @media screen and (min-width:56em){.wrap{padding:0 6rem}}

  /* ---- announcement ---- */
  #announcement{position:relative;z-index:1;width:100%;padding:1rem 0;
                background:var(--yellow);font-size:1rem}
  #announcement a{color:${BODY};text-decoration:underline}

  /* ---- red page header ---- */
  #page-header{position:relative;background:var(--red);overflow:hidden}
  #background-logo{position:absolute;top:0;left:0;width:100%;height:100%;
                   overflow:hidden;pointer-events:none}
  #background-logo img{position:absolute;opacity:.15;top:-4rem;right:-5rem;
                       width:26rem;height:auto}
  @media screen and (max-width:42em){#background-logo img{top:-2rem;right:-6rem;width:19rem}}
  #project-area{position:relative;padding-top:0;padding-bottom:3rem}

  #top-buttons{display:table;margin-bottom:2rem;overflow:hidden;
               border-radius:0 0 .25rem .25rem;font-size:.9375rem;
               box-shadow:0 2px 4px rgba(0,0,0,.25)}
  #top-buttons ul{display:table-cell;margin:0;padding-left:0;background:#fff}
  #top-buttons ul li{display:table-cell;list-style:none;padding:.125rem .75rem;white-space:nowrap}
  #top-buttons ul li a{color:${BODY}}
  #top-buttons #join{display:table-cell;background:var(--purple);
                     padding:.125rem .75rem;white-space:nowrap}
  #top-buttons #join a{color:#fff;font-weight:bold}

  #chapter{display:table-cell;vertical-align:middle}
  #chapter h3{display:inline-block;margin:0;white-space:nowrap;line-height:2.25rem}
  #chapter h3 a{display:block;color:#fff}
  #chapter h3 a:hover{text-decoration:none}
  #logo{float:left;width:2.25rem;height:2.25rem;margin-right:.5rem;line-height:0;
        border-radius:.5rem;background:#fff;padding:.2rem}
  #logo img{width:100%;height:100%;object-fit:contain}

  #desktop-menu{margin-top:1rem}
  #desktop-menu ul{margin:0;padding-left:0;list-style:none}
  #desktop-menu li{display:inline-block;margin-right:1.25rem}
  #desktop-menu li a{color:#fff;font-weight:bold;font-size:.9375rem}

  #page-title,#tagline{position:relative;max-width:70%;margin:2rem 0 0;color:#fff}
  #page-title{font-size:2.25rem;line-height:1.1}
  #tagline{font-size:1.125rem;opacity:.95}
  @media screen and (max-width:42em){#page-title,#tagline{max-width:100%}}

  /* ---- main ---- */
  #main-content{margin:2rem auto;word-wrap:break-word}
  #main-content>:first-child{margin-top:0}
  .note{width:100%;padding:1rem;border:2px solid var(--line);margin:1.5rem 0 2rem;
        background-image:linear-gradient(-180deg,var(--line),#fff 60%)}
  .note>:first-child{margin-top:0}
  .note>:last-child{margin-bottom:0}
  hr{height:4px;border:none;background:var(--line);margin:2rem 0}

  table{border-collapse:collapse;width:100%;margin:1.5rem 0 2rem}
  table,th,td{border:2px solid var(--line)}
  th,td{padding:.5rem 1rem;text-align:left;vertical-align:top}
  th{font-weight:bold;border-bottom:0;
     background-image:linear-gradient(-180deg,var(--line),#fff 100%)}

  /* ---- forms ---- */
  label{display:block;font-weight:bold;font-size:1rem;margin:1.25rem 0 .35rem;color:var(--head)}
  input[type=text],input[type=email],input[type=tel],select,textarea{
    width:100%;padding:.65rem .75rem;font:inherit;font-size:1rem;color:var(--body);
    border:2px solid var(--line);border-radius:.25rem;background:#fff}
  select{appearance:none;background-repeat:no-repeat;background-position:right .75rem center;
    background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath fill='%2367777E' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    padding-right:2.25rem}
  input:focus,select:focus,textarea:focus{outline:2px dashed var(--link);outline-offset:2px;
    border-color:var(--link)}
  .hint{font-size:1rem;color:var(--muted);margin:.35rem 0 0}
  .consent{display:flex;gap:.75rem;align-items:flex-start;margin:1.25rem 0;padding:1rem;
           border:2px solid var(--line);border-left:.3rem solid var(--red)}
  .consent input{margin-top:.3rem;width:1.15rem;height:1.15rem;flex:none;accent-color:var(--red)}
  .consent label{margin:0;font-weight:normal;font-size:1rem;line-height:1.5;color:var(--body)}
  .consent label b{display:block;font-weight:bold;margin-bottom:.25rem;color:var(--head)}
  .btn{display:inline-block;margin-top:1.25rem;padding:.75rem 1.5rem;font:inherit;
       font-size:1rem;font-weight:bold;color:#fff;background:var(--red);border:0;
       cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.25);
       transition:box-shadow .4s cubic-bezier(.25,.8,.25,1)}
  .btn:hover{box-shadow:0 5px 10px rgba(0,0,0,.25);text-decoration:underline}
  .btn:disabled{opacity:.55;cursor:not-allowed}
  .msg{margin-top:1rem;padding:.75rem 1rem;font-size:1rem;display:none;border:2px solid}
  .msg.err{display:block;background:#FBD2D4;color:#8E1116;border-color:#F7A5A9}
  .msg.ok{display:block;background:#E9F7EE;color:#14532D;border-color:#BFE5CD}
  .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}

  /* ---- county status board ---- */
  .county-list{list-style:none;margin:1rem 0 0;padding:0}
  .county-list li{display:flex;align-items:baseline;gap:.6rem;padding:.55rem 0;
                  border-bottom:1px solid var(--line);font-size:1rem}
  .county-list li:last-child{border-bottom:0}
  .county-name{font-weight:bold;color:var(--head);min-width:6.5rem}
  .county-seat{color:var(--muted);font-size:.9375rem;flex:1}
  .pill{font-size:.6875rem;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;
        padding:.2rem .5rem;border-radius:1rem;white-space:nowrap;color:#fff}

  /* ---- footer ---- */
  #site-footer{border-top:1px solid var(--line);margin-top:3rem}
  #footer-content{padding-top:2rem;padding-bottom:4rem;font-size:1rem}
  #footer-content a{margin-right:1.25rem}
  #footer-content .fine{color:var(--muted);font-size:.9375rem;margin-top:1.25rem}
</style>
</head>
<body>
${ann}
<header id="page-header">
  <div id="background-logo"><img src="/assets/logo-reverse.png" alt="" aria-hidden="true"></div>
  <div id="project-area" class="wrap">
    <div id="top-buttons">
      <ul>
        <li><a href="/groups">Local groups</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
      <div id="join"><a href="${NATIONAL_JOIN}">Join DSA</a></div>
    </div>

    <div id="chapter">
      <h3><a href="/"><span id="logo"><img src="/assets/logo.png" alt=""></span>${env.SITE_NAME}</a></h3>
    </div>

    <nav id="desktop-menu">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/groups">Local groups</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy">Privacy</a></li>
        <li><a href="/sms-terms">SMS terms</a></li>
      </ul>
    </nav>

    <h1 id="page-title">${o.headline}</h1>
    ${o.subhead ? `<p id="tagline">${o.subhead}</p>` : ''}
  </div>
</header>

<main id="main-content" class="wrap">${o.body}</main>

<footer id="site-footer"><div id="footer-content" class="wrap">
  <h6>${env.SITE_NAME}</h6>
  <p>
    <a href="/groups">Local groups</a>
    <a href="/contact">Contact</a>
    <a href="/privacy">Privacy Policy</a>
    <a href="/sms-terms">SMS Terms</a>
    <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>
  </p>
  <p class="fine">
    ${env.SITE_NAME} is a shared regional resource for DSA groups in Central Pennsylvania.
    It is not itself a chartered chapter. The mailing list on this site is operated by
    <strong>${env.CHAPTER_NAME}</strong>, ${env.MAILING_ADDRESS}.
  </p>
  <p class="fine">Not authorized by any candidate or candidate&rsquo;s committee.</p>
</div></footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------- home */

export function homePage(env: Env): string {
  const board = COUNTIES.map(
    (c) => `<li>
      <span class="county-name">${c.name}</span>
      <span class="county-seat">${c.seat}</span>
      <span class="pill" style="background:${COUNTY_STATE_COLOR[c.state]}">${COUNTY_STATE_LABEL[c.state]}</span>
    </li>`,
  ).join('');

  return layout(env, {
    title: 'Home',
    desc: `Democratic Socialists of America in Central Pennsylvania. Find your local group in Centre, Clearfield, and surrounding counties, or join the email and text list.`,
    headline: 'Democratic socialists in Central Pennsylvania.',
    subhead:
      'Working people organizing where we live — in Centre County, in Clearfield County, and in the towns in between.',
    body: `
<h2>Where we&rsquo;re organizing</h2>
<p>Central PA is a big area and every county is at a different stage. Here&rsquo;s the honest
   picture right now.</p>

<ul class="county-list">${board}</ul>

<p class="hint" style="margin-top:1rem">
  &ldquo;No group yet&rdquo; is not a brush-off. Clearfield looked exactly like that a few months ago.
  If that&rsquo;s your county, <a href="/contact">get in touch</a> — starting one is a real option
  and there&rsquo;s a whole pipeline for it.
</p>

<div class="note" id="find">
  <h3 style="margin-top:0">Find your county</h3>
  <label for="find_county">Select your county</label>
  <select id="find_county">
    <option value="">Choose…</option>
    ${countyOptions()}
  </select>
  <div id="find_result"></div>
</div>

<h2 id="join">Join the email and text list</h2>
<p>Pick whichever you want — email, text, or both. We&rsquo;ll send you one message to confirm.
   <strong>You are not on a list until you confirm.</strong></p>

<form id="signup" novalidate>
  <label for="name">Name</label>
  <input id="name" name="name" type="text" autocomplete="name" placeholder="Your name">

  <label for="email">Email address</label>
  <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com">

  <label for="phone">Mobile number</label>
  <input id="phone" name="phone" type="tel" autocomplete="tel" placeholder="(814) 555-0123">
  <p class="hint">US mobile numbers only. Landlines can&rsquo;t receive our texts.</p>

  <label for="county">County</label>
  <select id="county" name="county">
    <option value="">Select your county…</option>
    ${countyOptions()}
  </select>

  <label for="zip">ZIP code <span style="font-weight:normal;color:${MUTED}">(optional)</span></label>
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
      See our <a href="/sms-terms">SMS Terms</a> and <a href="/privacy">Privacy Policy</a>.
    </label>
  </div>

  <div class="hp" aria-hidden="true">
    <label for="website">Leave this field empty</label>
    <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
  </div>

  <button type="submit" class="btn" id="submit">Sign me up</button>
  <div class="msg" id="msg" role="status" aria-live="polite"></div>
</form>

<h2>What we&rsquo;ll send you</h2>
<p>Meeting announcements and agendas, event invitations, local campaign updates, and the
   occasional ask to show up somewhere. That&rsquo;s it. We do not sell, rent, trade, or share
   your contact information with anyone — read the <a href="/privacy">Privacy Policy</a>.</p>

<h2>Already signed up and want out?</h2>
<p>Click unsubscribe at the bottom of any email, reply STOP to any text, or email
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a> and we&rsquo;ll remove you.</p>

<script>
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
  var COUNTIES = ${JSON.stringify(COUNTIES)};
  var sel = document.getElementById('find_county');
  var out = document.getElementById('find_result');
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  sel.addEventListener('change', function () {
    var county = sel.value;
    if (!county) { out.innerHTML = ''; return; }
    var meta = COUNTIES.filter(function(c){return c.name === county;})[0];
    var matches = GROUPS.filter(function (g) {
      return g.counties.some(function (c) { return c.toLowerCase() === county.toLowerCase(); });
    });

    if (matches.length) {
      out.innerHTML = '<hr>' + matches.map(function (g) {
        return '<h4 style="margin:0 0 .25rem">' + esc(g.name) + '</h4>'
          + '<h6 style="margin:0 0 .75rem">' + esc(g.status) + '</h6>'
          + '<p style="margin:0 0 .5rem">' + esc(g.blurb) + '</p>'
          + '<p style="margin:0 0 .75rem;font-size:1rem;color:${MUTED}">' + esc(g.note) + '</p>'
          + '<p style="margin:0;font-size:1rem">' + g.links.map(function (l) {
              return '<a href="' + esc(l.href) + '" style="margin-right:1rem">' + esc(l.label) + '</a>';
            }).join('') + '</p>';
      }).join('<hr>');
    } else {
      out.innerHTML = '<hr>'
        + '<h4 style="margin:0 0 .25rem">No group in ' + esc(county) + ' County yet</h4>'
        + '<h6 style="margin:0 0 .75rem">Coming soon, if someone starts it</h6>'
        + '<p style="margin:0 0 .5rem">There may still be a DSA chapter covering you — national '
        + 'keeps the authoritative list. If there isn\\'t one, that\\'s exactly how Clearfield '
        + 'started, and national has a pipeline with staff support for it.</p>'
        + '<p style="margin:0;font-size:1rem">'
        + '<a href="${NATIONAL_ZIP_LOOKUP}" style="margin-right:1rem">Look up by ZIP</a>'
        + '<a href="${NATIONAL_CHAPTER_MAP}" style="margin-right:1rem">National chapter map</a>'
        + '<a href="/contact">Talk to us</a></p>';
    }
  });
})();

(function () {
  var form = document.getElementById('signup');
  var btn  = document.getElementById('submit');
  var msg  = document.getElementById('msg');
  function show(kind, text) { msg.className = 'msg ' + kind; msg.textContent = text; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.className = 'msg';
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
    if (!payload.email_consent && !payload.sms_consent)
      return show('err', 'Please check at least one box so we know how you want to hear from us.');
    if (payload.email_consent && !payload.email.trim())
      return show('err', 'Please enter your email address.');
    if (payload.sms_consent && !payload.phone.trim())
      return show('err', 'Please enter your mobile number.');

    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      var res  = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  const board = COUNTIES.map(
    (c) => `<li>
      <span class="county-name">${c.name}</span>
      <span class="county-seat">${c.seat}</span>
      <span class="pill" style="background:${COUNTY_STATE_COLOR[c.state]}">${COUNTY_STATE_LABEL[c.state]}</span>
    </li>`,
  ).join('');

  return layout(env, {
    title: 'Local groups',
    desc: 'DSA groups organizing across Central Pennsylvania, and what stage each is at.',
    headline: 'Local groups.',
    subhead:
      'Central Pennsylvania is spread out. Here&rsquo;s who&rsquo;s organizing, what stage they&rsquo;re at, and how to reach them.',
    body: `
<h2>County by county</h2>
<ul class="county-list">${board}</ul>

<h2>The groups</h2>
${GROUPS.map(groupCard).join('')}

<h2>Don&rsquo;t see your county?</h2>
<p>We only list groups we can vouch for. DSA national maintains the authoritative directory of
   every chapter in the country — if there&rsquo;s one covering you, it&rsquo;ll be there.</p>
<p>
  <a href="${NATIONAL_ZIP_LOOKUP}" style="margin-right:1.25rem">Look up your ZIP code</a>
  <a href="${NATIONAL_CHAPTER_MAP}">National chapter map</a>
</p>

<h2>There&rsquo;s nothing near me. Now what?</h2>
<p>Start one. That&rsquo;s not a brush-off — it&rsquo;s how the Clearfield County group began, and
   DSA has a whole pipeline for it with staff support. If you&rsquo;re within reach of us,
   <a href="/contact">get in touch</a> and we&rsquo;ll help however we can.</p>
<p>You can also <a href="${NATIONAL_JOIN}">join DSA nationally</a> even if there&rsquo;s no local
   group yet. National knows where its members live, and enough members in one place is exactly
   how a new group gets started.</p>

<h2>What the labels mean</h2>
<table>
  <tr><th>Label</th><th>What it means</th></tr>
  <tr><td><strong>Chartered chapter</strong></td><td>${STATUS_NOTE.chapter}</td></tr>
  <tr><td><strong>Organizing committee</strong></td><td>${STATUS_NOTE.organizing}</td></tr>
  <tr><td><strong>Getting started</strong></td><td>${STATUS_NOTE.forming}</td></tr>
</table>
<p class="hint">We label these honestly rather than making everything sound official. A group
   that&rsquo;s just getting started is often the most useful one to walk into — there&rsquo;s
   more to do and more say in how it&rsquo;s done.</p>`,
  });
}

/* ---------------------------------------------------------------- contact */

export function contactPage(env: Env): string {
  return layout(env, {
    title: 'Contact',
    desc: `Get in touch with ${env.CHAPTER_NAME}.`,
    headline: 'Get in touch.',
    subhead:
      'Questions about who we are, when we meet, or how to get involved — or something happening in your community we should know about.',
    body: `
<div class="note">
  <h3 style="margin-top:0">Send us a message</h3>
  <p style="margin-bottom:0">This does <strong>not</strong> add you to any list. If you want
     meeting announcements, <a href="/#join">sign up here</a> instead.</p>
</div>

<form id="contact" novalidate>
  <label for="c_name">Name</label>
  <input id="c_name" type="text" autocomplete="name" placeholder="Your name">

  <label for="c_email">Email <span style="font-weight:normal;color:${MUTED}">(so we can write back)</span></label>
  <input id="c_email" type="email" autocomplete="email" placeholder="you@example.com">

  <label for="c_phone">Phone <span style="font-weight:normal;color:${MUTED}">(optional)</span></label>
  <input id="c_phone" type="tel" autocomplete="tel" placeholder="(814) 555-0123">
  <p class="hint">Only used to reply to you. Giving it here does not sign you up for texts.</p>

  <label for="c_county">County</label>
  <select id="c_county"><option value="">Select…</option>${countyOptions()}</select>

  <label for="c_topic">What&rsquo;s this about?</label>
  <select id="c_topic">
    <option value="">Select…</option>
    <option>When and where do you meet?</option>
    <option>I want to get involved</option>
    <option>I want to start a group in my county</option>
    <option>An issue in my community</option>
    <option>Media or press</option>
    <option>Remove me from your list</option>
    <option>Something else</option>
  </select>

  <label for="c_body">Message</label>
  <textarea id="c_body" rows="6" placeholder="Tell us what's on your mind."></textarea>

  <div class="hp" aria-hidden="true">
    <label for="c_website">Leave this field empty</label>
    <input id="c_website" type="text" tabindex="-1" autocomplete="off">
  </div>

  <button type="submit" class="btn" id="c_submit">Send message</button>
  <div class="msg" id="c_msg" role="status" aria-live="polite"></div>
</form>

<h2>Other ways to reach us</h2>
<p><strong>Email:</strong> <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a><br>
   <strong>Mail:</strong> ${env.MAILING_ADDRESS}</p>
<p class="hint">We&rsquo;re all volunteers with jobs, so give us a few days.</p>

<script>
(function () {
  var form = document.getElementById('contact');
  var btn  = document.getElementById('c_submit');
  var msg  = document.getElementById('c_msg');
  function show(k,t){msg.className='msg '+k;msg.textContent=t;}
  form.addEventListener('submit', async function (e) {
    e.preventDefault(); msg.className = 'msg';
    var p = {
      name: document.getElementById('c_name').value,
      email: document.getElementById('c_email').value,
      phone: document.getElementById('c_phone').value,
      county: document.getElementById('c_county').value,
      topic: document.getElementById('c_topic').value,
      body: document.getElementById('c_body').value,
      website: document.getElementById('c_website').value
    };
    if (!p.body.trim()) return show('err','Please write a message so we know what you need.');
    if (!p.email.trim() && !p.phone.trim())
      return show('err','Please leave an email or a phone number so we can write back.');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      var res = await fetch('/api/contact', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p)});
      var d = await res.json();
      if (res.ok) { show('ok', d.message); form.reset(); }
      else { show('err', d.error || 'Something went wrong.'); }
    } catch (err) { show('err','Could not reach the server. Email ${env.CONTACT_EMAIL} instead.'); }
    finally { btn.disabled = false; btn.textContent = 'Send message'; }
  });
})();
</script>`,
  });
}

/* -------------------------------------------------------------- SMS terms */

export function smsTermsPage(env: Env): string {
  return layout(env, {
    title: 'SMS Terms',
    desc: `Terms and conditions for the ${env.CHAPTER_NAME} SMS messaging program.`,
    headline: 'SMS Terms &amp; Conditions',
    subhead: 'Last updated: August 5, 2026',
    body: `
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
   your mobile carrier may charge you according to your plan.</p>

<h3>How to opt out</h3>
<p>Reply <strong>STOP</strong> to any message at any time. You will receive one final message
   confirming you have been unsubscribed, and then no further messages. You can also email
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>. To rejoin later, reply
   <strong>START</strong> or sign up again on our website.</p>

<h3>How to get help</h3>
<p>Reply <strong>HELP</strong> to any message, or email
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
<p>We do not sell, rent, trade, or share your mobile number with third parties for their own
   marketing purposes. Mobile opt-in data and consent records are never shared with third parties
   for marketing. See our <a href="/privacy">Privacy Policy</a>.</p>

<h3>Changes</h3>
<p>The current version always lives at
   <a href="${env.SITE_URL}/sms-terms">${env.SITE_URL}/sms-terms</a>.</p>

<h3>Contact</h3>
<p>${env.CHAPTER_NAME}<br>${env.MAILING_ADDRESS}<br>
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a></p>`,
  });
}

/* ---------------------------------------------------------------- privacy */

export function privacyPage(env: Env): string {
  return layout(env, {
    title: 'Privacy Policy',
    desc: `How ${env.CHAPTER_NAME} collects, uses, and protects your contact information.`,
    headline: 'Privacy Policy',
    subhead: 'Last updated: August 5, 2026',
    body: `
<p>${env.CHAPTER_NAME} runs an email and text message list so members and supporters know when
   things are happening. This policy explains exactly what we collect, why, and what we will
   never do with it.</p>

<div class="note">
  <h4 style="margin-top:0">The short version</h4>
  <p style="margin-bottom:0">We collect your name, email, mobile number, and county, only if you
     give them to us. We use them to send you chapter announcements. We do not sell, rent, trade,
     or share your information with anyone outside the chapter. You can leave at any time and we
     delete your data on request.</p>
</div>

<h3>What we collect</h3>
<table>
  <tr><th>Data</th><th>Why we collect it</th></tr>
  <tr><td>Name</td><td>So messages are addressed to a person, and so we can find your record if you ask us to.</td></tr>
  <tr><td>Email address</td><td>To send chapter emails, if you opted in to email.</td></tr>
  <tr><td>Mobile number</td><td>To send chapter texts, if you opted in to texts.</td></tr>
  <tr><td>County and ZIP</td><td>To tell you about organizing happening near you rather than across the region.</td></tr>
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
   sending chapter messages.</p>

<h3>Service providers</h3>
<table>
  <tr><th>Provider</th><th>What they handle</th></tr>
  <tr><td>Twilio</td><td>Sends and receives text messages.</td></tr>
  <tr><td>Resend</td><td>Sends emails.</td></tr>
  <tr><td>Cloudflare</td><td>Hosts this website and stores the contact database.</td></tr>
</table>

<h3>How long we keep it</h3>
<p>We keep your contact record while you are on the list. If you unsubscribe, we keep a minimal
   record so that we do not accidentally message you again, and so we can show carriers we
   honored your opt-out. Ask us to delete everything and we will, except where a consent or
   opt-out record must be retained to comply with telecom rules.</p>

<h3>Your choices</h3>
<ul>
  <li><strong>Leave the email list:</strong> click unsubscribe at the bottom of any email.</li>
  <li><strong>Leave the text list:</strong> reply STOP to any text.</li>
  <li><strong>See, correct, or delete what we have:</strong> email
      <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a>.</li>
</ul>

<h3>Security</h3>
<p>The site is served over HTTPS. The contact database is not publicly accessible and
   administrative access requires a secret token held by chapter communications volunteers.
   We will notify affected people promptly if we ever learn of a breach.</p>

<h3>Children</h3>
<p>This list is not directed to children under 13 and we do not knowingly collect their
   information.</p>

<h3>Changes to this policy</h3>
<p>If we make a material change we will post the updated policy here with a new date.</p>

<h3>Contact</h3>
<p>${env.CHAPTER_NAME}<br>${env.MAILING_ADDRESS}<br>
   <a href="mailto:${env.CONTACT_EMAIL}">${env.CONTACT_EMAIL}</a></p>`,
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
    headline: opts.heading,
    body: `
<p style="font-size:1.125rem">${opts.body}</p>
<p><a class="btn" href="/">Back to ${env.SITE_NAME}</a></p>`,
  });
}

export function notFoundPage(env: Env): string {
  return resultPage(env, {
    title: 'Not found',
    glyph: '',
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
${env.MAILING_ADDRESS}
${env.CONTACT_EMAIL}
${env.SITE_URL}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fff;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:${BODY}">
<div style="max-width:560px;margin:0 auto">
  <div style="background:${RED};padding:24px 30px">
    <div style="color:#fff;font-weight:bold;font-size:19px">${env.SITE_NAME}</div>
  </div>
  <div style="padding:30px;border:1px solid ${LINE};border-top:0">
    <p style="margin:0 0 16px">${hi}</p>
    <p style="margin:0 0 16px">Someone (we hope you) signed up for <strong>${env.CHAPTER_NAME}</strong>
       updates using this email address.</p>
    <p style="margin:0 0 26px">
      <a href="${opts.confirmUrl}" style="display:inline-block;background:${RED};color:#fff;
         text-decoration:none;padding:13px 28px;font-weight:bold">Confirm my signup</a>
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:${MUTED}">
      Or paste this into your browser:<br>
      <a href="${opts.confirmUrl}" style="color:${LINK};word-break:break-all">${opts.confirmUrl}</a>
    </p>
    <p style="margin:22px 0 0;font-size:14px;color:${MUTED}">
      This link expires in 7 days. If you didn&rsquo;t sign up, ignore this email.
    </p>
  </div>
  <p style="font-size:13px;color:${MUTED};text-align:center;margin:18px 0 0">
    ${env.CHAPTER_NAME} &middot; ${env.MAILING_ADDRESS}<br>
    <a href="${env.SITE_URL}/privacy" style="color:${MUTED}">Privacy</a>
  </p>
</div></body></html>`,
  };
}

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

Want texts too? Once you confirm, add your mobile number at ${env.SITE_URL}.
We are not adding anyone's phone number to the text list without them asking for it.

${env.CHAPTER_NAME}
${env.MAILING_ADDRESS}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fff;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:${BODY}">
<div style="max-width:560px;margin:0 auto">
  <div style="background:${RED};padding:24px 30px">
    <div style="color:#fff;font-weight:bold;font-size:19px">${env.SITE_NAME}</div>
  </div>
  <div style="padding:30px;border:1px solid ${LINE};border-top:0">
    <p style="margin:0 0 16px">${hi}</p>
    <p style="margin:0 0 16px">You&rsquo;re on the <strong>${env.CHAPTER_NAME}</strong> contact list
       because you signed up at a meeting or event.</p>
    <p style="margin:0 0 26px">We&rsquo;re moving to a proper system with real unsubscribe links,
       and we&rsquo;re asking everyone to confirm rather than assuming.</p>
    <p style="margin:0 0 26px">
      <a href="${opts.confirmUrl}" style="display:inline-block;background:${RED};color:#fff;
         text-decoration:none;padding:13px 28px;font-weight:bold">Yes, keep me on the list</a>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:${MUTED}">
      If you don&rsquo;t click, you&rsquo;ll stop hearing from us. No hard feelings.
    </p>
    <p style="margin:0;padding-top:18px;border-top:1px solid ${LINE};font-size:14px;color:${MUTED}">
      <strong style="color:${HEAD}">Want texts too?</strong> Once you confirm, add your mobile
      number at <a href="${env.SITE_URL}" style="color:${LINK}">${env.SITE_URL}</a>. We are not
      adding anyone&rsquo;s phone number to the text list without them asking.
    </p>
  </div>
  <p style="font-size:13px;color:${MUTED};text-align:center;margin:18px 0 0">
    ${env.CHAPTER_NAME} &middot; ${env.MAILING_ADDRESS}<br>
    <a href="${env.SITE_URL}/privacy" style="color:${MUTED}">Privacy</a>
  </p>
</div></body></html>`,
  };
}
