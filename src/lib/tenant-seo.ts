import { seedAccounts, type Account } from "./platform";
import { TENANT_PROFILES, tenantTowns, townSlug, type TenantProfile } from "./tenants";

/**
 * Head tags and structured data for the tenant booking surface.
 *
 * Indexing policy lives on TenantProfile.hasOwnDomain (see the long comment
 * there). While it is false the tenant's pages are noindex, nofollow and
 * area pages canonical across to the tenant's own website, because those
 * pages already rank and we must not compete with them from this domain.
 */

export interface TenantSeo {
  account: Account;
  profile: TenantProfile;
}

export function lookupTenant(orgSlug: string | undefined): TenantSeo | null {
  if (!orgSlug) return null;
  const profile = TENANT_PROFILES[orgSlug];
  const account = seedAccounts().find((row) => row.slug === orgSlug);
  if (!profile || !account) return null;
  return { account, profile };
}

export function robotsMeta(profile: TenantProfile) {
  return {
    name: "robots",
    content: profile.hasOwnDomain ? "index, follow" : "noindex, nofollow",
  };
}

/** Where an area page should point its canonical. */
export function areaCanonical(
  profile: TenantProfile,
  orgSlug: string,
  slug: string,
): string | null {
  if (profile.hasOwnDomain) return `/book/${orgSlug}/areas/${slug}`;
  // Not on their own domain yet: hand the authority to the tenant's real site.
  if (profile.websiteUrl) return `${profile.websiteUrl.replace(/\/$/, "")}/areas/${slug}`;
  return null;
}

function socialMeta(title: string, description: string) {
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "en_GB" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

function openingHours(profile: TenantProfile) {
  return profile.openingHours.map((slot) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes,
  }));
}

export function localBusinessJsonLd(
  { account, profile }: TenantSeo,
  options: { url: string; town?: string } = { url: "" },
) {
  const areaServed = options.town
    ? [{ "@type": "City", name: options.town }]
    : profile.towns.map((town) => ({ "@type": "City", name: town.name }));

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: account.businessName,
    description: profile.positioning,
    telephone: account.phone,
    email: account.email,
    url: options.url,
    areaServed,
    openingHoursSpecification: openingHours(profile),
  };

  if (profile.address) {
    node["address"] = {
      "@type": "PostalAddress",
      streetAddress: profile.address,
      addressRegion: profile.county,
      addressCountry: "GB",
    };
  }

  // Only ever emitted when the org record holds a real rating. Never invented.
  if (profile.rating && profile.rating.count > 0) {
    node["aggregateRating"] = {
      "@type": "AggregateRating",
      ratingValue: profile.rating.value,
      reviewCount: profile.rating.count,
    };
  }

  return node;
}

export function breadcrumbJsonLd(items: Array<{ name: string; item: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

/** head() for /book/:orgSlug */
export function bookingHomeHead(orgSlug: string) {
  const tenant = lookupTenant(orgSlug);
  if (!tenant) {
    return {
      meta: [{ title: "Page not found" }, { name: "robots", content: "noindex, nofollow" }],
    };
  }
  const { account, profile } = tenant;
  const title = `${account.businessName}, ${profile.primaryService} in ${profile.county}`;
  const description = profile.positioning;
  const url = `/book/${orgSlug}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      robotsMeta(profile),
      { property: "og:url", content: url },
      { property: "og:site_name", content: account.businessName },
      ...socialMeta(title, description),
    ],
    links: profile.hasOwnDomain ? [{ rel: "canonical", href: url }] : [],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(localBusinessJsonLd(tenant, { url })),
      },
    ],
  };
}

/** head() for /book/:orgSlug/areas/:townSlug */
export function areaHead(orgSlug: string, slug: string) {
  const tenant = lookupTenant(orgSlug);
  const town = tenant ? tenantTowns(tenant.profile).find((row) => row.slug === slug) : null;
  if (!tenant || !town) {
    return {
      meta: [{ title: "Page not found" }, { name: "robots", content: "noindex, nofollow" }],
    };
  }
  const { account, profile } = tenant;
  const title = `${profile.primaryService} in ${town.name} | ${account.businessName}`;
  const description = `${profile.positioning} Covering ${town.name}, ${town.prefix}.`;
  const url = `/book/${orgSlug}/areas/${slug}`;
  const canonical = areaCanonical(profile, orgSlug, slug);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      robotsMeta(profile),
      { property: "og:url", content: url },
      { property: "og:site_name", content: account.businessName },
      ...socialMeta(title, description),
    ],
    links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(localBusinessJsonLd(tenant, { url, town: town.name })),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: account.businessName, item: `/book/${orgSlug}` },
            { name: "Areas", item: `/book/${orgSlug}/areas` },
            { name: town.name, item: url },
          ]),
        ),
      },
    ],
  };
}

/** head() for /book/:orgSlug/areas */
export function areaIndexHead(orgSlug: string) {
  const tenant = lookupTenant(orgSlug);
  if (!tenant) {
    return {
      meta: [{ title: "Page not found" }, { name: "robots", content: "noindex, nofollow" }],
    };
  }
  const { account, profile } = tenant;
  const title = `Areas we cover | ${account.businessName}`;
  const description = `${account.businessName} covers ${profile.towns
    .map((town) => town.name)
    .join(", ")}.`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      robotsMeta(profile),
      { property: "og:url", content: `/book/${orgSlug}/areas` },
      { property: "og:site_name", content: account.businessName },
      ...socialMeta(title, description),
    ],
  };
}

export { townSlug };
