import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  getFinancialOverview,
  saveExpense,
  receiveAccountReceivable,
} from "@/services/finance-and-reports-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("startDate");
    const end = searchParams.get("endDate");

    const overview = await getFinancialOverview(user, {
      startDate: start ? new Date(start) : undefined,
      endDate: end ? new Date(`${end}T23:59:59.999Z`) : undefined,
    });

    return NextResponse.json(overview);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await saveExpense(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await receiveAccountReceivable(user, {
      receivableId: String(body.receivableId),
      amountReceived: Number(body.amountReceived),
      paymentMethod: body.paymentMethod,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
