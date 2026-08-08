# Organizational status and site naming

This document exists so that anyone reviewing the site — including DSA national — can
establish what this project claims to be without inferring it from the code.

## Statement of status

**"Central PA DSA" is the name of this website. It is not the name of an organization.** No
chapter, branch, organizing committee, or other body of the Democratic Socialists of America
operates under that name, and there is no membership in it. It functions as a general
regional label for a directory and noticeboard.

The site is maintained by **Clearfield County DSA**, a group of DSA members organizing in
Clearfield County, Pennsylvania. That group is **not a chartered chapter**. Chapter and
organizing-committee status is granted by DSA through its national chapter pipeline, and no
status is claimed here that has not been granted.

DSA national maintains the authoritative directory of chartered chapters. Groups listed on
this site are listed as a convenience; the national chapter map and ZIP code lookup govern.

## Membership and dues

Joining the mailing list is not joining DSA, and the site says so at the point of signup.

DSA assigns members to the chartered chapter whose territory covers their address. There is
no chartered chapter in Clearfield County, so members joining from much of this region are
currently assigned to **Centre County DSA**, and dues are directed accordingly. This is
disclosed beside the signup form and explained at `/how-it-works`.

## How this is enforced in code

Two separate configuration values, in `wrangler.toml`:

| Variable | Meaning |
|---|---|
| `SITE_NAME` | The website's name. Not an organization. |
| `CHAPTER_NAME` | The group operating the mailing list, named in the privacy policy and SMS terms as responsible for the data. |

Keeping them distinct is what allows a regional domain to be used without implying a
regional organization. `SITE_NAME` appears in the site header and page titles;
`CHAPTER_NAME` appears anywhere responsibility or legal obligation is stated.

The status statement is rendered from a single function in `src/pages.ts` and appears on
`/how-it-works`, above the directory on `/groups`, and condensed in the footer of every
page.

## Directory listing policy

`src/groups.ts` governs which groups appear and how they are described. Two constraints,
documented in that file:

1. **Status labels are accurate or understated, never overstated.** Chartered chapter,
   organizing committee, and forming group are distinct, and the weaker label is used where
   there is any doubt.
2. **Groups are not listed speculatively.** Where coverage cannot be confirmed, the county
   is marked as having no group and the visitor is directed to DSA national's directory.

Any listed group may have its entry amended or removed on request. Requests are actioned
without negotiation: a group's own description is that group's to determine.

## Open question

Whether a regional name should be used at all for a site maintained by a single
non-chartered group is unresolved, and is being discussed with Centre County DSA and DSA
national rather than decided unilaterally. The naming is straightforward to change: it is
two configuration values and no code.

The constraint worth noting is that A2P messaging registration binds to a specific brand
name and URL, so any change is materially cheaper before that registration is filed than
after. No registration has been filed.
