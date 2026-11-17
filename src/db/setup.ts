import { getDb, getDatabaseDiagnostics, closeAndResetDbConnection } from "./index";
import * as schema from "./schema";

async function main() {
  const diag = getDatabaseDiagnostics();
  console.log(`[Suzano Sports Setup] ${diag.description}`);
  const db = await getDb();
  const roles = await db.select().from(schema.roles);
  const categories = await db.select().from(schema.categories);
  const users = await db.select().from(schema.users);
  console.log(
    `[Suzano Sports Setup] Pronto! Perfis: ${roles.length} | Categorias: ${categories.length} | Usuários: ${users.length}`
  );
  await closeAndResetDbConnection();
}

main().catch((err) => {
  console.error("[Suzano Sports Setup] Erro:", err);
  process.exit(1);
});
