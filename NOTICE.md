# Notices and attribution

The **code** in this repository is MIT licensed — see `LICENSE`. Other DSA groups are
welcome to fork it, and we'd rather you did than start from scratch.

Two things in here are **not** ours to relicense. Read this before reusing.

---

## DSA brand assets are not covered by our MIT license

The colors used in this site come from the [DSA National Design Guide](https://design.dsausa.org/),
maintained by the DSA National Design Committee. That guide states:

> This guide is exclusively for use by DSA members and allies. Content included but not
> limited to the DSA logo and color palette information may only be used for official DSA
> business.

So:

- **If you're a DSA chapter, branch, or organizing committee** — you're covered. Fork away.
- **If you're not DSA** — the code is yours under MIT, but strip the DSA red, the DSA
  black, the rose, and anything else identifiably DSA before you publish it. Ours is a
  copyright notice on the code, not permission to look like DSA.

### Colors used, from the National Identity palette

| Token | Hex | Source |
|---|---|---|
| DSA Red | `#EC1F27` | primary |
| DSA Red Tint 3 | `#F7A5A9` | error/accent surfaces |
| DSA Red Tint 4 | `#FBD2D4` | subtle backgrounds |
| DSA Black | `#231F20` | body text |
| DSA Black Tint 2 | `#605C5C` | secondary text |
| DSA Black Tint 4 | `#C1C0BF` | borders and rules |

### Fonts — deliberately not used here

DSA's primary typeface is **Manifold DSA**, and its alternates are **Klima** and
**Roboto Slab**. This site uses none of them, and uses the operating system's own sans-serif
stack instead. That's a deliberate tradeoff, not an oversight:

A web font is an extra network request and 15–30 KB before a single word renders. About 15%
of rural Pennsylvania households have no internet at all, only ~34% have cable, and 2.6%
have fiber. Page weight is a reach problem here, not a taste problem. The system stack
renders instantly on any connection and DSA's guidance — "generally, use a modern,
sans-serif font" — is satisfied.

Manifold DSA is available to DSA members from the Design Elements folder linked off the
design guide, and is the right choice for print, flyers, and graphics where weight doesn't
matter.

---

## Prior art: Chicago DSA's Haymarket theme

[ChicagoDSA/haymarket](https://github.com/ChicagoDSA/haymarket) is a Jekyll theme for
chapter websites, MIT licensed, and it's good. We looked at it closely and drew on the same
source it does — the DSA National Design Guide — for colors and typographic direction.

**We did not fork it, and no Haymarket code is in this repository.** The reason is
architectural rather than aesthetic: Haymarket is a static Jekyll site built by GitHub
Pages. This project is a Cloudflare Worker that renders pages dynamically and talks to a
database, because it has to accept form submissions, store double opt-in consent records,
and receive Twilio webhooks. A static site can't do any of that without bolting on a
separate backend and cross-origin plumbing.

**If your chapter only needs a website** — no mailing list, no signup form, no database —
Haymarket is very likely the better choice. It's mature, it's translated, it has a real
maintainer, and you won't have to run anything. Use it.

**If you need the list and the consent handling**, this may save you some time.

Thanks to Chicago DSA for publishing theirs. It's why we published ours.
