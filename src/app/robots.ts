import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://suzanosports.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalogo", "/produto/", "/localizacao"],
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
