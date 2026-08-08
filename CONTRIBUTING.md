# Contributing

Content changes require no local development environment. All edits below can be made
through the GitHub web interface with repository write access.

## Announcements

Edit [`src/announcements.ts`](src/announcements.ts) and add an entry to the top of the
`ANNOUNCEMENTS` array:

```ts
  {
    date: '2026-09-12',
    title: 'September meeting: Tuesday the 16th, Clearfield library',
    body:
      'Doors at 6:30, starts at 7. Agenda covers the utility rate increase. New attendees welcome.',
    link: { label: 'Directions', href: 'https://example.com/...' },
  },
```

| Field | Notes |
|---|---|
| `date` | `YYYY-MM-DD` |
| `title` | One line |
| `body` | One or two sentences, plain text — no HTML |
| `link` | Optional; omit the line entirely if unused |
| `pinned: true` | Optional; renders a site-wide banner. One at a time. |

Array order is display order; nothing is sorted automatically.

Strings are single-quoted, so an apostrophe must be escaped as `\'`. Automated checks catch
this before merge.

## County and group listings

Edit [`src/groups.ts`](src/groups.ts). The `COUNTIES` array sets each county's state
(`active`, `forming`, `none`); the `GROUPS` array holds group entries.

Two constraints apply, documented in the file header: status labels must be accurate or
understated, and groups must not be listed where coverage cannot be confirmed. See
[`docs/NAMING.md`](docs/NAMING.md).

## Page copy

Edit [`src/pages.ts`](src/pages.ts). Page functions are named for their route —
`homePage`, `groupsPage`, `contactPage`, and so on. Copy is HTML; change text freely and
leave tags intact.

**Two exceptions.** Consent wording adjacent to the signup checkboxes, and the published
privacy policy and SMS terms, are compliance-relevant. Changing the consent wording requires
incrementing `CONSENT_VERSION` in `wrangler.toml` so stored records identify which version
each subscriber agreed to. See [`docs/CONSENT.md`](docs/CONSENT.md).

## Process

Open a pull request rather than committing to `main`. Automated checks verify the project
compiles and that no credentials or member data are included. On merge, the site deploys
automatically.

Changes are reversible from the pull request.

## Permissions

Repository write access covers everything above. Member data export requires a separate
credential; DNS and hosting changes require administrator access. Contact the maintainers.
