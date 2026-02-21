import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tripful.me";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/trips", "/verify", "/complete-profile"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
