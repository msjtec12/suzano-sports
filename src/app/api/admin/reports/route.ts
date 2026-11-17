import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  generateReport,
  type ReportType,
} from "@/services/finance-and-reports-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "DAILY_SALES") as ReportType;
    const format = searchParams.get("format") || "json";
    const start = searchParams.get("startDate");
    const end = searchParams.get("endDate");

    const report = await generateReport(user, type, {
      startDate: start ? new Date(start) : undefined,
      endDate: end ? new Date(`${end}T23:59:59.999Z`) : undefined,
    });

    if (format === "csv") {
      return new NextResponse(report.csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${type.toLowerCase()}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    return handleApiError(err);
  }
}
