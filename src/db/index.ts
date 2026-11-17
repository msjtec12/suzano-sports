import path from "path";
import fs from "fs";
import { AsyncLocalStorage } from "async_hooks";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import ws from "ws";
import * as schema from "./schema";
import { BOOTSTRAP_SQL } from "./bootstrap-sql";
import { seedEssentialData } from "./seed-data";

neonConfig.webSocketConstructor = ws;

export type AppDatabase = PgliteDatabase<typeof schema>;

const txContextStorage = new AsyncLocalStorage<AppDatabase>();

interface GlobalDbState {
  dbInstance?: AppDatabase;
  pgliteClient?: PGlite;
  neonPool?: Pool;
  initPromise?: Promise<AppDatabase>;
  txLockPromise: Promise<unknown>;
  driverMode?: "NEON_POSTGRESQL" | "PGLITE_LOCAL_POSTGRESQL";
}

const globalForDb = globalThis as unknown as {
  __suzanoSportsDb?: GlobalDbState;
};

if (!globalForDb.__suzanoSportsDb) {
  globalForDb.__suzanoSportsDb = {
    txLockPromise: Promise.resolve(),
  };
}

const state = globalForDb.__suzanoSportsDb;

export function isNeonConfigured(): boolean {
  const url = (process.env.DATABASE_URL || "").trim();
  return (
    (url.startsWith("postgresql://") || url.startsWith("postgres://")) &&
    !url.includes("usuario:senha@") &&
    !url.includes("user:pass@localhost")
  );
}

export function getDatabaseDiagnostics() {
  const neonConfigured = isNeonConfigured();
  return {
    driverMode: neonConfigured ? "NEON_POSTGRESQL" : "PGLITE_LOCAL_POSTGRESQL",
    neonConfigured,
    description: neonConfigured
      ? "Conectado ao Neon PostgreSQL via DATABASE_URL"
      : "PostgreSQL 16 Local Persistente (.data/pglite) — Configure DATABASE_URL para conectar ao Neon PostgreSQL em produção",
  };
}

async function createAndInitializeDb(): Promise<AppDatabase> {
  if (isNeonConfigured()) {
    const connectionString = process.env.DATABASE_URL!.trim();
    const pool = new Pool({ connectionString });
    state.neonPool = pool;
    state.driverMode = "NEON_POSTGRESQL";
    const db = drizzleNeon(pool, { schema }) as unknown as AppDatabase;

    const client = await pool.connect();
    try {
      await client.query(BOOTSTRAP_SQL);
    } finally {
      client.release();
    }

    await seedEssentialData(db);
    state.dbInstance = db;
    return db;
  }

  // Fallback para PostgreSQL 16 real embarcado persistente em disco (desenvolvimento local e testes)
  const customDir = process.env.PGLITE_DATA_DIR;
  const dataDir = customDir
    ? customDir
    : path.join(process.cwd(), ".data", "pglite-suzano-sports");

  if (dataDir !== "memory://") {
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  }

  const pgClient = new PGlite(dataDir);
  await pgClient.waitReady;
  await pgClient.exec(BOOTSTRAP_SQL);

  const db = drizzlePglite(pgClient, { schema });
  state.pgliteClient = pgClient;
  state.driverMode = "PGLITE_LOCAL_POSTGRESQL";

  await seedEssentialData(db);
  state.dbInstance = db;
  return db;
}

export async function getDb(): Promise<AppDatabase> {
  // Se estivermos dentro de uma transação ativa na mesma call stack assíncrona,
  // reutiliza a transação (tx) evitando deadlock de conexão única.
  const activeTx = txContextStorage.getStore();
  if (activeTx) {
    return activeTx;
  }

  if (state.dbInstance) {
    return state.dbInstance;
  }
  if (!state.initPromise) {
    state.initPromise = createAndInitializeDb().catch((err) => {
      state.initPromise = undefined;
      throw err;
    });
  }
  return state.initPromise;
}

/**
 * Executa uma transação ACID no PostgreSQL com serialização segura de conexão
 * e propagação automática de contexto via AsyncLocalStorage.
 */
export async function runInTransaction<T>(
  callback: (tx: AppDatabase) => Promise<T>
): Promise<T> {
  const existingTx = txContextStorage.getStore();
  if (existingTx) {
    return await callback(existingTx);
  }

  const db = await getDb();

  const runTask = async (): Promise<T> => {
    return await db.transaction(async (tx) => {
      const typedTx = tx as unknown as AppDatabase;
      return await txContextStorage.run(typedTx, async () => {
        return await callback(typedTx);
      });
    });
  };

  const nextPromise = state.txLockPromise.then(runTask, runTask);
  state.txLockPromise = nextPromise.catch(() => undefined);
  return nextPromise;
}

/**
 * Permite reiniciar a conexão (usado nos testes de persistência após reinicialização).
 */
export async function closeAndResetDbConnection(): Promise<void> {
  if (state.pgliteClient) {
    try {
      await state.pgliteClient.close();
    } catch {
      // ignore close errors
    }
  }
  if (state.neonPool) {
    try {
      await state.neonPool.end();
    } catch {
      // ignore pool end errors
    }
  }
  state.dbInstance = undefined;
  state.pgliteClient = undefined;
  state.neonPool = undefined;
  state.initPromise = undefined;
}
