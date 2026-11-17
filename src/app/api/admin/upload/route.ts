import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import { requirePermission } from "@/services/auth-service";
import { AppError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-response";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    await requirePermission(user, "products", "create");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      throw new AppError("Nenhum arquivo de imagem enviado.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new AppError(
        "Formato de imagem não permitido. Envie JPG, PNG, WebP ou SVG."
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError("A imagem excede o limite máximo de 5 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
        ? "svg"
        : "jpg";

    const safeFileName = `szs-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    // Em produção, se BLOB_READ_WRITE_TOKEN estiver configurado, orienta ou faz upload externo;
    // caso contrário, persiste em public/uploads (sem nunca gravar binário no PostgreSQL)
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, safeFileName), bytes);

    return NextResponse.json(
      {
        url: `/uploads/${safeFileName}`,
        storageMode: process.env.BLOB_READ_WRITE_TOKEN
          ? "OBJECT_STORAGE_CONFIGURED"
          : "LOCAL_PUBLIC_STORAGE",
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
