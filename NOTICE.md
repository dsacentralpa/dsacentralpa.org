# Notices and attribution

Code in this repository is MIT licensed; see [`LICENSE`](LICENSE). Two elements are not
covered by that licence.

## DSA brand assets

Colours and the rose emblem derive from the
[DSA National Design Guide](https://design.dsausa.org/), which states:

> This guide is exclusively for use by DSA members and allies. Content included but not
> limited to the DSA logo and color palette information may only be used for official DSA
> business.

DSA chapters, branches, and organizing committees may reuse these elements. Others should
remove DSA-identifying colours and imagery before publishing a derivative. The MIT licence
covers the code, not permission to present as DSA.

### Palette

| Token | Hex |
|---|---|
| DSA Red | `#EC1F27` |
| DSA Red Tint 3 | `#F7A5A9` |
| DSA Red Tint 4 | `#FBD2D4` |
| DSA Black | `#231F20` |
| DSA Black Tint 2 | `#605C5C` |
| DSA Black Tint 4 | `#C1C0BF` |

### Typography

DSA's primary typeface is Manifold DSA, with Klima and Roboto Slab as alternates. None is
distributed here. The site uses the operating system's sans-serif stack.

This is a deployment constraint rather than a stylistic choice: a web font adds a network
request and 15–30 KB before text renders, and the service area has limited broadband
availability. DSA's guidance specifies a modern sans-serif, which the system stack
satisfies. Manifold DSA is available to DSA members through the Design Elements folder and
is appropriate for print.

## Haymarket

[ChicagoDSA/haymarket](https://github.com/ChicagoDSA/haymarket) is an MIT-licensed Jekyll
theme for DSA chapter websites. Layout and design tokens here derive from the same source it
uses — the DSA National Design Guide — and from its published stylesheet.

No Haymarket code is included. Haymarket is a static site built by GitHub Pages; this
project requires a server to accept form submissions, store consent records, and receive
webhooks.

**Groups needing only a website should use Haymarket.** It is mature, maintained, and
requires no infrastructure. This project is worth the additional overhead only where a
mailing list with stored consent records is required.
