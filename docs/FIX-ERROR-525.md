# Fixing Error 525 on dsacentralpa.org

**Status:** the site itself is fine. `https://dsa-central-pa.dsa-email.workers.dev` works
end to end — pages load, the database responds, auth behaves. **Only the custom domain is
broken**, and it's one setting.

---

## What's actually wrong

What I measured:

```
dsacentralpa.org  A     172.67.205.79, 104.21.22.142   (Cloudflare proxy IPs)
                  NS    arch.ns.cloudflare.com, deborah.ns.cloudflare.com
  https://dsacentralpa.org/  →  HTTP 525
```

The domain is fully on Cloudflare and proxied. Good. But there's a **proxied DNS record
pointing at an origin server that doesn't exist**, and no Worker attached to the hostname.

So the request goes: browser → Cloudflare → *tries to open TLS to an origin* → nothing
there → **525 SSL handshake failed**.

**Your Worker never gets called.** 525 isn't really an SSL problem in your case — it's
Cloudflare telling you it looked for a web server behind the domain and didn't find one.
Which is correct: there is no server. The Worker *is* the site.

## Why the config I gave you was wrong

I had you set up a **route**. Routes assume an origin exists — the Worker intercepts
matching paths and everything else falls through to your server. With no server, you get
525. That's my error, and it's the whole bug.

What you need is a **Custom Domain**: the hostname points straight at the Worker,
Cloudflare issues the certificate and terminates TLS at its own edge. No origin, no
handshake, nothing to fail.

---

## Fix it — dashboard (2 minutes, do this one)

1. **Workers & Pages → dsa-central-pa → Settings → Domains & Routes**
2. **Add → Custom domain**
3. Enter `dsacentralpa.org` → **Add domain**
4. It will warn that an existing DNS record conflicts. **Let it replace the record** — that record is what's causing the 525.
5. Repeat for `www.dsacentralpa.org`
6. Wait ~1 minute for the certificate. Status goes *Initializing* → *Active*.

## Or via wrangler

Uncomment the `routes` block at the bottom of `wrangler.toml` (already corrected to
`custom_domain = true`), then:

```powershell
npm run deploy
```

Note the pattern is a bare hostname — `dsacentralpa.org`, **not** `dsacentralpa.org/*`.
Custom domains don't take a path, and adding `/*` turns it back into a route.

## Your email forwarding is safe

Custom domains replace **A/AAAA** records. Cloudflare Email Routing uses **MX** records,
which are a different record type and are not touched. Mail to `info@dsacentralpa.org`
keeps forwarding.

## Verify

```powershell
curl.exe -I https://dsacentralpa.org/
```

Want `200`. If you still get 525 after two minutes, the old proxied A record probably
survived — go to **DNS → Records**, delete any `A` or `AAAA` record for `dsacentralpa.org`
or `www`, and re-add the custom domain. The custom domain creates the record it needs.

---

## Also: one secret is still missing

Your `wrangler secret list` shows three:

```
ADMIN_TOKEN, RESEND_API_KEY, TWILIO_ACCOUNT_SID
```

**`TWILIO_AUTH_TOKEN` is not set.** Consequences:

- Inbound Twilio webhook rejects every request with 403, because it validates the request signature using that token as the HMAC key. YES / STOP / START replies would never reach the database.
- Outbound texts fail to authenticate.

Not a blocker for tomorrow — you aren't texting until the A2P campaign is approved — but
set it while you're in here:

```powershell
npx wrangler secret put TWILIO_AUTH_TOKEN
npm run deploy
```

Secrets only take effect on the next deploy.

---

## Confirmed working right now

I probed the live deployment:

| Check | Result |
|---|---|
| `/health` | 200 |
| `/`, `/groups`, `/contact` | 200 |
| Database tables exist | Yes — `/confirm?token=bogus` returns 404, not 500 |
| The earlier SQL error | Gone. It was the missing schema; your migrations fixed it. |
| `/api/admin/stats` without a token | 401 (correct — fails closed) |

**You already have a working demo at the workers.dev URL.** The custom domain is polish. If
anything goes sideways in the next few minutes, demo on workers.dev and fix the domain
after — nobody in the room will notice the URL.
