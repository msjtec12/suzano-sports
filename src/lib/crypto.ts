import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Gera um hash seguro para senha utilizando scrypt com salt aleatório de 16 bytes.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica uma senha em tempo constante contra o hash scrypt armazenado.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
      return false;
    }
    const [, salt, keyHex] = parts;
    const keyBuffer = Buffer.from(keyHex, "hex");
    const derivedBuffer = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) {
      return false;
    }
    return timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Gera um identificador único prefixado e legível.
 */
export function generateId(prefix = "id"): string {
  const timestamp = Date.now().toString(36);
  const rand = randomBytes(5).toString("hex");
  return `${prefix}_${timestamp}_${rand}`;
}

/**
 * Gera um código sequencial/único comercial (ex: PED-20261117-A1B2 ou VND-20261117-C3D4)
 */
export function generateCommercialCode(prefix: "PED" | "VND" | "SKU"): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  if (prefix === "SKU") {
    return `SZS-${y.toString().slice(-2)}${m}-${ randomBytes(2).toString("hex").toUpperCase() }`;
  }
  return `${prefix}-${y}${m}${d}-${suffix}`;
}
