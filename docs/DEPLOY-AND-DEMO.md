# Deploy and demo runbook

Everything here is copy-paste. Budget **20 minutes** if the domain is already in
Cloudflare, **10 minutes** if you're demoing on the free `workers.dev` URL.

---

## Step 0 — Push to GitHub (5 min)

The repo is initialized and the first commit is staged locally. I verified nothing
sensitive is in it: no `.env`, no `.dev.vars`, no spreadsheets, no local database, no
`node_modules`. Confirm for yourself before pushing:

```bash
git log --stat -1 | head -40      # what's in the commit
git ls-files | grep -iE "env|xlsx|csv"   # should print only .env.example
```

Then, replacing `YOUR-ORG` and `REPO`:

```bash
git branch -M main
git remote add origin https://github.com/YOUR-ORG/REPO.git
git push -u origin main
```

If GitHub rejects the push because the repo already has a README or license from
initialization, either create the repo empty, or:

```bash
git pull --rebase origin main
git push -u origin main
```

> **If you ever accidentally commit `.env`:** rotate the Twilio and Resend keys
> immediately. Removing the file in a later commit does not remove it from history, and
> the keys in your `.env` are live.

---

## Step 1 — Database (3 min)

Run once against the real database. The first file removes the stale table the original
prototype left behind; without it the schema fails with `no such column: email_status`.

```bash
npx wrangler login

npx wrangler d1 execute dsa-list-db --remote --file=./migrations/000_drop_prototype_table.sql
npx wrangler d1 execute dsa-list-db --remote --file=./schema.sql
npx wrangler d1 execute dsa-list-db --remote --file=./migrations/001_add_contact_and_county.sql
```

Verify:

```bash
npx wrangler d1 execute dsa-list-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expect: `consent_events`, `messages`, `rate_limits`, `subscribers`, `tokens`.

---

## Step 2 — Secrets (3 min)

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put ADMIN_TOKEN        # generate: openssl rand -hex 32
```

Values are in your local `.env`. **Save the `ADMIN_TOKEN` in a password manager** — it's
the only thing protecting the member list export, and you'll want to hand a copy to
whoever becomes second admin.

For the demo you can skip the Twilio secrets. Email confirmation needs Resend; without a
verified sending domain the emails won't deliver, which is fine for a demo — see the
demo script below for how to handle that.

---

## Step 3 — Deploy

```bash
npm install
npm run typecheck      # must pass clean
npm run deploy
```

Wrangler prints a `https://dsa-central-pa.<your-subdomain>.workers.dev` URL. **That URL
works immediately and needs no DNS.** Open it and click through — this is your guaranteed
demo fallback.

---

## Step 4 — Custom domain (only if dsacentralpa.org is already in Cloudflare)

Uncomment the `[[routes]]` block in `wrangler.toml`, then:

```bash
npm run deploy
```

Or do it in the dashboard: **Workers & Pages → dsa-central-pa → Settings → Domains &
Routes → Add custom domain**. That route is usually live in under a minute.

**If the domain is registered somewhere else,** you need to point its nameservers at
Cloudflare first. That can take anywhere from 15 minutes to 24 hours, and it is *not*
something to attempt the morning of a meeting. Demo on `workers.dev` and move the domain
afterward.

### Decision tree for tomorrow

| Situation | What to do |
|---|---|
| Domain in Cloudflare already | Do step 4. Demo on the real domain. |
| Domain at another registrar | Start the nameserver change now, demo on `workers.dev` |
| Don't own the domain yet | Demo on `workers.dev`, buy the domain after the vote |

Nobody in the room will care about the URL. They'll care that it works.

---

## Step 5 — Twilio webhook (skip for the demo)

Only needed once you're actually texting. Console → Phone Numbers → your number →
Messaging → "A message comes in":

```
https://dsacentralpa.org/api/sms      HTTP POST
```

Without this, YES / STOP / START replies never reach the database.

---

## Pre-meeting checklist

Run through this the night before, not five minutes before.

- [ ] Site loads over HTTPS
- [ ] `/` `/groups` `/contact` `/privacy` `/sms-terms` all load
- [ ] County finder returns Centre County DSA for Centre, our group for Clearfield, and the national map for somewhere like Blair
- [ ] Submitting the signup form returns the green confirmation message
- [ ] `curl -H "Authorization: Bearer $ADMIN_TOKEN" https://YOURSITE/api/admin/stats` returns counts
- [ ] Site loads on your **phone over cellular, not wifi** — this is the actual test
- [ ] Screenshots saved in case the venue has no internet

---

## Demo script (4 minutes)

Have the site open on your phone and mirrored or passed around. Don't narrate the code.

**1. "Here's what someone in the county sees."** Load the homepage. Point out it loads
instantly — under 15 KB, no tracking, works on bad rural signal.

**2. "First thing it does is find their group."** Pick **Centre** in the county dropdown —
Centre County DSA comes up, marked *Chartered chapter*. Pick **Clearfield** — our group,
marked *Getting started*. Pick **Blair** — it hands them off to DSA's national chapter map
instead of pretending we cover them.

> "That's the part I'd point at. The site doesn't claim we're something we're not, and it
> doesn't try to capture people who belong somewhere else. Someone in Altoona gets sent to
> whoever actually organizes Altoona."

**3. "Then they can join."** Scroll to the signup form. Show the **two separate unchecked
boxes** — one for email, one for texts.

> "Those are separate and unchecked on purpose. Checking one doesn't check the other, and
> the text one carries the disclosure the carriers require. This is the difference between
> a list we can defend and a number that gets blocked."

**4. Submit it with your own email.** Show the confirmation message. If Resend isn't
configured yet, say so plainly — "the confirmation email needs the domain verified, which
happens after we own it" — and show the database row instead.

**5. "And nothing here is hidden."** Open `/privacy`. Point at the no-selling, no-sharing,
no-tracking commitments. Then the footer: it says in plain text that this site is a
regional resource, not a chartered chapter, and names which group holds the list.

**Close:**

> "It costs about eleven dollars a year to run. The code's on GitHub so it isn't locked in
> my head, and I'd like a second person to have the keys."

---

## If something breaks mid-demo

- **Site won't load** → use the screenshots. Don't debug in front of people.
- **Form errors** → you may have hit the rate limit (8 per hour per IP) from testing. Say so; it's a feature.
- **Confirmation email doesn't arrive** → expected until the sending domain is verified in Resend. Show the database row instead: `npx wrangler d1 execute dsa-list-db --remote --command "SELECT email, email_status FROM subscribers ORDER BY created_at DESC LIMIT 3"`

---

## After the meeting

1. Add the second admin — share `ADMIN_TOKEN` and Cloudflare access
2. Verify the sending domain in Resend so confirmation emails deliver
3. Import and re-permission the existing list (`scripts/import_list.py plan`)
4. Send the national approval packet (`docs/NATIONAL-APPROVAL.md`)
5. Only after national signs off on the name: register the A2P campaign
