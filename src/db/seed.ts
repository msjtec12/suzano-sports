import { getDb, closeAndResetDbConnection } from "./index";
import { seedEssentialData } from "./seed-data";

async function main() {
  console.log("[Suzano Sports DB] Executando seed essencial (perfis, categorias e configurações)...");
  const db = await getDb();
  await seedEssentialData(db);
  console.log("[Suzano Sports DB] Seed concluído com sucesso!");
  await closeAndResetDbConnection();
}

main().catch((err) => {
  console.error("[Suzano Sports DB] Erro no seed:", err);
  process.exit(1);
});
