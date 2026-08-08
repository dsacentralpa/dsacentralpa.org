# Setup

Deploying an instance for another group. Configuration reference is in
[`CONFIGURATION.md`](CONFIGURATION.md).

Approximate cost: a domain (~$11/year). Hosting, database, and email delivery fall within
free tiers at the volumes a local group generates.

**If you need only a website and not a mailing list**, use
[Chicago DSA's Haymarket theme](https://github.com/ChicagoDSA/haymarket) instead. It is a
static Jekyll theme requiring no server. This project exists because a list with stored
consent records requires one.

## Prerequisites

A domain, a Cloudflare account, a [Resend](https://resend.com) account, and Node 22+.
Twilio is required only for SMS and can be added later.

## 1. Clone and configure

```bash
git clone https://github.com/YOUR-ORG/YOUR-REPO.git
cd YOUR-REPO
npm install
```

Edit `wrangler.toml` — worker name, database name, and the `[vars]` block. See
[`CONFIGURATION.md`](CONFIGURATION.md) for each variable.

Then edit `src/groups.ts` (your region and groups), `src/announcements.ts` (posts), and
`src/pages.ts` (copy).

## 2. Database

```bash
npx wrangler login
npx wrangler d1 create your-db-name
# copy the returned database_id into wrangler.toml
npx wrangler d1 execute your-db-name --remote --file=./schema.sql
npx wrangler d1 execute your-db-name --remote --file=./migrations/001_add_contact_and_county.sql
```

**Skip `migrations/000_*`.** It drops the `subscribers` table and applies only to this
project's original deployment.

## 3. Secrets

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_TOKEN        # openssl rand -hex 32
```

Store `ADMIN_TOKEN` in a shared password manager. Cloudflare cannot display it again, and it
is the only control on member data export.

## 4. Domain

Add the domain to Cloudflare, then attach it under **Workers & Pages → your worker →
Settings → Domains & Routes → Add custom domain**.

Use a *custom domain*, not a *route*. A route assumes an origin server exists; without one,
requests return HTTP 525.

## 5. Email delivery

Verify the sending domain with Resend and add the DNS records it provides.

Two common errors:

- **In Cloudflare's DNS Name field, enter the label only.** `resend._domainkey`, not `resend._domainkey.example.org` — Cloudflare appends the zone, and the doubled name will not verify.
- **A domain may have only one SPF record.** If Cloudflare Email Routing is also in use, merge the includes into a single record. Two SPF records cause delivery failures for all senders.

## 6. Deploy

```bash
npm run typecheck
npm run deploy
```

Verify with `scripts/diagnose.ps1`, then submit the signup form once and confirm the email
arrives.

## Security baseline

- Install `scripts/pre-push-check.sh` as a pre-push hook
- Protect the default branch; require review before merge
- Use a GitHub Environment with required reviewers for deploys
- Scope the CI Cloudflare token to Workers and D1 only; do not use a global key
- Pin GitHub Actions to commit SHAs rather than tags
- Enable two-factor authentication on every account, with recovery codes in shared storage
- Maintain at least two administrators

## Shared administration

Register accounts to an address the group controls rather than to an individual, and add
people as members. Cloudflare's free plan permits one Super Administrator and unlimited
Administrators, so that single owner should be a group-controlled address.

Recovery configuration matters more than passwords: if account recovery reaches one
person's inbox, the account belongs to that person regardless of registration.

Access divides cleanly by role. Content editors need only repository write access —
announcements and copy are plain files, editable through the GitHub web interface, and CI
deploys on merge. List management requires `ADMIN_TOKEN` and nothing else. Only technical
administrators need Cloudflare or DNS access.

## Compliance

Read [`CONSENT.md`](CONSENT.md) before collecting telephone numbers.

Automated SMS requires prior express written consent with specific disclosures. Contact
details collected without that language cannot be used for automated messaging;
`scripts/import_list.py` enforces this and provides no override. Bulk commercial email
requires a physical postal address.

Carrier registration for SMS takes 10–15 days and binds to a specific brand name and URL.
Settle naming before filing.

## Organizational status

State plainly on the site whether the group is a chartered chapter. Status is granted by
DSA nationally; claiming otherwise creates avoidable friction with national and with
neighbouring chapters. See [`NAMING.md`](NAMING.md) for how this project handles it.
