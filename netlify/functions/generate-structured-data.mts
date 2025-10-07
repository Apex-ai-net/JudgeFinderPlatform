import type { Context, Config } from "@netlify/functions";

/**
 * Generate JSON-LD structured data for Answer Engine Optimization (AEO)
 * This endpoint creates rich snippets for legal search engines and AI assistants
 */
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "website";
  const entityId = url.searchParams.get("id");

  const siteUrl = Netlify.env.get("NEXT_PUBLIC_SITE_URL") || "https://judgefinder.io";

  // Base organization schema for all pages
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JudgeFinder",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: "AI-powered judicial transparency and bias detection platform for California courts",
    sameAs: [
      // Add social media profiles when available
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@judgefinder.io",
    },
  };

  let structuredData: any = organizationSchema;

  switch (type) {
    case "website":
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "JudgeFinder",
        url: siteUrl,
        description: "Comprehensive judicial transparency platform with AI-powered bias analysis for California courts",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        publisher: organizationSchema,
      };
      break;

    case "judge":
      // Judge profile schema for rich snippets
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": entityId ? `${siteUrl}/judges/${entityId}` : undefined,
        jobTitle: "Judge",
        worksFor: {
          "@type": "GovernmentOrganization",
          name: "California Court System",
        },
        // Additional judge-specific data would be fetched from database
      };
      break;

    case "court":
      structuredData = {
        "@context": "https://schema.org",
        "@type": "GovernmentOrganization",
        "@id": entityId ? `${siteUrl}/courts/${entityId}` : undefined,
        name: "California Court",
        address: {
          "@type": "PostalAddress",
          addressRegion: "CA",
          addressCountry: "US",
        },
      };
      break;

    case "faq":
      structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does JudgeFinder detect judicial bias?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "JudgeFinder uses advanced AI to analyze 50+ case documents per judge, examining patterns in decision-making, settlement rates, case outcomes, and procedural consistency across six key factors.",
            },
          },
          {
            "@type": "Question",
            name: "Is JudgeFinder's data accurate?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "All data is sourced from official court records via CourtListener API and updated daily. AI analytics include confidence scores (60-95% accuracy) and are validated against public court decisions.",
            },
          },
          {
            "@type": "Question",
            name: "Can I compare multiple judges?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, the comparison tool allows side-by-side analysis of up to 3 judges, showing key metrics like decision times, reversal rates, and case type distributions.",
            },
          },
        ],
      };
      break;

    case "breadcrumb":
      structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          // Dynamic breadcrumbs would be added based on current page
        ],
      };
      break;
  }

  return new Response(JSON.stringify(structuredData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/ld+json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};

export const config: Config = {
  path: "/api/structured-data",
};
