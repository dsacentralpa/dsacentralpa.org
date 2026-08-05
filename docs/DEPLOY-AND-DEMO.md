# Deploy and demo runbook

Everything here is copy-paste. Budget **20 minutes** if the domain is already in
Cloudflare, **10 minutes** if you're demoing on the free `workers.dev` URL.

---

## First: GitHub and Cloudflare are two separate things

Worth being explicit, because the words get mixed up:

| Command | Sends code to | Effect on the live site |
|---|---|---|
| `git push` | **GitHub** | None. Backup and collaboration only. |
| `npm run deploy` (wrangler) | **Cloudflare** | This is what makes the site live. |

They're independent. You can push to GitHub a dozen times and the site won't change; you
can deploy without ever pushing. **Wrangler cannot deploy to GitHub** — different systems.

There *is* a third option — Cloudflare Workers Builds watches a GitHub repo and
auto-deploys on every push — but you chose manual deploys, which is the right call for
now: a bad push can't take the site down, and Cloudflare never needs access to your repo.
If you want it later it's in the Cloudflare dashboard under the worker's **Builds** tab.

---

## Step 0 — Push to GitHub (5 min)

### Run the safety check first

```bash
bash scripts/pre-push-check.sh
```

It verifies no `.env`, no `.dev.vars`, no spreadsheets, no local database, no API keys in
file contents, no personal email addresses, and that commit authors are clean. It exits
non-zero and refuses to bless the push if anything fails. Currently: **all clear.**

Make it automatic so you can't forget:

```bash
cp scripts/pre-push-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

### What's public and what isn't

I split the documents. Anything naming a real person or containing carrier-registration
details is now in **`private/`**, which is gitignored:

| Stays local (`private/`) | Goes public (`docs/`) |
|---|---|
| `MEETING-NOTES.md` | `BUDGET-AND-OPTIONS.md` |
| `CHAPTER-MEMO.md` | `DSA-STRUCTURE-AND-COMPLIANCE.md` |
| `NATIONAL-APPROVAL.md` | `RURAL-OUTREACH.md` |
| `TWILIO-CAMPAIGN-REQUEST.md` | `DEPLOY-AND-DEMO.md` |

The private four contain your legal name, your PSU email, and the personal details used
for Sole Proprietor registration. You still have them on disk — they just don't leave your
machine. The public four are genuinely useful to other DSA groups.

### Push

Replacing `YOUR-ORG` and `REPO`:

```bash
git branch -M main
git remote add origin https://github.com/YOUR-ORG/REPO.git
git push -u origin main
```

If GitHub rejects it because you created the repo with a README or license, either
recreate it empty or:

```bash
git pull --rebase origin main
git push -u origin main
```

### Commit identity

Commits are authored as **`Central PA DSA <info@dsacentralpa.org>`**, not your personal
name and PSU address. That matters more than it sounds: git history is permanent, and once
someone forks the repo you cannot retract it. It also frames this as chapter
infrastructure rather than your personal project.

Check GitHub's own setting too — **Settings → Emails → Keep my email address private** —
so anything you do through the web UI doesn't leak your account email.

### Rewriting author history

Only if a personal address slips into a commit. **Do this before pushing**; after pushing
it requires a force-push and anyone who cloned still has the old history.

```bash
# most recent commit only
git commit --amend --reset-author --no-edit

# every commit (destructive — make a backup branch first)
git filter-branch --env-filter '
  export GIT_AUTHOR_NAME="Central PA DSA"
  export GIT_AUTHOR_EMAIL="info@dsacentralpa.org"
  export GIT_COMMITTER_NAME="Central PA DSA"
  export GIT_COMMITTER_EMAIL="info@dsacentralpa.org"
' -- --all
```

> **If you ever commit `.env`:** rotate the Twilio and Resend keys immediately, before
> anything else. Deleting the file in a later commit does **not** remove it from history —
> the keys stay readable forever in the object store, and the ones in your `.env` are live.

### Public or private repo?

Nothing in the tracked files is secret — the keys live in `wrangler secret`, and the
`database_id` in `wrangler.toml` is a resource identifier, useless without your account
credentials. Public is defensible and lets other chapters reuse the work.

That said, **starting private and flipping to public after the chapter agrees** costs
nothing and avoids presenting the group with a decision already made. Flipping private →
public is one click; public → private doesn't un-ring the bell.

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

## Step 4.5 — Email DNS: the conflict you're about to hit

You've set up **Cloudflare Email Routing** so mail to `info@dsacentralpa.org` forwards to
you. That's *receiving*. Resend does *sending*. They are different systems and they both
want DNS records on the same domain.

**The trap: a domain may have only ONE SPF record.** Cloudflare Email Routing puts an SPF
TXT record on the root (`v=spf1 include:_spf.mx.cloudflare.net ~all`). If Resend adds a
second SPF record on the root, receiving mail servers see two, throw a permanent error, and
your confirmation emails start landing in spam or bouncing. Two valid records are worse
than one wrong one.

Two ways out. Pick one before you verify the domain in Resend.

### Option A — Verify a subdomain in Resend (simplest, no conflict)

Verify `send.dsacentralpa.org` instead of the root. Resend puts its MX and SPF on that
subdomain, so it never touches the root and Email Routing is undisturbed.

The catch: you then send **from** an address on that subdomain. Update `wrangler.toml`:

```toml
FROM_EMAIL = "Clearfield County DSA <info@send.dsacentralpa.org>"
```

Set the reply-to to `info@dsacentralpa.org` so replies still reach your forwarding, and
recipients mostly see the display name anyway.

### Option B — Verify the root domain, merge the SPF records (nicer from-address)

Keeps `info@dsacentralpa.org` as the sender, which looks more legitimate to someone
deciding whether to trust a political email. Requires care: **delete the two separate SPF
records and create one** combining both includes.

```
Type: TXT   Name: @   Content: v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all
```

Then add Resend's DKIM record (selector `resend._domainkey`) as given.

I'd take Option B for a public-facing org — the address matters — but only if you're
comfortable editing SPF by hand. If not, Option A is genuinely fine.

### The mistake almost everyone makes

When pasting Resend's records into Cloudflare DNS, **omit the domain from the Name field.**
Enter `send`, not `send.dsacentralpa.org`. Cloudflare appends the zone automatically, so
the full name becomes `send.dsacentralpa.org.dsacentralpa.org` and nothing verifies. Same
for `resend._domainkey`.

### Verify it worked

```bash
dig +short TXT dsacentralpa.org           # exactly ONE v=spf1 line
dig +short MX  dsacentralpa.org           # Cloudflare Email Routing
dig +short TXT resend._domainkey.dsacentralpa.org
```

Resend's dashboard shows the authoritative record list for your account — trust it over
this document if they disagree. Records typically verify within minutes on Cloudflare.

**Until the domain verifies in Resend, confirmation emails will not deliver.** That's fine
for tomorrow's demo — see the demo script for how to handle it.

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
