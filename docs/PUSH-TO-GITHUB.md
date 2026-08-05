# Pushing to GitHub from Windows / PowerShell

Target repo: **`https://github.com/dsacentralpa/dsacentralpa.org`** — confirmed to exist, is
empty, and is currently **Public**. Empty is good: the push will be clean with no merge
conflict.

---

## First, the thing that trips everyone up

**GitHub organizations do not have logins.** There is no way to "sign in as
dsacentralpa." You authenticate as a *personal user account* that has write access to the
org's repo. The org is a container, not an identity you can log in as.

So "push with my org account" resolves to one of these:

| | How it works | Who sees what |
|---|---|---|
| **A. Your personal account** (an owner of the org) | Normal sign-in | Commits show `Central PA DSA`; the *push* is attributed to your username in the org audit log |
| **B. A separate role account** you create and invite to the org | Sign in as that account | Nothing ties back to your personal profile |

**Commits already show as `Central PA DSA <info@dsacentralpa.org>` either way** — that's
baked into the commit objects and is what appears on the file listing and blame view. The
difference is only in push attribution, which org members and the audit log can see.

Option A is fine unless you specifically want your personal account off the record. If you
do want that separation, create the role account *before* the first push — changing it
afterward doesn't rewrite history.

> **Do not add `info@dsacentralpa.org` as a verified email on your personal GitHub
> account.** If you do, GitHub links every one of those commits to your personal profile —
> avatar, username, the lot — which undoes the separation we set up.

---

## The commands (PowerShell)

Your errors came from using bash syntax. In Windows PowerShell 5.1, `&&` is not a valid
separator, and `chmod` doesn't exist. Corrected:

### 1. Install the safety hook

```powershell
Copy-Item scripts\pre-push-check.sh .git\hooks\pre-push
```

That's the whole thing. **No `chmod` needed** — Git for Windows runs hooks through its
bundled bash based on the `#!/usr/bin/env bash` shebang, not the Unix executable bit.

Verify it fires:

```powershell
git push --dry-run
```

You should see the check output before git does anything.

### 2. Add the remote and push

```powershell
git remote add origin https://github.com/dsacentralpa/dsacentralpa.org.git
git branch -M main
git push -u origin main
```

A browser window opens for GitHub sign-in on the first push — that's Git Credential
Manager, which ships with Git for Windows. Sign in as whichever account you decided on
above, authorize it, and the push completes.

### 3. Confirm

```powershell
git log --oneline
git remote -v
```

Then load the repo page. You should see 21 files, three commits, all authored by
`Central PA DSA`.

---

## If something goes wrong

**`&&` errors again** — you're on PowerShell 5.1. Run each command on its own line. (`&&`
works in PowerShell 7+, which you can install separately, but one line at a time is fine.)

**Wrong GitHub account cached.** If Credential Manager silently reuses an old sign-in:

```powershell
git credential-manager github logout
```

Or clear it by hand: **Control Panel → Credential Manager → Windows Credentials**, find
`git:https://github.com`, remove it. Next push re-prompts.

**`remote origin already exists`**

```powershell
git remote set-url origin https://github.com/dsacentralpa/dsacentralpa.org.git
```

**`failed to push some refs` / `fetch first`** — something got added to the repo on GitHub
after I checked. Pull and rebase:

```powershell
git pull --rebase origin main
git push -u origin main
```

**`support for password authentication was removed`** — you're being asked for your account
password. Use the browser flow, or generate a fine-grained personal access token
(**GitHub → Settings → Developer settings → Personal access tokens → Fine-grained**), scope
it to just this repo with **Contents: Read and write**, and paste it as the password.

**Hook doesn't run, or errors with `bad interpreter: ...^M`** — CRLF line endings. The
`.gitattributes` I added prevents this going forward. To fix an already-broken copy:

```powershell
Remove-Item .git\hooks\pre-push
git checkout -- scripts\pre-push-check.sh
Copy-Item scripts\pre-push-check.sh .git\hooks\pre-push
```

---

## After the push

**The repo is public right now.** Nothing tracked is sensitive — the check passed, secrets
live in `wrangler secret`, and `private/` is ignored. So public is safe.

Still worth a deliberate decision rather than an accident. If you'd rather the chapter
agree first: **Settings → General → Danger Zone → Change visibility → Private**. Flipping
back later is one click; the reverse isn't.

Two small things that make the repo look like real chapter infrastructure:

- **Add a description and topics** — "Website and mailing list for DSA groups in Central Pennsylvania." Topics: `dsa`, `cloudflare-workers`, `organizing`.
- **Add a LICENSE.** Without one, nobody can legally reuse it, which defeats the point of publishing. MIT or GPL-3.0 are both reasonable; other DSA chapters typically use MIT.

**Routine from here:**

```powershell
git add -A
git commit -m "what changed"
git push          # hook runs the safety check automatically
npm run deploy    # separate step — this is what makes the site live
```

Remember those last two are unrelated. `git push` backs up code; `npm run deploy` ships it
to Cloudflare.
