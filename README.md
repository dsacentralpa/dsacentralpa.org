# dsacentralpa.org

A Cloudflare Worker serving a regional directory for DSA groups in Central Pennsylvania and
an opt-in email and SMS list with the consent records required for automated messaging.

Live at [dsacentralpa.org](https://dsacentralpa.org). Maintained by Clearfield County DSA.
MIT licensed; other DSA groups are welcome to fork it.

## Features

- County directory that routes visitors to the DSA group covering their area, or to DSA national's chapter map where none exists
- Double opt-in signup, with email and SMS consent tracked independently
- Append-only consent log recording timestamp, IP address, user agent, and the exact consent language displayed
- One-click unsubscribe with `List-Unsubscribe` headers
- Contact form that does not subscribe the sender
- Announcements and newsletter, editable without a local development environment
- Token-authenticated admin endpoints for export, message review, and diagnostics
- Published privacy policy and SMS terms

## Architecture

Single Worker, no runtime dependencies. All pages are server-rendered with inline CSS and
JavaScript; the deployed bundle contains no third-party code. Data is stored in Cloudflare
D1. Email is delivered via Resend, SMS via Twilio.

Pages are under 20 KB and make no third-party requests. This is a deployment constraint:
the service area has limited broadband availability.

```
src/
  worker.ts        request router, API handlers
  pages.ts         page templates, email templates
  groups.ts        county and group directory
  announcements.ts announcement and newsletter entries
  lib.ts           validation, tokens, delivery, signature verification
  assets.ts        base64-embedded images
schema.sql         database schema
migrations/        schema migrations, applied in order
scripts/           import, diagnostics, backup, pre-push checks
docs/              setup, configuration, consent model, naming
```

## Documentation

| Document | Contents |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Deploying an instance |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Variables, secrets, schema, routes |
| [`docs/CONSENT.md`](docs/CONSENT.md) | How consent is captured, stored, and revoked |
| [`docs/NAMING.md`](docs/NAMING.md) | Organizational status and site naming |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Editing content without a local environment |
| [`SECURITY.md`](SECURITY.md) | Security model and vulnerability reporting |
| [`NOTICE.md`](NOTICE.md) | Third-party and DSA brand asset attribution |

Deployment-specific configuration — DNS records, access arrangements, operational
procedures — is maintained outside this repository.

## Development

```bash
npm install
npm run dev        # local server, local database
npm run typecheck
```

`scripts/pre-push-check.sh` blocks commits containing credentials, member data, or local
database files. Install as a hook:

```bash
cp scripts/pre-push-check.sh .git/hooks/pre-push
```

## Licence

Code is MIT — see [`LICENSE`](LICENSE).

DSA brand assets, including the rose emblem and colour palette, are governed by the
[DSA National Design Guide](https://design.dsausa.org/) and are not covered by that licence.
See [`NOTICE.md`](NOTICE.md).

Design derives from [Chicago DSA's Haymarket theme](https://github.com/ChicagoDSA/haymarket).
Groups needing only a website, without a mailing list, should use Haymarket directly.
