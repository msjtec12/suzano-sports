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
        "Formato de imagem não permitido. Envie JPG, PNG ou WebP."
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError("A imagem excede o limite máximo de 5 MB.");
    }

    // Na Vercel o sistema de arquivos é efêmero; nunca informar sucesso para arquivo não persistido.
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new AppError("Upload indisponível até configurar armazenamento persistente (Vercel Blob/S3).", 503, "STORAGE_NOT_CONFIGURED");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const validSignature =
      (file.type === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
      (file.type === "image/png" && bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.type === "image/webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
    if (!validSignature) {
      throw new AppError("O conteúdo do arquivo não corresponde ao formato de imagem informado.");
    }
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
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
        storageMode: "LOCAL_DEVELOPMENT_ONLY",
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
