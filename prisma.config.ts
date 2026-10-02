import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { databaseUrlComSchemaPrivado } from "./src/lib/db-url";

// O Next.js le .env.local sozinho em runtime; o CLI do Prisma so le .env por
// padrao, entao carregamos .env.local manualmente aqui tambem.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

// "prisma generate" (que roda no npm install) nao precisa do banco; so os
// comandos que conectam (db push, studio) precisam da URL -- e ai ela tem
// que passar pela trava do schema privado.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(process.env.DATABASE_URL ? { datasource: { url: databaseUrlComSchemaPrivado().completa } } : {}),
});
