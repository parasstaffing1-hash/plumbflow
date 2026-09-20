import type { Account } from "./platform";

export interface TenantTown {
  name: string;
  prefix: string;
  /**
   * One paragraph of genuinely area specific text, written by the business.
   * Leave undefined rather than inventing filler: the area page omits the
   * paragraph entirely when it is empty. Thin invented text is worse than none.
   */
  areaIntro?: string;
}

export interface TenantHours {
  /** schema.org day names, e.g. ["Monday", "Tuesday"]. */
  days: string[];
  opens: string;
  closes: string;
}

/**
 * Public facing profile for a plumbing business, used by the homeowner
 * booking surface at /book/:orgSlug. Everything a page renders comes from
 * here or from the matching Account record, nothing is hardcoded to RCH.
 */
export interface TenantProfile {
  /** One line under the business name, plain words only. */
  trade: string;
  /** Short noun phrase used in titles, e.g. "Blocked drains and burst pipes". */
  primaryService: string;
  /** One sentence of positioning, reused as the meta description base. */
  positioning: string;
  county: string;
  hours: string;
  /** Machine readable hours for openingHoursSpecification. */
  openingHours: TenantHours[];
  serviceArea: string;
  towns: TenantTown[];
  problems: string[];
  gasSafe?: string;
  vatNumber?: string;
  companyNumber?: string;
  address?: string;
  /** Shown as a why us point only when true. */
  noFixNoFee?: boolean;
  photosWithEveryJob?: boolean;
  /**
   * The tenant's own website, when they have one. Used for the cross domain
   * canonical on area pages and for "read more" links, so we never copy their
   * service pages, guides or reviews onto this domain.
   */
  websiteUrl?: string;
  /**
   * ----------------------------------------------------------------------
   * THE INDEXING SWITCH. LEAVE THIS FALSE.
   * ----------------------------------------------------------------------
   * While a tenant sits on the shared rchplumbflow.co.uk domain, their
   * booking and area pages carry the same business name, towns and services
   * as the site they already rank with. Publishing them would create
   * duplicate pages competing with the tenant's own domain and could weaken
   * the pages their enquiries depend on today.
   *
   * So while this is false, every /book and /embed page is noindex, nofollow,
   * area pages canonical across to the tenant's own site, and none of them
   * appear in sitemap.xml.
   *
   * Only set this true once the tenant is actually serving these pages from
   * their OWN custom domain. Do not flip it to "get indexed sooner".
   */
  hasOwnDomain?: boolean;
  /** Real review data only. Omitted entirely when the business has none. */
  rating?: { value: number; count: number };
  /** Where the rating came from. Review text is never copied onto this site. */
  reviewsUrl?: string;
  /** Registered company name, when it differs from the trading name. */
  legalName?: string;
  /** Registered office address, shown in the tenant footer. */
  registeredOffice?: string;
  /** Short credential lines, e.g. "Fully insured". Rendered as the why us list. */
  credentials?: string[];
  /** The services this business actually sells, used by the report form. */
  services?: string[];
  /** Homeowner wording for the six tappable cards, mapped to a real service. */
  problemCards?: Array<{ label: string; service: string }>;
  /** Tenant written hero copy. Falls back to generic wording when absent. */
  hero?: { headline: string; sub: string; reassurance: string };
  /** Water authority explainer, only where the business actually offers it. */
  waterAuthorityNote?: string;
}

const DEFAULT_PROBLEMS = [
  "Burst pipe",
  "Blocked drain",
  "No hot water",
  "Leaking toilet",
  "Boiler not firing",
  "Blocked sink",
];

const ALL_WEEK: TenantHours[] = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
];

const WEEKDAYS: TenantHours[] = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
];

const WEEKDAYS_SAT: TenantHours[] = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "08:00",
    closes: "18:00",
  },
];

export const TENANT_PROFILES: Record<string, TenantProfile> = {
  "rch-drainage": {
    trade: "Blocked drains, CCTV surveys and 24 hour emergencies",
    primaryService: "Drain unblocking and CCTV surveys",
    positioning: "Blocked drains, CCTV surveys, jetting and 24 hour emergencies",
    county: "Northamptonshire",
    hours: "Open 24 hours, 7 days a week",
    openingHours: ALL_WEEK,
    serviceArea: "Northamptonshire and surrounding counties",
    websiteUrl: "https://www.rchdrainage.co.uk",
    hasOwnDomain: false,
    legalName: "RCH Drainage Limited",
    companyNumber: "17356072, registered in England and Wales",
    registeredOffice: "Grosvenor House, 3 Chapel Street, Congleton, Cheshire, CW12 4AB",
    rating: { value: 5.0, count: 3 },
    reviewsUrl: "https://www.google.com/search?q=RCH+Drainage+reviews",
    credentials: [
      "Fully insured",
      "Qualified engineers",
      "Fixed prices",
      "24 hour emergency cover",
    ],
    services: [
      "Blocked drains",
      "CCTV drain surveys",
      "Drain jetting",
      "Emergency call outs",
      "Drain repairs",
      "Gully cleaning",
    ],
    problemCards: [
      { label: "Blocked drain", service: "Blocked drains" },
      { label: "Drain smells", service: "CCTV drain surveys" },
      { label: "Toilet overflowing", service: "Emergency call outs" },
      { label: "Drain keeps blocking", service: "Drain jetting" },
      { label: "Flooding or sewage backing up", service: "Emergency call outs" },
      { label: "Outside drain blocked", service: "Gully cleaning" },
    ],
    hero: {
      headline: "Blocked drain? Fixed price drainage help today.",
      sub: "A fixed call out fee with no hidden costs. Your first hour on site covers diagnosis, rodding or jetting where suitable, and a CCTV check if needed.",
      reassurance:
        "Covering Northamptonshire and beyond. Open 24 hours, calls answered by a qualified engineer.",
    },
    waterAuthorityNote:
      "Before you pay privately, we check whether the water company may be responsible. Our engineers identify which side of the line your issue falls on and tell you before any private work goes ahead.",
    towns: [
      { name: "Northampton", prefix: "NN1 to NN7" },
      { name: "Kettering", prefix: "NN14 to NN16" },
      { name: "Corby", prefix: "NN17 and NN18" },
      { name: "Wellingborough", prefix: "NN8 and NN9" },
      { name: "Daventry", prefix: "NN11" },
      { name: "Rushden", prefix: "NN10" },
      { name: "Brackley", prefix: "NN13" },
      { name: "Towcester", prefix: "NN12" },
      { name: "Milton Keynes", prefix: "MK1 to MK19" },
      { name: "Rugby", prefix: "CV21 to CV23" },
      { name: "Bedford", prefix: "MK40 to MK45" },
      { name: "Market Harborough", prefix: "LE16" },
      { name: "Banbury", prefix: "OX15 to OX17" },
      { name: "Coventry", prefix: "CV1 to CV6" },
      { name: "Leicester", prefix: "LE1 to LE5" },
      { name: "Peterborough", prefix: "PE1 to PE7" },
      { name: "Leamington Spa", prefix: "CV31 and CV32" },
      { name: "Luton", prefix: "LU1 to LU4" },
      { name: "Oxford", prefix: "OX1 to OX4" },
    ],
    problems: [
      "Blocked drain",
      "Drain smells",
      "Toilet overflowing",
      "Drain keeps blocking",
      "Flooding or sewage backing up",
      "Outside drain blocked",
    ],
    photosWithEveryJob: true,
  },
  "towcester-heating": {
    trade: "Boilers, heating and hot water around Towcester",
    primaryService: "Boiler repairs and heating",
    positioning: "Boilers, heating and hot water put right, seven days a week.",
    county: "Northamptonshire",
    hours: "Open 7am to 8pm, seven days",
    openingHours: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:00",
        closes: "20:00",
      },
    ],
    serviceArea: "South Northamptonshire",
    towns: [
      { name: "Towcester", prefix: "NN12" },
      { name: "Silverstone", prefix: "NN12" },
      { name: "Brackley", prefix: "NN13" },
      { name: "Roade", prefix: "NN7" },
      { name: "Northampton", prefix: "NN4" },
    ],
    problems: [
      "Boiler not firing",
      "No hot water",
      "Cold radiators",
      "Leaking boiler",
      "Thermostat fault",
      "Annual service",
    ],
    gasSafe: "Gas Safe registered, number 604118",
    vatNumber: "GB 271 6640 12",
    photosWithEveryJob: true,
  },
  "daventry-plumb-gas": {
    trade: "Plumbing and gas work in and around Daventry",
    primaryService: "Plumbing and gas work",
    positioning: "Plumbing and gas work done properly, six days a week.",
    county: "Northamptonshire",
    hours: "Open 8am to 6pm, Monday to Saturday",
    openingHours: WEEKDAYS_SAT,
    serviceArea: "West Northamptonshire",
    towns: [
      { name: "Daventry", prefix: "NN11" },
      { name: "Long Buckby", prefix: "NN6" },
      { name: "Weedon", prefix: "NN7" },
      { name: "Northampton", prefix: "NN5" },
    ],
    problems: DEFAULT_PROBLEMS,
    gasSafe: "Gas Safe registered, number 588204",
    photosWithEveryJob: true,
  },
  "kettering-bathrooms": {
    trade: "Bathrooms, showers and everyday plumbing in Kettering",
    primaryService: "Bathrooms and everyday plumbing",
    positioning: "Bathrooms, showers and everyday plumbing across north Northamptonshire.",
    county: "Northamptonshire",
    hours: "Open 8am to 5pm, Monday to Friday",
    openingHours: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:00",
      },
    ],
    serviceArea: "North Northamptonshire",
    towns: [
      { name: "Kettering", prefix: "NN15 and NN16" },
      { name: "Burton Latimer", prefix: "NN15" },
      { name: "Desborough", prefix: "NN14" },
      { name: "Rothwell", prefix: "NN14" },
    ],
    problems: [
      "Leaking shower",
      "Blocked sink",
      "Leaking toilet",
      "Tap replacement",
      "New bathroom quote",
      "No hot water",
    ],
    vatNumber: "GB 442 1180 09",
  },
  "wellingborough-drains": {
    trade: "Drain clearing and pipework in Wellingborough",
    primaryService: "Drain clearing and pipework",
    positioning: "Drains cleared and pipework repaired, any hour, no fix no fee.",
    county: "Northamptonshire",
    hours: "Someone answers 24 hours",
    openingHours: ALL_WEEK,
    serviceArea: "Wellingborough and the Nene valley",
    towns: [
      { name: "Wellingborough", prefix: "NN8 and NN9" },
      { name: "Irthlingborough", prefix: "NN9" },
      { name: "Finedon", prefix: "NN9" },
      { name: "Rushden", prefix: "NN10" },
    ],
    problems: [
      "Blocked drain",
      "Blocked sink",
      "Drain smell",
      "Overflowing gully",
      "Burst pipe",
      "Camera survey",
    ],
    photosWithEveryJob: true,
    noFixNoFee: true,
  },
  "corby-emergency-plumbing": {
    trade: "Emergency plumbing in Corby, day and night",
    primaryService: "Emergency plumbing",
    positioning: "Emergency plumbing in Corby and north Northamptonshire, day and night.",
    county: "Northamptonshire",
    hours: "Someone answers 24 hours",
    openingHours: ALL_WEEK,
    serviceArea: "Corby and north Northamptonshire",
    towns: [
      { name: "Corby", prefix: "NN17 and NN18" },
      { name: "Kettering", prefix: "NN16" },
      { name: "Oundle", prefix: "NN14" },
      { name: "Weldon", prefix: "NN17" },
    ],
    problems: [
      "Burst pipe",
      "No water",
      "Blocked drain",
      "Leaking toilet",
      "No heating",
      "Boiler not firing",
    ],
    noFixNoFee: true,
  },
  "brackley-boiler-care": {
    trade: "Boiler repairs and servicing in Brackley",
    primaryService: "Boiler repairs and servicing",
    positioning: "Boiler repairs, servicing and heating faults across south Northamptonshire.",
    county: "Northamptonshire",
    hours: "Open 8am to 6pm, Monday to Saturday",
    openingHours: WEEKDAYS_SAT,
    serviceArea: "Brackley and the south of the county",
    towns: [
      { name: "Brackley", prefix: "NN13" },
      { name: "Silverstone", prefix: "NN12" },
      { name: "Towcester", prefix: "NN12" },
    ],
    problems: [
      "Boiler not firing",
      "No hot water",
      "Boiler leaking",
      "Pressure keeps dropping",
      "Annual service",
      "Cold radiators",
    ],
    gasSafe: "Gas Safe registered, number 617902",
  },
  "rushden-plumbing": {
    trade: "General plumbing in Rushden and Higham Ferrers",
    primaryService: "General plumbing",
    positioning: "Everyday plumbing repairs in Rushden, Higham Ferrers and the villages.",
    county: "Northamptonshire",
    hours: "Open 8am to 6pm, Monday to Friday",
    openingHours: WEEKDAYS,
    serviceArea: "Rushden and district",
    towns: [
      { name: "Rushden", prefix: "NN10" },
      { name: "Higham Ferrers", prefix: "NN10" },
      { name: "Irchester", prefix: "NN29" },
    ],
    problems: DEFAULT_PROBLEMS,
  },
  "oundle-pipework": {
    trade: "Pipework and leak repairs around Oundle",
    primaryService: "Pipework and leak repairs",
    positioning: "Leaks traced and pipework repaired around Oundle and the Nene villages.",
    county: "Northamptonshire",
    hours: "Open 8am to 5pm, Monday to Friday",
    openingHours: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:00",
      },
    ],
    serviceArea: "Oundle and the Nene villages",
    towns: [
      { name: "Oundle", prefix: "NN14" },
      { name: "Thrapston", prefix: "NN14" },
      { name: "Barnwell", prefix: "NN14" },
    ],
    problems: [
      "Burst pipe",
      "Leaking pipe",
      "Blocked sink",
      "Tap replacement",
      "Outside tap",
      "No hot water",
    ],
  },
  "higham-ferrers-heating": {
    trade: "Heating and hot water in Higham Ferrers",
    primaryService: "Heating and hot water",
    positioning: "Heating and hot water repairs in Higham Ferrers, Rushden and Raunds.",
    county: "Northamptonshire",
    hours: "Open 8am to 6pm, Monday to Friday",
    openingHours: WEEKDAYS,
    serviceArea: "Higham Ferrers and Rushden",
    towns: [
      { name: "Higham Ferrers", prefix: "NN10" },
      { name: "Rushden", prefix: "NN10" },
      { name: "Raunds", prefix: "NN9" },
    ],
    problems: [
      "No heating",
      "No hot water",
      "Cold radiators",
      "Boiler not firing",
      "Thermostat fault",
      "Annual service",
    ],
    gasSafe: "Gas Safe registered, number 630455",
  },
  "thrapston-water-works": {
    trade: "Plumbing and drainage in Thrapston",
    primaryService: "Plumbing and drainage",
    positioning: "Plumbing and drainage work in Thrapston and the A14 villages.",
    county: "Northamptonshire",
    hours: "Open 8am to 6pm, Monday to Saturday",
    openingHours: WEEKDAYS_SAT,
    serviceArea: "Thrapston and the A14 villages",
    towns: [
      { name: "Thrapston", prefix: "NN14" },
      { name: "Raunds", prefix: "NN9" },
      { name: "Islip", prefix: "NN14" },
    ],
    problems: DEFAULT_PROBLEMS,
  },
  "silverstone-plumbing": {
    trade: "Plumbing repairs around Silverstone",
    primaryService: "Plumbing repairs",
    positioning: "Plumbing repairs around Silverstone, Towcester and Brackley.",
    county: "Northamptonshire",
    hours: "Open 8am to 5pm, Monday to Friday",
    openingHours: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:00",
      },
    ],
    serviceArea: "Silverstone and Towcester",
    towns: [
      { name: "Silverstone", prefix: "NN12" },
      { name: "Towcester", prefix: "NN12" },
      { name: "Brackley", prefix: "NN13" },
    ],
    problems: DEFAULT_PROBLEMS,
  },
};

export interface Tenant {
  account: Account;
  profile: TenantProfile;
}

export function findTenant(accounts: Account[], slug: string | undefined): Tenant | null {
  if (!slug) return null;
  const account = accounts.find((row) => row.slug === slug);
  const profile = TENANT_PROFILES[slug];
  if (!account || !profile) return null;
  return { account, profile };
}

/** Builds an E.164 tel: link, so 01604 389 247 dials +441604389247. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("0")) return `tel:+44${digits.slice(1)}`;
  return `tel:${digits}`;
}

/** Lowercase, hyphenated town slug, so Market Harborough becomes market-harborough. */
export function townSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface TownWithSlug extends TenantTown {
  slug: string;
}

export function tenantTowns(profile: TenantProfile): TownWithSlug[] {
  return profile.towns.map((town) => ({ ...town, slug: townSlug(town.name) }));
}

export function findTown(profile: TenantProfile, slug: string | undefined): TownWithSlug | null {
  if (!slug) return null;
  return tenantTowns(profile).find((town) => town.slug === slug) ?? null;
}
