// County and group directory. Determines how visitors are routed to the DSA group
// covering their area.
//
// Editing constraints:
//
//   1. `status` must be accurate or understated. DSA distinguishes chartered chapters
//      from organizing committees from forming groups, and these designations are
//      granted nationally. Use the weaker label where there is doubt.
//
//   2. Do not list a group speculatively. Where coverage cannot be confirmed, mark the
//      county `none`; visitors are then directed to DSA national's chapter map, which
//      is the authoritative directory.

export type GroupStatus = 'chapter' | 'organizing' | 'forming';

/** Per-county organizing state. */
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
    'A new group not yet chartered. Open to new members and still deciding its direction.',
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
      'A new group organizing in Clearfield County, working alongside Centre County DSA. Early enough that new members shape what it becomes.',
    links: [
      { label: 'Join our list', href: '/#join' },
      { label: 'Contact us', href: '/contact' },
    ],
    onOurList: true,
  },
];

/** Counties covered by the finder, with current organizing state. */
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

/** Parenthetical shown inside each <option>, so status is visible before selection. */
export const COUNTY_STATE_SHORT: Record<CountyState, string> = {
  active: 'established chapter',
  forming: 'our group — just starting',
  none: 'no group yet',
};

export function countyOptionLabel(name: string): string {
  const c = COUNTIES.find((x) => x.name === name);
  if (!c) return name;
  return `${name} County (${COUNTY_STATE_SHORT[c.state]})`;
}

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
