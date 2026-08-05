# Structure and compliance check

Two parts: what DSA's rules say about our structure (which we should fix before we brand
anything), and a checklist for the list itself.

---

## Part 1 — Where we actually stand

**Updated after the Centre County meeting.** We're organizing informally alongside Centre
County DSA, in a pre-organizing stage, with the branch-versus-own-chapter question left
open until we see how much we grow. The initial interest meeting and training videos are
done. That's a normal, healthy place to be — most groups spend a while here.

The thing to keep straight is that **"informally part of Centre County DSA" is a working
relationship, not a chartered status.** Both of these are true at once:

- Centre County DSA can absolutely coordinate with us, share organizers, and treat us as theirs in practice.
- Until national says otherwise, we are not a chartered chapter and not a formally recognized branch.

Nothing about that is a problem. It only becomes one if we *publish* something that implies
otherwise — which is why the site labels every group with its real status and the footer
says in plain text that the site isn't a chartered chapter.

The open question worth getting in writing is the one below.

### What the rules actually say

DSA's chapter pipeline runs **Pre-Organizing Committee → Organizing Committee → Chapter**.
The eligibility rule for Pre-OC status is:

> 1) Be a DSA member current in their dues
> 2) **Live or work in an area not already covered by another DSA group's zip code jurisdiction**

Clearfield County is outside Centre County DSA's chartered jurisdiction. That has two
consequences, one awkward and one useful.

**Awkward:** a "Centre County DSA branch in Clearfield" isn't a structure national
recognizes. The national constitution grants charters covering "a description of the
geographic area to be served by the Chapter," and branches exist *within* that area. A
chapter can't extend a branch into territory it isn't chartered for.

**Useful:** because Clearfield isn't covered, we're eligible to start our own Pre-OC. That's
the supported path — it's free, it assigns us a staff Field Organizer, and it's how a county
this size is supposed to get organized.

### Also worth knowing

Under the national constitution, DSA members who aren't in a chapter's area are
**members-at-large**. So there are almost certainly dues-paying DSA members in Clearfield
County right now who belong to no chapter and receive nothing local. We can't see them, but
national can — and DSA's privacy policy explicitly permits providing member information "to
other DSA dues paying members for the purposes of organizing a DSA chapter."

**Getting that list is probably the single highest-value thing we can do**, and it comes free
with Pre-OC status. It's a warm list of confirmed socialists in our county.

### What to do

1. Run our zip codes through the [zip lookup tool](https://chapters.dsausa.org/) and screenshot the result.
2. Submit the Chapter Interest Form. Requires listening to a ~50-minute recorded organizing call and submitting notes.
3. Attend the Chapter Interest Call with DSA staff. After that we're an official Pre-OC.
4. Ask our assigned Field Organizer for the members-at-large list for our zips.
5. **Then** pick a public name, then buy the domain to match.

Contact for questions: the Chapter Pipeline Coordinator, via the Start a Chapter page.

### Talk to Centre County DSA anyway

None of this is a reason to be cagey with them. They're the nearest chapter, they have
organizers who've done this, and coordination beats duplication. But we should go in as
"we're starting a Pre-OC next door and want your help," not "we're your branch" — because
the second one isn't accurate and their steering committee would eventually have to correct it.

### The naming question — resolved by making the site a regional hub

My earlier worry was that `dsacentralpa.org` implies a chartered Central Pennsylvania
chapter that doesn't exist. The plan to use it as a **regional front door serving both
counties and routing people to the right group** resolves that, and is a better idea than
what I originally proposed. It's now built that way:

- The site brands as **Central PA DSA** — presented as a shared regional resource, not an organization.
- The mailing list is operated by **Clearfield County DSA**, named explicitly in the footer, the privacy policy, and the SMS terms. That's the identifiable group responsible for the data.
- The county finder routes Centre → Centre County DSA, Clearfield → us, and anything else → DSA's official chapter map rather than pretending we cover it.
- Every group carries its real status label. Centre County shows as *Chartered chapter*; we show as *Getting started*.
- The footer states in plain language that the site is not itself a chartered chapter.

Those are two separate config values on purpose — `SITE_NAME` (the regional hub) and
`CHAPTER_NAME` (the group that owns the list). Keeping them distinct is what makes a broad
domain honest.

**Still worth getting in writing from national** — see `NATIONAL-APPROVAL.md`. Changing the
site name is a one-line edit. **Changing it after registering a text campaign means paying
the fees again and waiting out another 10–15 day review**, which is why the budget
recommends settling the name before registering.

---

## Part 2 — Compliance checklist

### DSA rules

| Requirement | Status |
|---|---|
| Don't claim chartered status we don't have | **Action needed** — site says "Central PA DSA"; revise or hold |
| Don't sell, rent, or trade member data | Done — written into the privacy policy |
| Don't share member data with outside orgs | Done — policy is stricter than national's, which permits sharing with DSA locals and DSA-endorsed committees |
| Member data used only for organizing | Done |
| Under-13 data not collected | Done — stated in policy |
| Report structure/bylaws to national once chartered | Future, at OC stage |
| Annual financial report to national | Future, at chapter stage |

Our published policy is deliberately **stricter** than DSA national's. National's policy
reserves the right to share personal information with DSA locals and with political
committees for DSA-endorsed candidates. Ours promises we won't share with anyone. That's a
promise we're allowed to make and should keep — but note it means we cannot hand our list to
a DSA-endorsed campaign later without going back to the list and asking first.

### Telecom and privacy law

| Requirement | Status |
|---|---|
| Prior express written consent before automated texts (TCPA) | Done — separate unchecked box with full disclosure |
| Consent not a condition of membership, stated | Done |
| Message frequency disclosed | Done — "approx 2–6/month" |
| "Msg & data rates may apply" disclosed | Done |
| STOP / HELP honored | Done — handled in code and by Twilio |
| Consent records retained with timestamp, IP, and wording version | Done — append-only `consent_events` table |
| Public SMS terms page at a stable URL | Done — `/sms-terms` |
| Public privacy policy | Done — `/privacy` |
| Working unsubscribe in every email (CAN-SPAM) | Done — tokenized link |
| Physical mailing address in commercial email (CAN-SPAM) | **Action needed** — add a mailing address, even a PO box |
| No bulk-importing un-consented phone numbers | Done — import script stores phones but adds nobody to the SMS list |

### Open items

- [ ] Add a physical mailing address to the email footer (CAN-SPAM requires it for commercial email; a PO box is fine and safer than a home address)
- [ ] Second person with admin access
- [ ] Decide the public name before registering anything
- [ ] Confirm with Centre County DSA what they already run
- [ ] Move domain, Cloudflare, and Twilio accounts to a shared org account rather than personal ones

### Not legal advice

I'm a member volunteer, not a lawyer. The TCPA and CAN-SPAM points above reflect standard
carrier and FTC guidance, but if the group ever does electoral or fundraising texting, that's
worth a real check with someone qualified — the rules are stricter and the penalties are
per-message.
