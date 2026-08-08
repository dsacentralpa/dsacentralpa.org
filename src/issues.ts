// Local issues and campaigns.
//
// Entries with `published: false` are visible only when DRAFT_MODE is enabled, which is
// off in production. Nothing here reaches the public site until it is both marked
// published and deployed.
//
// Accuracy constraints, which matter more here than anywhere else on the site:
//
//   1. Every factual claim needs a source. Use `sources` and prefer primary documents,
//      court filings, government records, and established local reporting.
//   2. Do not assert intent, motive, or wrongdoing that a source does not establish.
//      Describe what is documented and attribute it.
//   3. Where a claim is contested or a figure is an estimate, say so in the text.
//
// This site is read by people who disagree with us, and by institutions with lawyers.
// Understating a well-sourced fact costs nothing; overstating one costs the group its
// credibility on the issue.

export interface Source {
  label: string;
  href: string;
}

export interface Issue {
  slug: string;
  title: string;
  /** One line, used in listings. */
  summary: string;
  /** Short paragraphs. Plain text; rendered as separate <p> elements. */
  body: string[];
  /** What the group is asking people to do. Omit if there is no ask yet. */
  action?: { text: string; label?: string; href?: string };
  sources: Source[];
  /** false keeps the entry out of production regardless of deployment. */
  published: boolean;
  updated: string; // YYYY-MM-DD
}

export const ISSUES: Issue[] = [
  {
    slug: 'moshannon-valley',
    title: 'Moshannon Valley Processing Center',
    summary:
      'The largest ICE detention facility in the Northeast operates in Clearfield County under private contract.',
    body: [
      'The Moshannon Valley Processing Center in Decatur Township is operated by the GEO Group, a private prison company, under an agreement with U.S. Immigration and Customs Enforcement. It opened as an ICE facility in 2021 with a stated capacity of 1,878, making it the largest immigration detention facility in the Northeast.',
      'The facility has been the subject of congressional oversight. In 2026, members of Pennsylvania’s congressional delegation conducted oversight visits and wrote to ICE and the GEO Group raising questions about staffing levels, medical care, and cooperation with oversight.',
      'Clearfield County receives revenue from the detention contracts. Reporting by Spotlight PA has documented the arrangement and the amounts involved.',
      'We are still working out what a useful local response looks like. If you have direct knowledge of the facility, work there, have family detained there, or already organise around it, we would rather hear from you than write about you.',
    ],
    action: {
      text: 'If you have information, experience, or existing organising around the facility, get in touch.',
      label: 'Contact us',
      href: '/contact',
    },
    sources: [
      {
        label: 'ICE — facility record',
        href: 'https://www.ice.gov/detain/detention-facilities/moshannon-valley-processing-center',
      },
      {
        label: 'Spotlight PA — county revenue from detention contracts',
        href: 'https://www.spotlightpa.org/statecollege/2025/10/moshannon-valley-processing-center-clearfield-county-immigration-ice-local-government/',
      },
      {
        label: 'Rep. Deluzio — congressional oversight letters',
        href: 'https://deluzio.house.gov/media/press-releases/deluzio-dean-lee-demand-answers-ice-geo-group-about-violations-moshannon',
      },
    ],
    published: false,
    updated: '2026-08-05',
  },
  {
    slug: 'data-centers',
    title: 'Data centers and electricity bills',
    summary:
      'Rapid data center growth is driving electricity demand across Pennsylvania, and who pays for the grid upgrades is unsettled.',
    body: [
      'Data center construction across Pennsylvania has increased electricity demand sharply. Data centers accounted for an estimated 63% of the growth in electric capacity demand across the PJM Interconnection between 2025 and 2026, and the resulting costs run to billions across the region.',
      'The unresolved question is who pays. Grid connection and capacity costs can be recovered from all ratepayers, meaning household bills subsidise industrial users, or they can be assigned to the facilities that create the demand. Legislation before the General Assembly, including House Bill 1834, would direct the Public Utility Commission to keep those costs from shifting onto ratepayers.',
      'This is a rural issue as much as an urban one. Land and power are cheaper here, tax incentives are available, and the promised employment from a completed facility is modest relative to its power draw.',
      'We have not confirmed a specific proposal in Clearfield County. If you know of one, or of a zoning or planning hearing where this is being decided, tell us.',
    ],
    action: {
      text: 'Know of a proposal or a hearing in the county? Let us know.',
      label: 'Contact us',
      href: '/contact',
    },
    sources: [
      {
        label: 'Kleinman Center, Penn — data center regulation in Pennsylvania',
        href: 'https://kleinmanenergy.upenn.edu/commentary/blog/data-center-regulation-or-not-in-pennsylvania-part-1/',
      },
      {
        label: 'WHYY — legislative response on electricity and water use',
        href: 'https://whyy.org/articles/data-centers-pennsylvania-law/',
      },
      {
        label: 'Pennsylvania Capital-Star — public response to data center growth',
        href: 'https://penncapital-star.com/energy-environment/an-outpouring-of-frustration-over-pennsylvanias-rapid-data-center-growth/',
      },
    ],
    published: false,
    updated: '2026-08-05',
  },
];

/** Mutual aid entries. Same publication gating as issues. */
export interface MutualAidEntry {
  name: string;
  summary: string;
  /** 'ours' = run by this group. 'local' = independent, listed as a referral. */
  kind: 'ours' | 'local';
  href?: string;
  published: boolean;
}

export const MUTUAL_AID: MutualAidEntry[] = [];

/**
 * Fundraising is not configured. Before enabling it, see private documentation: a
 * donation link on an organisational site implies the organisation is soliciting and
 * accounting for those funds, which has governance implications for a group that is not
 * chartered and holds no account of its own.
 */
export const FUNDRAISING: {
  enabled: boolean;
  label?: string;
  href?: string;
  description?: string;
  disclosure?: string;
} = { enabled: false };

export function publishedIssues(draftMode: boolean): Issue[] {
  return ISSUES.filter((i) => i.published || draftMode);
}

export function publishedMutualAid(draftMode: boolean): MutualAidEntry[] {
  return MUTUAL_AID.filter((m) => m.published || draftMode);
}
