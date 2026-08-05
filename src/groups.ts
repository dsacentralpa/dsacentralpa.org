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
//   2. Don't invent groups. If we're not certain a chapter covers a county, mark it
//      `none` and let the fallback send people to DSA's official chapter map.
//      National's directory is authoritative; ours is a convenience.

export type GroupStatus = 'chapter' | 'organizing' | 'forming';

/** Per-county organizing state, shown in the finder before anyone picks. */
export type CountyState = 'active' | 'forming' | 'none';

export interface Group {
  id: string;
  name: string;
  status: GroupStatus;
  counties: string[];
  blurb: string;
  links: { label: string; href: string }[];
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
  forming:
    'A new group getting off the ground. Not yet chartered — which mostly means it is a good time to get involved and shape it.',
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
    links: [
      { label: 'Join our list', href: '/#join' },
      { label: 'Contact us', href: '/contact' },
    ],
    onOurList: true,
  },
];

/**
 * Every county we list in the finder, with its real organizing state.
 *
 * `none` is not a brush-off — it's the honest answer, and it's how Clearfield
 * looked a few months ago. The finder says so.
 */
export const COUNTIES: { name: string; state: CountyState; seat: string }[] = [
  { name: 'Centre', state: 'active', seat: 'Bellefonte / State College' },
  { name: 'Clearfield', state: 'forming', seat: 'Clearfield / DuBois' },
  { name: 'Blair', state: 'none', seat: 'Hollidaysburg / Altoona' },
  { name: 'Cambria', state: 'none', seat: 'Ebensburg / Johnstown' },
  { name: 'Clinton', state: 'none', seat: 'Lock Haven' },
  { name: 'Elk', state: 'none', seat: 'Ridgway / St. Marys' },
  { name: 'Huntingdon', state: 'none', seat: 'Huntingdon' },
  { name: 'Indiana', state: 'none', seat: 'Indiana' },
  { name: 'Jefferson', state: 'none', seat: 'Brookville / Punxsutawney' },
  { name: 'Mifflin', state: 'none', seat: 'Lewistown' },
];

export const COUNTY_STATE_LABEL: Record<CountyState, string> = {
  active: 'Active chapter',
  forming: 'Getting started',
  none: 'No group yet',
};

export const COUNTY_STATE_COLOR: Record<CountyState, string> = {
  active: '#1B7F4B',
  forming: '#EC1F27',
  none: '#67777E',
};

export function countyState(name: string): CountyState {
  return COUNTIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.state ?? 'none';
}

export const KNOWN_COUNTIES = COUNTIES.map((c) => c.name);

export const NATIONAL_CHAPTER_MAP = 'https://www.dsausa.org/chapter-map/';
export const NATIONAL_ZIP_LOOKUP = 'https://chapters.dsausa.org/';
export const NATIONAL_JOIN = 'https://dsausa.org/join';

export function groupsForCounty(county: string): Group[] {
  return GROUPS.filter((g) => g.counties.some((c) => c.toLowerCase() === county.toLowerCase()));
}
