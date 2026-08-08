# Security

## Reporting

Email **info@dsacentralpa.org**. If the issue involves member contact data, indicate that in
the subject line.

Please allow a reasonable period for remediation before public disclosure. This project is
maintained by volunteers; response may take days rather than hours.

## Repository contents

No credentials appear in this repository or its history. API keys, tokens, and database
credentials are held in Cloudflare's secret store and are not present in the repository, in
CI configuration, or in the deployed bundle.

No member data is present. Contact records are held in a database that is not publicly
readable. Spreadsheets, exports, and local database files are excluded from version control,
and a pre-push check rejects commits that would include them.

Deployment-specific operational documentation — DNS configuration, access arrangements,
procedures — is maintained outside this repository.

## Application

- Administrative endpoints require bearer-token authentication and fail closed: requests are rejected if the token is unset.
- Inbound webhook requests are verified by HMAC signature; unsigned requests are rejected.
- Public forms are rate limited per address, use a honeypot field, and validate input server-side.
- A restrictive Content Security Policy is served on all pages. No third-party scripts, fonts, or trackers are loaded, and external script execution is blocked.
- Consent records are append-only and are not modified or deleted, including on subscriber removal.
- No analytics, third-party cookies, or tracking pixels.

## Build and deployment

- GitHub Actions are pinned to commit SHAs rather than tags.
- Deployment does not run on pull requests. Fork contributions receive no secrets and a read-only token.
- Deployment credentials are scoped to Workers and D1 on a single account and are independently revocable.
- Commits and pull requests are scanned for credentials and member data before merge.
- Dependency updates are automated and reviewed weekly.

## Dependencies

The deployed Worker has no runtime dependencies; all imports are local modules and the build
output contains no third-party code. Development tooling is separate: a vulnerability there
affects a machine performing a deployment, not the running service or member data.

Where an upstream fix is unavailable, dependencies are pinned forward to a patched version
and the reasoning recorded in commit history.

## Reuse

[`docs/SETUP.md`](docs/SETUP.md) documents the security baseline for a new deployment:
branch protection, deployment approval, scoped API tokens, SHA-pinned actions, two-factor
authentication with shared recovery codes, and multiple administrators.
