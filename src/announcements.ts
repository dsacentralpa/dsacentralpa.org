// Announcements and newsletter entries.
//
// Add new entries at the top of the array. Nothing is sorted automatically: array order
// is display order. Dates are ISO strings (YYYY-MM-DD).
//
// This file is intended to be editable without a local development environment; see
// CONTRIBUTING.md.

export interface Announcement {
  date: string; // YYYY-MM-DD
  title: string;
  /** One or two sentences. Plain text — no HTML. */
  body: string;
  /** Optional link, e.g. an RSVP or a longer write-up. */
  link?: { label: string; href: string };
  /** Show a coloured strip at the very top of every page. Use sparingly — one at most. */
  pinned?: boolean;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-08-05',
    title: 'This website is new — tell us what to fix',
    body:
      'This site is new. It exists so people in Clearfield County and the surrounding area can find us without going through a social media account. If something is wrong or missing, let us know.',
    link: { label: 'Send us a note', href: '/contact' },
  },
];

/** Newsletter issues. Separate from announcements: these are archived, not expired. */
export interface NewsletterIssue {
  date: string;
  title: string;
  summary: string;
  href?: string;
}

export const NEWSLETTER: NewsletterIssue[] = [];

/** The one pinned announcement, if any. */
export function pinnedAnnouncement(): Announcement | undefined {
  return ANNOUNCEMENTS.find((a) => a.pinned);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
