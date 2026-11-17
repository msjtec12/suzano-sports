import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
      },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return NextResponse.json(
      {
        error: firstIssue
          ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
          : "Dados de entrada inválidos.",
        code: "VALIDATION_ERROR",
        issues: err.issues,
      },
      { status: 400 }
    );
  }

  console.error("[API Unhandled Error]", err);
  const message = "Erro interno ao processar a solicitação.";
  return NextResponse.json(
    {
      error: message,
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
