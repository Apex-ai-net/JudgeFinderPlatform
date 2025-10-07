import type { Context, Config } from "@netlify/functions";

/**
 * Scheduled function to automatically submit sitemap to search engines
 * Runs weekly to ensure search engines have the latest content
 */
export default async (req: Request, context: Context) => {
  const { next_run } = await req.json();

  const siteUrl = Netlify.env.get("NEXT_PUBLIC_SITE_URL") || "https://judgefinder.io";
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  const results = {
    timestamp: new Date().toISOString(),
    next_run,
    submissions: [] as Array<{ engine: string; status: string; error?: string }>,
  };

  // Google Search Console submission
  try {
    const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const googleResponse = await fetch(googleUrl);
    results.submissions.push({
      engine: "Google",
      status: googleResponse.ok ? "success" : "failed",
      error: googleResponse.ok ? undefined : `HTTP ${googleResponse.status}`,
    });
  } catch (error) {
    results.submissions.push({
      engine: "Google",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Bing Webmaster Tools submission
  try {
    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const bingResponse = await fetch(bingUrl);
    results.submissions.push({
      engine: "Bing",
      status: bingResponse.ok ? "success" : "failed",
      error: bingResponse.ok ? undefined : `HTTP ${bingResponse.status}`,
    });
  } catch (error) {
    results.submissions.push({
      engine: "Bing",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  console.log("Sitemap submission results:", JSON.stringify(results, null, 2));

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const config: Config = {
  schedule: "@weekly", // Run every Sunday at midnight UTC
};
