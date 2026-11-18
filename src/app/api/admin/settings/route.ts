import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  getStoreSettings,
  updateStoreSettings,
  listCampaigns,
  saveCampaign,
} from "@/services/settings-service";
import {
  listUsers,
  createOrUpdateUser,
  checkPermission,
  requirePermission,
} from "@/services/auth-service";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    await requirePermission(user, "settings", "view");
    const [settings, campaigns] = await Promise.all([
      getStoreSettings(),
      listCampaigns(false),
    ]);

    const canViewUsers = await checkPermission(user, "users", "view");
    const users = canViewUsers ? await listUsers(user) : [];

    return NextResponse.json({ settings, campaigns, users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const settings = await updateStoreSettings(user, body);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    if (body.entity === "CAMPAIGN") {
      const result = await saveCampaign(user, body);
      return NextResponse.json(result, { status: 201 });
    }

    if (body.entity === "USER") {
      const result = await createOrUpdateUser(user, body);
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
