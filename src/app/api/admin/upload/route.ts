import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, isNeonConfigured } from "@/db";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import { checkPermission, createAuditLog } from "@/services/auth-service";
import { AppError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isValidImage(bytes: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mime === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const permitted = await Promise.all([
      checkPermission(user, "products", "create"),
      checkPermission(user, "products", "edit"),
      checkPermission(user, "settings", "edit"),
    ]);
    if (!permitted.some(Boolean)) {
      throw new ForbiddenError("Seu usuário não possui permissão para enviar imagens.");
    }

    // Em produção, os arquivos devem persistir exclusivamente no Neon.
    if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && !isNeonConfigured()) {
      throw new AppError("Armazenamento Neon indisponível.", 503, "STORAGE_NOT_CONFIGURED");
    }

    const length = Number(req.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BYTES + 64 * 1024) {
      throw new AppError("Imagem excede o limite de 5 MB.", 413, "FILE_TOO_LARGE");
    }
    const data = await req.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new AppError("Nenhuma imagem foi enviada.");
    if (!ALLOWED_TYPES.has(file.type)) throw new AppError("Envie apenas imagens JPG, PNG ou WebP.");
    if (file.size === 0 || file.size > MAX_BYTES) {
      throw new AppError("A imagem deve ter entre 1 byte e 5 MB.", 413, "INVALID_FILE_SIZE");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isValidImage(bytes, file.type)) throw new AppError("Assinatura do arquivo de imagem inválida.");

    const id = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const dataBase64 = bytes.toString("base64");
    const db = await getDb();

    // Parameterização SQL: decode() cria o campo BYTEA sem converter o arquivo em disco.
    await db.execute(sql`
      INSERT INTO media_assets (id, content_type, content, size_bytes, sha256, created_by_user_id)
      VALUES (${id}, ${file.type}, decode(${dataBase64}, 'base64'), ${bytes.length}, ${hash}, ${user.id})
    `);

    await createAuditLog({
      userId: user.id,
      action: "MEDIA_UPLOADED",
      entityType: "MEDIA",
      entityId: id,
      metadata: { contentType: file.type, sizeBytes: bytes.length },
    });

    return NextResponse.json({
      url: `/api/media/${id}`,
      storageMode: isNeonConfigured() ? "NEON_POSTGRESQL" : "LOCAL_PGLITE_DEVELOPMENT",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
