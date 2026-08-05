# Central PA DSA — regional site, email list, SMS opt-in

One Cloudflare Worker serving `dsacentralpa.org`: a regional front door for DSA groups in
Central Pennsylvania, plus the signup form, privacy policy, SMS terms, contact form, and
the API behind all of it. Contacts live in Cloudflare D1. Email goes through Resend, texts
through Twilio.

Two design decisions worth knowing before you change anything:

**The site and the list are different things.** `SITE_NAME` ("Central PA DSA") is a shared
regional resource that routes people to whichever group covers them. `CHAPTER_NAME`
("Clearfield County DSA") is the group that operates the mailing list and is named in the
privacy policy and SMS terms as legally responsible for the data. Keeping these separate is
what lets a broad regional domain be honest about a group that isn't chartered. See
`docs/DSA-STRUCTURE-AND-COMPLIANCE.md`.

**Double opt-in on both channels.** Nobody is on a list until they click a link or reply
YES, and every consent is logged append-only with timestamp, IP, and the exact wording
shown. Carriers can ask you to prove consent, and "we had a clipboard" is not an answer.

```
├── src/
│   ├── worker.ts       router + API
│   ├── pages.ts        every HTML page and email template
│   ├── groups.ts       regional group directory — read the rules at the top
│   └── lib.ts          validation, tokens, Resend/Twilio, signature checks
├── schema.sql          D1 schema
├── migrations/         run in order; 000 is one-time, read before running
├── scripts/
│   └── import_list.py  spreadsheet → SQL + re-permission emails
├── docs/                               public — safe to publish, reusable by other groups
│   ├── DEPLOY-AND-DEMO.md              deploy runbook + demo script
│   ├── BUDGET-AND-OPTIONS.md           costs and alternatives
│   ├── DSA-STRUCTURE-AND-COMPLIANCE.md governance + compliance checklist
│   └── RURAL-OUTREACH.md               rural outreach plan
└── private/                            gitignored — names real people, never push
    ├── MEETING-NOTES.md                chapter meeting talking points
    ├── CHAPTER-MEMO.md                 one-pager for the membership
    ├── NATIONAL-APPROVAL.md            message to send the Field Organizer
    └── TWILIO-CAMPAIGN-REQUEST.md      A2P fields incl. personal registration details
```

## Before you push

```bash
bash scripts/pre-push-check.sh
```

Refuses to bless a push if any secret, member spreadsheet, local database, personal email
address, or unclean commit author is tracked. Install it as a hook so you can't forget:

```bash
cp scripts/pre-push-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

Commits are authored as `Central PA DSA <info@dsacentralpa.org>` rather than a personal
name and address. Git history is permanent once forked — keep it that way.

## Routes

| Route | Purpose |
|---|---|
| `GET /` | Landing page, county finder, signup form |
| `GET /groups` | Regional group directory with honest status labels |
| `GET /contact` | Contact form — does **not** add anyone to a list |
| `GET /privacy` | Privacy policy |
| `GET /sms-terms` | SMS terms — carriers check this URL |
| `POST /api/subscribe` | Signup target; starts double opt-in |
| `POST /api/contact` | Contact form target |
| `GET /confirm?token=` | Email confirmation link |
| `GET /unsubscribe?token=` | One-click email unsubscribe |
| `POST /api/sms` | Twilio inbound webhook — YES / STOP / START / HELP |
| `GET /api/admin/stats` | Counts (Bearer `ADMIN_TOKEN`) |
| `GET /api/admin/export` | CSV of the list (Bearer `ADMIN_TOKEN`) |
| `GET /api/admin/messages` | Contact form submissions (Bearer `ADMIN_TOKEN`) |

---

## Deploy

### 1. Install

```bash
npm install
npx wrangler login
```

### 2. Database

The first prototype left a stale 4-column `subscribers` table behind. It has to go before
the real schema will apply, or you'll get `no such column: email_status`.

```bash
npx wrangler d1 execute dsa-list-db --remote --file=./migrations/000_drop_prototype_table.sql
npx wrangler d1 execute dsa-list-db --remote --file=./schema.sql
```

> Only ever run `000_drop_prototype_table.sql` on a database that has no real members in
> it. Once the list is live, that file deletes the list. Check with `npm run db:stats` first.

### 3. Secrets

Never put these in `wrangler.toml` — it ships to the edge in plaintext.

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put ADMIN_TOKEN        # e.g. openssl rand -hex 32
# after the A2P campaign is approved:
npx wrangler secret put TWILIO_MESSAGING_SERVICE_SID
```

### 4. Domain

Add `dsacentralpa.org` to this Cloudflare account, then uncomment the `[[routes]]` block
in `wrangler.toml`. Until then the worker answers on its `*.workers.dev` URL, which is
fine for testing but **not** for the Twilio campaign — carriers screenshot the real domain.

### 5. Verify DNS for Resend

Add the DKIM/SPF records Resend gives you for `dsacentralpa.org`. Without them the
confirmation emails land in spam and the whole thing looks broken.

### 6. Ship

```bash
npm run typecheck
npm run deploy
```

Then open the site and check `/`, `/privacy`, and `/sms-terms` all load. The campaign
review will screenshot them.

### 7. Twilio inbound webhook

Console → Phone Numbers → your number → Messaging → "A message comes in":

```
https://dsacentralpa.org/api/sms      HTTP POST
```

Without this, YES/STOP/START replies never reach the database and the SMS list can't work.

---

## Importing the existing spreadsheet

`scripts/import_list.py` replaces the old `migrate.py`, which pushed all 43 phone numbers
straight into Twilio. See `docs/CHAPTER-MEMO.md` for why that's the wrong move.

```bash
pip install pandas openpyxl requests python-dotenv

# 1. Clean the spreadsheet, see what it found. Sends nothing, writes nothing to the DB.
python scripts/import_list.py plan

# 2. Load into D1 (inspect build/import.sql first if you like)
npx wrangler d1 execute dsa-list-db --remote --file=./build/import.sql

# 3. Test on yourself, then send for real
python scripts/import_list.py send --limit 3 --live
python scripts/import_list.py send --live
```

Current numbers from `contact_list.xlsx`: **63 usable records, 43 with email, 43 with
phone.** Emails import as `pending` and get one re-permission email. Phones import with
`phone_status='none'` — stored as reference data, on no list, texted by nobody.

---

## Day-to-day

```bash
npm run dev                 # local server on :8787 with a local D1
npm run db:stats            # how many confirmed / pending / unsubscribed
npm run tail                # live production logs

# export the confirmed list
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://dsacentralpa.org/api/admin/export -o list.csv
```

For local dev, put fake secrets in `.dev.vars` (gitignored) — see `.env.example`.

---

## Things that will bite you

**The consent log is append-only.** Never `UPDATE` or `DELETE` from `consent_events`. It's
the evidence that people opted in. If someone asks to be forgotten, clear their row in
`subscribers` and leave the events.

**Bump `CONSENT_VERSION` whenever the checkbox wording changes** (in `wrangler.toml`). Each
opt-in records the version it agreed to, so you can tell which language a given person saw.

**A previously-unsubscribed number can't be re-added from the web form.** They have to text
START themselves. This is deliberate; the code handles it and tells them so.

**Sole Prop campaigns allow exactly one phone number.** If the Messaging Service holds
several, Twilio picks one at random and the others aren't verified routes.

**Never commit the spreadsheets or `build/`.** `.gitignore` covers `*.xlsx` and `*.csv`
already. Real people's phone numbers should not end up in git history.

---

## About `dsa-backend/`

That folder is a half-started Express + Prisma + SQLite version of the same idea —
dependencies installed, no code written. It's superseded by this worker and nothing here
imports from it. Left in place rather than deleted so nothing is lost; safe to remove once
you're confident in this build.

---

## Status

| Piece | State |
|---|---|
| Landing page, privacy, SMS terms | Done |
| Double opt-in, email + SMS | Done, tested locally |
| Consent audit log | Done |
| Twilio webhook w/ signature validation | Done — needs the webhook URL set in console |
| Admin stats + CSV export | Done |
| Spreadsheet import + re-permission | Done, dry-run verified against the real file |
| Deployed to dsacentralpa.org | **Not yet — step 4 above** |
| A2P campaign submitted | **Not yet — see `docs/TWILIO-CAMPAIGN-REQUEST.md`** |
| Second admin key holder | **Not yet — chapter decision** |
