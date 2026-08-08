# Configuration reference

## Variables — `wrangler.toml`

Public. Present in the deployed bundle; never place credentials here.

| Variable | Purpose |
|---|---|
| `SITE_URL` | Absolute base URL. Used to build confirmation and unsubscribe links and to verify Twilio webhook signatures. |
| `SITE_NAME` | The website's name. See [`NAMING.md`](NAMING.md). |
| `CHAPTER_NAME` | The group operating the list. Named in the privacy policy and SMS terms as responsible for the data. |
| `CONTACT_EMAIL` | Public contact address; receives contact-form notifications. |
| `FROM_EMAIL` | Envelope sender. Its domain must be verified with the email provider. |
| `MAILING_ADDRESS` | Postal address for commercial email. Omitted from the site while it contains a placeholder; bulk sending is refused. |
| `TWILIO_PHONE_NUMBER` | Sending number. Superseded by a Messaging Service once one is configured. |
| `CONSENT_VERSION` | Identifier for the current consent wording. **Increment whenever that wording changes.** |

## Secrets — `wrangler secret put`

Stored by Cloudflare, never in the repository or in CI configuration.

| Secret | Purpose | Required |
|---|---|---|
| `RESEND_API_KEY` | Email delivery | Yes |
| `ADMIN_TOKEN` | Bearer token for `/api/admin/*` | Yes |
| `TWILIO_ACCOUNT_SID` | SMS delivery | For SMS |
| `TWILIO_AUTH_TOKEN` | SMS delivery and webhook signature verification | For SMS |
| `TWILIO_MESSAGING_SERVICE_SID` | Routes sends through a Messaging Service | After A2P approval |

Secrets take effect on the next deploy. `npm run deploy` is required after setting one.

For local development, place equivalents in `.dev.vars` (git-ignored). See `.env.example`.

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — | Landing page, county finder, signup form |
| GET | `/groups`, `/chapters` | — | Group directory |
| GET | `/updates`, `/news` | — | Announcements, newsletter archive |
| GET | `/resources` | — | Reference links |
| GET | `/how-it-works`, `/about` | — | Status statement, membership explanation |
| GET | `/contact` | — | Contact form |
| GET | `/privacy` | — | Privacy policy |
| GET | `/sms-terms`, `/terms`, `/sms` | — | SMS programme terms |
| GET | `/confirm?token=` | Token | Email confirmation |
| GET | `/unsubscribe?token=` | Token | Email opt-out |
| GET | `/assets/*` | — | Images, cached one year, immutable |
| GET | `/health` | — | Liveness check |
| POST | `/api/subscribe` | — | Signup; begins double opt-in |
| POST | `/api/contact` | — | Contact form |
| POST | `/api/sms` | Signature | Twilio inbound webhook |
| GET | `/api/admin/stats` | Bearer | Subscriber counts |
| GET | `/api/admin/export` | Bearer | CSV export |
| GET | `/api/admin/messages` | Bearer | Contact submissions |
| GET | `/api/admin/diagnostics` | Bearer | Configuration and delivery status |
| POST | `/api/admin/test-email` | Bearer | Sends one message using the live template |

Admin endpoints fail closed: if `ADMIN_TOKEN` is unset, all requests are rejected.

## Schema

Applied via `schema.sql`, then migrations in `migrations/` in order.

**`subscribers`** — one row per person. `email` and `phone` are unique where present.
`email_status` and `phone_status` are independent (`none`, `pending`, `confirmed`,
`unsubscribed`, `bounced`), so a person may be confirmed on one channel and not the other.
Also stores name, county, ZIP, consent IP, user agent, source, and `consent_version`.

**`consent_events`** — append-only audit log. Never updated or deleted. See
[`CONSENT.md`](CONSENT.md).

**`tokens`** — single-use `confirm_email` tokens expiring after 7 days, and long-lived
reusable `unsubscribe_email` tokens. Expired unused tokens are pruned automatically.

**`messages`** — contact form submissions. Kept separate from `subscribers`: submitting the
contact form does not subscribe anyone.

**`rate_limits`** — fixed-window counters. Pruned automatically.

## Migrations

`000_drop_prototype_table.sql` removes a table left by an early prototype and is required
only for that original deployment. **New instances should skip it** — it drops
`subscribers`.

`001_add_contact_and_county.sql` adds the `messages` table and the county column. Additive
and safe on a populated database.

## Content

| File | Contents |
|---|---|
| `src/announcements.ts` | Announcements and newsletter entries. Setting `pinned: true` renders a site-wide banner. |
| `src/groups.ts` | County list and group directory. Editing constraints are documented in the file header. |
| `src/pages.ts` | All page and email copy. |

Consent wording in `src/pages.ts` and the published policies should not be modified without
also incrementing `CONSENT_VERSION`.
