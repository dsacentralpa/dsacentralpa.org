# Communications budget and options

**Prepared for:** Clearfield County organizing meeting
**Date:** August 5, 2026

*Published for other DSA groups to reuse. Figures are for a group of roughly 60–300 people;
check current vendor pricing before relying on them.*

---

## Two things to settle before spending anything

**1. We are not a branch.** Clearfield County is outside Centre County DSA's chartered zip
jurisdiction. Under DSA's own rules that makes us eligible to start a **Pre-Organizing
Committee**, which is the first step of the national chapter pipeline — and it means a
"Centre County DSA branch in Clearfield" isn't a structure national recognizes. Details and
the fix are in `DSA-STRUCTURE-AND-COMPLIANCE.md`. It's good news, mostly: the official path
is free, comes with a staff Field Organizer, and gets us the list of DSA members already
living in Clearfield County. But it changes what name we put on a domain and a text
campaign, so it should come first.

**2. Nobody has confirmed what Centre County DSA already runs.** Publicly they have a
Facebook page and a Patreon and no website. If that's the whole picture, nothing is being
duplicated. If they have an email tool nobody mentioned, we should use it. **Someone should
ask their steering committee before we spend a dollar.**

Everything below assumes we proceed on our own. Costs are small enough that being wrong is
cheap — the risk is wasted effort and an awkward conversation, not wasted money.

---

## The headline numbers

| Scenario | Year 1 | Ongoing |
|---|---|---|
| **Email only, start this month** | **~$11** | **~$11/yr** |
| Email + texts, self-managed | ~$125 | ~$106/yr |
| Email + texts, managed platform | ~$85–110 | ~$85–110/yr |
| Commercial website builder equivalent | ~$300+ | ~$300+/yr |

The website, database, and hosting are **$0** and stay $0 at our scale. The only unavoidable
cost is the domain, about **$11/year**. Everything else is texting.

---

## What's already built and what it costs

The site, signup form, privacy policy, SMS terms, database, and admin export are written and
tested. Running them costs nothing:

| Service | Free tier | What we'd actually use | Cost |
|---|---|---|---|
| Cloudflare Workers | 100,000 requests/day | maybe 200/day | $0 |
| Cloudflare D1 database | 5 GB, 5M row reads/day | under 1 MB | $0 |
| Resend email | 3,000/month | ~1,200/month at 300 members | $0 |
| Domain (.org, at-cost registrar) | — | 1 | ~$11/yr |

We are roughly **three orders of magnitude** under the free limits. This does not become
expensive as we grow; it becomes expensive only if we get famous.

> **The one thing that will break first:** Resend's free tier caps at **100 emails per day**,
> not just 3,000/month. Once we pass ~100 confirmed subscribers, a single announcement to the
> whole list exceeds the daily cap and has to be split across days. Fixes, cheapest first:
> Amazon SES at about $0.10 per 1,000 emails (~$1.50/year at our volume, more setup work), or
> Resend Pro at $20/month ($240/year, no work). At 63 contacts today this is not yet a
> problem, but we'll hit it.

---

## Texting: the part that actually costs money

### The finding that surprised me

I assumed running Twilio ourselves would be cheapest. At our volume it isn't.

Assume **400 texts/month** (100 confirmed numbers × 4 messages):

| Option | Per message | Fixed monthly | Monthly total | Who does 10DLC registration |
|---|---|---|---|---|
| Scale to Win | ~$0.015 | $0 | **~$6.00** | They do |
| CallHub | ~$0.019 | $0 | ~$7.60 | They do |
| **Twilio, self-managed** | ~$0.012 | $3.15 | **~$7.95** | **We do** |
| Action Network mobile | ~$0.010 + telecom | varies | ~$4–8 | They do |
| GetThru / ThruText | ~$0.06 | + setup fee | ~$24+ | They do |

Twilio's per-message rate is the lowest, but the $1.15/month number rental plus the $2/month
campaign fee swamp that advantage at small volume. **Self-managing Twilio only becomes
cheaper than Scale to Win above roughly 1,000 messages per month** — about 250 confirmed
subscribers texted weekly. We are nowhere near that.

Below that line we would be paying slightly more, doing the carrier registration ourselves,
waiting 10–15 days for vetting, and putting the brand in my personal name — to save nothing.

*Vendor rates above other than Twilio's come from published comparisons rather than direct
quotes; confirm with the vendor before committing. Scale to Win and Action Network both
restrict service to progressive organizations, which we qualify for.*

### Twilio one-time and recurring, if we do go self-managed

| Item | Cost |
|---|---|
| Sole Proprietor brand registration | $4 one-time |
| Campaign vetting | $15 one-time |
| Campaign fee | $2/month |
| Phone number | ~$1.15/month |
| Per message (Twilio + carrier surcharge) | ~$0.011–0.013 |

---

## Website alternatives, for comparison

| Option | Annual | Forms + list? | Notes |
|---|---|---|---|
| **What we built (Cloudflare)** | **$0 + domain** | Yes | Already works. Someone has to maintain code. |
| GitHub Pages + Chicago DSA's "haymarket" theme | $0 + domain | No | Free chapter theme, but static — needs a separate form service |
| WordPress.com | ~$50–100 | Add-on | Familiar, slower |
| Squarespace | ~$190–280 | Add-on | Polished, no code, most expensive |
| Wix | ~$200 | Add-on | Same |
| NationBuilder | ~$350+ | Yes | Built for campaigns, overkill for us |

Worth naming: the site we have loads in **under 10 KB with no JavaScript frameworks, no
fonts, and no tracking**. On a slow rural connection that is the difference between a page
that opens and one that doesn't. A Squarespace page is typically 2–5 MB. For Clearfield
County that's not an aesthetic preference, it's reach — see `RURAL-OUTREACH.md`.

---

## Recommendation

**Phase 1 — now, ~$11:** Register the domain. Deploy the site. Turn on the email list.
Publish the privacy policy and SMS terms. Re-permission the existing contacts. File for
Pre-OC status with national. Total cost is one domain registration.

**Phase 2 — after Pre-OC status is granted, ~$6–8/month:** Turn on texting through Scale to
Win or CallHub rather than self-managing Twilio. Revisit if we ever pass ~1,000 messages a
month, at which point running it ourselves starts to pay.

**Why defer texting rather than start it now:** a carrier text campaign is tied to a brand
name and a website URL. If we register as "Central PA DSA" and national charters us under a
different name — likely, since Clearfield isn't Central PA and we aren't chartered — we redo
the registration and wait out vetting again. Waiting three weeks for Pre-OC status costs
nothing. Registering twice costs $19 and a month.

The email list has no such dependency and should start immediately.

### What this asks of people, not just money

The honest cost isn't dollars. It's that **one person currently understands this system and
holds the only key to it.** At minimum a second person needs admin access before we put real
member data in it. If nobody else wants to learn it, that is a legitimate argument for paying
Action Network instead — roughly $100–200/year to make it somebody else's job. I'd rather not,
but the chapter should decide that with the tradeoff stated plainly rather than discover it
when I'm unavailable.

---

## Motion

> That we (a) register a domain and launch the email list and public website at a cost not to
> exceed $15 for the first year; (b) apply for Pre-Organizing Committee status with DSA
> national before adopting any public-facing name; (c) defer text messaging until Pre-OC
> status is granted, then authorize up to $10/month for a managed texting platform; and
> (d) designate a second member to hold administrative access to all accounts.

---

## Sources

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [Cloudflare .org at-cost registration](https://www.cloudflare.com/application-services/products/registrar/buy-org-domains/)
- [Twilio Sole Proprietor registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-sole-proprietor-registration-overview) · [A2P 10DLC Sole Proprietor FAQ](https://support.twilio.com/hc/en-us/articles/9550596959643-A2P-10DLC-Sole-Proprietor-Brands-FAQ)
- [Action Network pricing](https://help.actionnetwork.org/hc/en-us/articles/360040343291-How-does-pricing-and-billing-work) · [Action Network mobile messaging](https://actionnetwork.org/get-started-mobile/)
- [Scale to Win](https://www.scaletowin.com/) · [CallHub vs GetThru pricing comparison](https://callhub.io/alternatives/callhub-vs-getthru/)
- [Resend pricing](https://nuntly.com/resend-pricing)
- [DSA Start a Chapter pipeline](https://www.dsausa.org/chapters/start-a-chapter/)
