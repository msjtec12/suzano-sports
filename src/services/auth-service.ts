import { SignJWT, jwtVerify } from "jose";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { hashPassword, verifyPassword, generateId } from "../lib/crypto";
import { AppError, ForbiddenError, UnauthorizedError } from "../lib/errors";

export type RoleCode = "ADMIN" | "MANAGER" | "OPERATOR";

export type ModuleName =
  | "dashboard"
  | "products"
  | "stock"
  | "orders"
  | "pos"
  | "finance"
  | "reports"
  | "settings"
  | "users";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approveDiscount";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleCode: RoleCode;
  roleName: string;
}

export const SESSION_COOKIE_NAME = "szs_admin_session";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET || "suzano-sports-dev-fallback-secret-key-min-32-chars";
  return new TextEncoder().encode(secret);
}

// Rate limiter em memória complementar ao bloqueio persistido no banco
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkIpRateLimit(ipAddress = "127.0.0.1", maxAttempts = 15, windowMs = 60_000) {
  const now = Date.now();
  const entry = ipAttempts.get(ipAddress);
  if (!entry || entry.resetAt < now) {
    ipAttempts.set(ipAddress, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > maxAttempts) {
    throw new AppError(
      "Muitas tentativas de acesso em curto período. Aguarde 1 minuto e tente novamente.",
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }
}

export function resetIpRateLimit(ipAddress = "127.0.0.1") {
  ipAttempts.delete(ipAddress);
}

export async function createAuditLog(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    const db = await getDb();
    await db.insert(schema.auditLogs).values({
      id: generateId("aud"),
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress || "127.0.0.1",
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }
}

export async function createSessionToken(user: AuthenticatedUser): Promise<string> {
  return await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleCode: user.roleCode,
    roleName: user.roleName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.roleCode) return null;

    const db = await getDb();
    const rows = await db
      .select({
        user: schema.users,
        role: schema.roles,
      })
      .from(schema.users)
      .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
      .where(eq(schema.users.id, String(payload.sub)));

    if (rows.length === 0 || !rows[0].user.active) {
      return null;
    }

    const { user, role } = rows[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: role.id,
      roleCode: role.code as RoleCode,
      roleName: role.name,
    };
  } catch {
    return null;
  }
}

export async function authenticateUser(params: {
  email: string;
  password: string;
  ipAddress?: string;
}): Promise<{ user: AuthenticatedUser; token: string }> {
  const ip = params.ipAddress || "127.0.0.1";
  checkIpRateLimit(ip);

  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail || !params.password) {
    throw new UnauthorizedError("Informe e-mail e senha para entrar.");
  }

  const db = await getDb();
  const rows = await db
    .select({
      user: schema.users,
      role: schema.roles,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.email, normalizedEmail));

  if (rows.length === 0) {
    await createAuditLog({
      action: "LOGIN_FAILED_UNKNOWN_EMAIL",
      entityType: "AUTH",
      metadata: { email: normalizedEmail },
      ipAddress: ip,
    });
    throw new UnauthorizedError("Credenciais inválidas.");
  }

  const { user, role } = rows[0];

  if (!user.active) {
    throw new ForbiddenError("Sua conta está desativada. Contate o administrador.");
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new AppError(
      "Conta temporariamente bloqueada por excesso de tentativas incorretas. Aguarde 15 minutos.",
      429,
      "ACCOUNT_LOCKED"
    );
  }

  const passwordValid = verifyPassword(params.password, user.passwordHash);
  if (!passwordValid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const shouldLock = attempts >= 5;
    const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: attempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    await createAuditLog({
      userId: user.id,
      action: shouldLock ? "LOGIN_FAILED_ACCOUNT_LOCKED" : "LOGIN_FAILED_BAD_PASSWORD",
      entityType: "AUTH",
      entityId: user.id,
      metadata: { attempts },
      ipAddress: ip,
    });

    throw new UnauthorizedError(
      shouldLock
        ? "Conta bloqueada por 15 minutos após 5 tentativas incorretas."
        : "Credenciais inválidas."
    );
  }

  // Sucesso: zera contador de falhas e atualiza lastLoginAt
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  const authUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: role.id,
    roleCode: role.code as RoleCode,
    roleName: role.name,
  };

  const token = await createSessionToken(authUser);

  await createAuditLog({
    userId: user.id,
    action: "LOGIN_SUCCESS",
    entityType: "AUTH",
    entityId: user.id,
    metadata: { role: role.code },
    ipAddress: ip,
  });

  return { user: authUser, token };
}

/**
 * Verifica se o usuário autenticado tem permissão no módulo e na ação solicitada.
 */
export async function checkPermission(
  user: AuthenticatedUser | null | undefined,
  module: ModuleName,
  action: PermissionAction = "view"
): Promise<boolean> {
  if (!user) return false;
  if (user.roleCode === "ADMIN") return true;

  const db = await getDb();
  const perms = await db
    .select()
    .from(schema.rolePermissions)
    .where(
      and(
        eq(schema.rolePermissions.roleId, user.roleId),
        eq(schema.rolePermissions.module, module)
      )
    );

  if (perms.length === 0) return false;
  const p = perms[0];

  switch (action) {
    case "view":
      return p.canView;
    case "create":
      return p.canCreate;
    case "edit":
      return p.canEdit;
    case "delete":
      return p.canDelete;
    case "approveDiscount":
      return p.canApproveDiscount;
    default:
      return false;
  }
}

export async function requirePermission(
  user: AuthenticatedUser | null | undefined,
  module: ModuleName,
  action: PermissionAction = "view"
): Promise<AuthenticatedUser> {
  if (!user) {
    throw new UnauthorizedError("Você precisa estar autenticado para realizar esta operação.");
  }
  const allowed = await checkPermission(user, module, action);
  if (!allowed) {
    throw new ForbiddenError(
      `Perfil '${user.roleName}' não possui permissão de '${action}' no módulo '${module}'.`
    );
  }
  return user;
}

/**
 * Gestão de usuários pelo Administrador
 */
export async function listUsers(actor: AuthenticatedUser) {
  await requirePermission(actor, "users", "view");
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      roleId: schema.users.roleId,
      roleCode: schema.roles.code,
      roleName: schema.roles.name,
      active: schema.users.active,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id));
  return rows;
}

export async function createOrUpdateUser(
  actor: AuthenticatedUser,
  input: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    roleCode: RoleCode;
    active?: boolean;
  }
) {
  await requirePermission(actor, "users", input.id ? "edit" : "create");
  const db = await getDb();

  const roleRow = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.code, input.roleCode));
  if (roleRow.length === 0) {
    throw new AppError("Perfil inválido.");
  }
  const roleId = roleRow[0].id;
  const email = input.email.trim().toLowerCase();

  if (input.id) {
    const updateData: Partial<typeof schema.users.$inferInsert> = {
      name: input.name.trim(),
      email,
      roleId,
      active: input.active ?? true,
      updatedAt: new Date(),
    };
    if (input.password && input.password.length >= 6) {
      updateData.passwordHash = hashPassword(input.password);
    }
    await db.update(schema.users).set(updateData).where(eq(schema.users.id, input.id));
    await createAuditLog({
      userId: actor.id,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: input.id,
      metadata: { email, roleCode: input.roleCode, active: input.active },
    });
    return { id: input.id };
  }

  if (!input.password || input.password.length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres.");
  }

  const newId = generateId("usr");
  await db.insert(schema.users).values({
    id: newId,
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(input.password),
    roleId,
    active: input.active ?? true,
  });

  await createAuditLog({
    userId: actor.id,
    action: "USER_CREATED",
    entityType: "USER",
    entityId: newId,
    metadata: { email, roleCode: input.roleCode },
  });

  return { id: newId };
}
