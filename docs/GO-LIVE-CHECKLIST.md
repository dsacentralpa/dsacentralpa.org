# Go-live checklist

The Worker is deployed and serving at
`https://dsa-central-pa.dsa-email.workers.dev`. **It is not yet functional** — two things
are missing, and both will fail live in front of the room if you don't handle them.

Work top to bottom. Roughly 15 minutes.

---

## 1. No secrets are set — this is the blocker

Look at your last deploy output. The bindings list showed nine environment variables and
**zero secrets**. Missing: `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`ADMIN_TOKEN`.

Consequences right now:

| Missing | What breaks |
|---|---|
| `RESEND_API_KEY` | Confirmation emails silently fail. Someone signs up, nothing arrives. |
| `ADMIN_TOKEN` | `/api/admin/*` returns 401 to everyone, including you. (Fails closed — safe, but you can't demo the export.) |
| `TWILIO_*` | Confirmation texts fail; inbound webhook rejects everything. |

Fix — run each, paste the value from your local `.env` when prompted:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
```

Generate `ADMIN_TOKEN` fresh rather than reusing anything:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**Save it in a password manager.** It is the only thing protecting the member list export,
and the second admin will need a copy.

Confirm they took:

```powershell
npx wrangler secret list
```

Secrets apply on next deploy, so finish with `npm run deploy`.

---

## 2. Verify the database actually has the schema

You deployed the Worker, but I can't tell from here whether the migrations ran. If they
didn't, every signup returns a 500 — the pages load fine, so this looks healthy right up
until someone submits the form.

Check first:

```powershell
npx wrangler d1 execute dsa-list-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

**Expect:** `consent_events`, `messages`, `rate_limits`, `subscribers`, `tokens`.

- **All five present** → done, skip ahead.
- **Only `subscribers`, or an error** → the prototype table is still there. Run all three:

```powershell
npx wrangler d1 execute dsa-list-db --remote --file=./migrations/000_drop_prototype_table.sql
npx wrangler d1 execute dsa-list-db --remote --file=./schema.sql
npx wrangler d1 execute dsa-list-db --remote --file=./migrations/001_add_contact_and_county.sql
```

> `000_drop_prototype_table.sql` deletes the `subscribers` table. Safe now — there's no real
> data yet. **Never run it again after the list is live.**

---

## 3. End-to-end test, on your phone, over cellular

Not wifi. Cellular is the actual test, and it's the one that catches problems.

1. Open the site. Every page loads.
2. County finder: **Centre** → Centre County DSA. **Clearfield** → your group. **Blair** → hands off to DSA's national map.
3. Sign up with your own email, email box only.
4. Confirmation email arrives. *If it doesn't, see §4.*
5. Click the link → "You're on the list."
6. Click it again → "already confirmed."
7. Check the record landed:

```powershell
npx wrangler d1 execute dsa-list-db --remote --command "SELECT email, email_status, county FROM subscribers ORDER BY created_at DESC LIMIT 3"
```

8. Export works:

```powershell
curl.exe -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://dsa-central-pa.dsa-email.workers.dev/api/admin/stats
```

Then clean up your test row before the meeting:

```powershell
npx wrangler d1 execute dsa-list-db --remote --command "DELETE FROM subscribers WHERE email='your@email.com'"
```

---

## 4. If confirmation email doesn't arrive

Almost certainly the sending domain isn't verified in Resend yet. Cloudflare Email Routing
handles *receiving* — it does nothing for sending. See `DEPLOY-AND-DEMO.md` §4.5 for the SPF
collision between the two and how to resolve it.

**This is fine for tomorrow.** Say so plainly in the demo — "the confirmation email needs
the sending domain verified, which happens once we own it" — and show the database row
instead. Don't debug DNS in front of the room.

---

## 5. Optional: custom domain

Only if `dsacentralpa.org` is already in this Cloudflare account. Uncomment the `[[routes]]`
block in `wrangler.toml` and redeploy, or use **Workers & Pages → dsa-central-pa → Settings
→ Domains & Routes**.

If it's registered elsewhere, don't start a nameserver migration the morning of a meeting.
Demo on the `workers.dev` URL. Nobody will care.

---

## Fix the CRLF warnings while you're here

You saw these on `git add`:

```
warning: in the working copy of '.env.example', LF will be replaced by CRLF
```

Harmless for those files, but noisy. The `.gitattributes` I added covers scripts, source,
and config — the warning is for dotfiles without extensions. Silence it with:

```powershell
git config core.autocrlf false
```

Only matters if you ever edit `scripts/pre-push-check.sh` on Windows — CRLF there breaks the
hook with `bad interpreter: ...^M`.

---

## The five-minute version

If you're short on time, do only this:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler d1 execute dsa-list-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
# if the five tables aren't there, run the three migration files
npm run deploy
```

Then load the site on your phone and submit the form once. If you see the green confirmation
message, you have a demo.
