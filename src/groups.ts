// Regional group directory for Central PA.
//
// Why this exists: dsacentralpa.org covers more ground than any one group. Someone
// in Bellefonte and someone in Philipsburg should both land here and get sent to the
// right place. This file is the routing table.
//
// TWO RULES for editing this:
//
//   1. `status` must be accurate. DSA distinguishes chartered Chapters from
//      Organizing Committees from pre-OC groups, and claiming chartered status we
//      don't have is the kind of thing that causes real friction with national.
//      When in doubt, use a weaker label.
//
//   2. Don't invent groups. If we're not certain a chapter covers a county, leave it
//      out and let the fallback send people to DSA's official chapter map. National's
//      directory is authoritative; ours is a convenience.

export type GroupStatus = 'chapter' | 'organizing' | 'forming';

export interface Group {
  id: string;
  name: string;
  status: GroupStatus;
  /** Counties this group actively organizes in. */
  counties: string[];
  blurb: string;
  /** Where to send someone. Omit what doesn't exist yet. */
  links: { label: string; href: string }[];
  /** True if this site's signup form feeds this group's list. */
  onOurList: boolean;
}

export const STATUS_LABEL: Record<GroupStatus, string> = {
  chapter: 'Chartered chapter',
  organizing: 'Organizing committee',
  forming: 'Getting started',
};

export const STATUS_NOTE: Record<GroupStatus, string> = {
  chapter: 'A full DSA chapter, chartered by the national organization.',
  organizing: 'An organizing committee working toward becoming a chapter.',
  forming: 'A new group getting off the ground. Not yet chartered — which mostly means it is a good time to get involved and shape it.',
};

export const GROUPS: Group[] = [
  {
    id: 'centre',
    name: 'Centre County DSA',
    status: 'chapter',
    counties: ['Centre'],
    blurb:
      'The established chapter for the State College area and Centre County. They meet regularly and run local campaigns.',
    links: [
      { label: 'Facebook', href: 'https://www.facebook.com/centrecodsa/' },
      { label: 'Patreon', href: 'https://www.patreon.com/centrecodsa' },
    ],
    onOurList: false,
  },
  {
    id: 'clearfield',
    name: 'Clearfield County DSA',
    status: 'forming',
    counties: ['Clearfield'],
    blurb:
      'A new group organizing in Clearfield County, working closely with Centre County DSA. We are early — if you join now you help decide what this becomes.',
    links: [{ label: 'Join our list', href: '/' }, { label: 'Contact us', href: '/contact' }],
    onOurList: true,
  },
];

/** Counties we can route confidently. Everything else goes to national's map. */
export const KNOWN_COUNTIES = Array.from(
  new Set(GROUPS.flatMap((g) => g.counties)),
).sort();

/** Neighbouring counties people commonly select. We don't claim to cover these. */
export const NEARBY_COUNTIES = [
  'Blair',
  'Cambria',
  'Clinton',
  'Elk',
  'Huntingdon',
  'Indiana',
  'Jefferson',
  'Mifflin',
];

export const NATIONAL_CHAPTER_MAP = 'https://www.dsausa.org/chapter-map/';
export const NATIONAL_ZIP_LOOKUP = 'https://chapters.dsausa.org/';
export const NATIONAL_JOIN = 'https://dsausa.org/join';

export function groupsForCounty(county: string): Group[] {
  return GROUPS.filter((g) => g.counties.some((c) => c.toLowerCase() === county.toLowerCase()));
}
