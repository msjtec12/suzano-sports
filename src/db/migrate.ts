import { getDb, getDatabaseDiagnostics, closeAndResetDbConnection } from "./index";

async function main() {
  const diag = getDatabaseDiagnostics();
  console.log(`[Suzano Sports DB] Inicializando migração (${diag.description})...`);
  await getDb();
  console.log("[Suzano Sports DB] Schema e migrações aplicados com sucesso!");
  await closeAndResetDbConnection();
}

main().catch((err) => {
  console.error("[Suzano Sports DB] Erro ao aplicar migração:", err);
  process.exit(1);
});
