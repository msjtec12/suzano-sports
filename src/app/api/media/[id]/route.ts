import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaRow = {
  content_type: string;
  content_base64: string;
  size_bytes: number;
  sha256: string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(id)) {
    return new Response("Imagem não encontrada.", { status: 404 });
  }

  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT content_type, encode(content, 'base64') AS content_base64, size_bytes, sha256
      FROM media_assets WHERE id = ${id} LIMIT 1
    `);
    const rows = (result as unknown as { rows: MediaRow[] }).rows;
    const media = rows?.[0];
    if (!media) return new Response("Imagem não encontrada.", { status: 404 });

    const etag = `"${media.sha256}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=31536000, immutable" } });
    }

    const bytes = Buffer.from(media.content_base64, "base64");
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": media.content_type,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "ETag": etag,
      },
    });
  } catch (error) {
    console.error("[Media Read Error]", error);
    return new Response("Não foi possível carregar a imagem.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
