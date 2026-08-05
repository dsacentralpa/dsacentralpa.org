# DNS records — what to delete, what to keep

## Is it safe to paste DNS records into a chat?

Yes. **DNS is a public directory.** Every A, AAAA, CNAME, MX, NS, and TXT record on your
domain is answerable to anyone on the internet who asks — I retrieved most of yours with
`dig`, with no access to your Cloudflare account. Pasting them exposes nothing that isn't
already global.

Two caveats, neither serious:

- **DKIM records contain a public key.** That's what "public key" means; publishing it is the point.
- **Redact anything that looks like an API key.** A TXT record shouldn't contain one, but people do occasionally paste a key into the wrong box. If you see something like `sk_live_...` or `re_...` in a TXT value, that's a real leak — rotate it rather than worrying about the chat.

By contrast, these are **never safe to paste anywhere**: your `.env` file, `wrangler secret`
values, `ADMIN_TOKEN`, Twilio auth token, Resend API key.

---

## The one rule

> **Delete only records whose NAME is `@` (apex), `www`, or `*` — and whose TYPE is A, AAAA,
> or CNAME.**
>
> **Never delete MX or TXT records.** Those are your email.

Everything else stays. When unsure, keep it — an extra record is harmless; a missing MX
record silently kills your mail.

---

## Delete these three

| Name | Type | Why |
|---|---|---|
| `dsacentralpa.org` (may display as `@`) | A or CNAME | Points at a nonexistent origin. **This is the 525.** Blocks the custom domain. |
| `www` | A or CNAME | Same. |
| `*` (wildcard) | A or CNAME | See below — recommended, not strictly required. |

### About the wildcard

A `*` record answers for *every* subdomain that has no record of its own. That's why
`ftp.`, `cpanel.`, `blog.`, `api.`, and even `zzz-nonexistent-9f3a.` all resolve — none of
those exist, the wildcard is answering. Since it's proxied to an origin that isn't there,
every one returns **525**.

Two reasons to delete it:

1. Every non-existent subdomain currently serves a Cloudflare error page instead of failing cleanly.
2. It's a small phishing surface — `login.dsacentralpa.org` or `donate.dsacentralpa.org` resolve today and look plausible in a link.

It may also interfere with creating a custom domain for `www`.

---

## Keep these — do not touch

| Name | Type | What it does | Breaking it means |
|---|---|---|---|
| `@` | MX ×3 → `route1/2/3.mx.cloudflare.net` | Cloudflare Email Routing | Mail to `info@` stops arriving |
| `@` | TXT `v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all` | SPF | Your email goes to spam |
| `@` | TXT `brevo-code:…` | Brevo domain verification | Brevo disconnects |
| `_dmarc` | TXT `v=DMARC1; p=none; …` | DMARC policy | Weaker deliverability |
| `cf2024-1._domainkey` | TXT | Cloudflare Email Routing DKIM | Forwarded mail fails auth |
| `resend._domainkey` | CNAME → `resend-domain-key.resend.com` | **Resend DKIM** | Confirmation emails fail |
| `mail` | CNAME → `mail-dsacentralpa-org.brand.brevosend.com` | Brevo sending | Brevo breaks |
| `mail` | MX → `return-path.mx.brevosend.com` | Brevo bounce handling | Brevo breaks |
| `mail` | TXT `v=spf1 include:spf.brevo.com -all` | Brevo SPF | Brevo mail marked spam |
| `@` | NS ×2 | Cloudflare nameservers | Usually not editable |

**A CNAME named `resend._domainkey` or `mail` is not the same as a CNAME named `www`.** All
eight of your CNAMEs are probably in this table except the apex and `www` — check the Name
column, not the Type column.

---

## Order of operations

1. **Cloudflare → dsacentralpa.org → DNS → Records**
2. Delete the apex record, the `www` record, and the `*` record. **Three deletions, nothing else.**
3. Screenshot the record list first, so you can restore anything you delete by mistake.
4. From `D:\projects\DSA\Email`:
   ```powershell
   npm run deploy
   ```
   Wrangler creates both custom domains and the DNS records they need.
5. Wait ~1 minute for certificate issuance.

Wrangler recreates apex and `www` as custom-domain records automatically. You are not
deleting them permanently — you're clearing the way for the correct version.

---

## Worth knowing: you have three email systems

Currently configured on this one domain:

- **Cloudflare Email Routing** — receiving `info@dsacentralpa.org`
- **Resend** — sending, via `resend._domainkey`
- **Brevo** — sending, on the `mail.` subdomain

That's more overlap than the chapter needs and it's a future source of confusion — three
dashboards, three deliverability reputations, three places to check when an email doesn't
arrive.

Not urgent, and nothing to change before a demo. But once the site is up, pick **one**
sending service and remove the other's records. The Worker uses Resend, so unless Brevo is
doing something specific you want, Resend is the one to keep.

**One thing you got right:** your apex SPF is a single merged record —
`v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all`. That's exactly the
combined form. A second SPF record would have broken delivery for both.

**One gap:** that SPF doesn't include Brevo. Mail sent through Brevo *from the apex domain*
would fail SPF. Brevo's own SPF lives on `mail.`, which works if you send as
`something@mail.dsacentralpa.org`. Another reason to consolidate on one sender.
